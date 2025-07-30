import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase-server';

// POST /api/doctor/patient-search - Search for a patient by PIN (doctors only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile to verify doctor role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (profile.role !== 'doctor') {
      return NextResponse.json(
        { error: 'Access denied. Only doctors can search for patients.' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { pin } = body;

    // Validate PIN
    if (!pin || pin.trim() === '' || pin.length !== 6) {
      return NextResponse.json(
        { error: 'Valid 6-digit PIN is required' },
        { status: 400 }
      );
    }

    // Search for patient by PIN
    const { data: patient, error: patientError } = await supabase
      .from('profiles')
      .select('*')
      .eq('pin', pin.trim())
      .eq('role', 'patient')
      .single();

    console.log('🔍 [Patient Search] Query result:', { 
      hasPatient: !!patient, 
      patientError: !!patientError, 
      patientFields: patient ? Object.keys(patient) : 'none',
      patientId: patient?.id,
      profileId: patient?.profile_id
    });

    if (patientError || !patient) {
      console.error('❌ [Patient Search] Patient not found:', patientError);
      return NextResponse.json(
        { error: 'Patient not found with provided PIN' },
        { status: 404 }
      );
    }

    // Fetch patient's medical data
    // Handle both old schema (id) and new schema (profile_id)
    const patientId = patient.id || patient.profile_id;
    console.log('🔍 [Patient Search] Patient ID for medical data queries:', patientId, 'Type:', typeof patientId);
    console.log('🔍 [Patient Search] Available fields:', Object.keys(patient));
    console.log('🔍 [Patient Search] patient.id:', patient.id, 'patient.profile_id:', patient.profile_id);
    
    // Validate that we have a proper UUID
    if (!patientId || typeof patientId !== 'string') {
      console.error('❌ [Patient Search] Invalid patient ID:', patientId, 'Full patient object:', JSON.stringify(patient, null, 2));
      return NextResponse.json(
        { 
          error: 'Invalid patient data found - missing ID field',
          debug: {
            availableFields: Object.keys(patient),
            patientId: patient.id,
            profileId: patient.profile_id
          }
        },
        { status: 500 }
      );
    }
    
    const [
      medicationsResult,
      allergiesResult,
      examsResult,
      diseasesResult,
      consultationsResult
    ] = await Promise.all([
      supabase
        .from('medications')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('allergies')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('exams')
        .select('*')
        .eq('patient_id', patientId)
        .order('exam_date', { ascending: false }),
      
      supabase
        .from('diseases')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('consultations')
        .select('*')
        .eq('patient_id', patientId)
        .order('consultation_date', { ascending: false })
    ]);

    // Check for errors in medical data fetching
    if (medicationsResult.error) {
      console.error('Error fetching medications:', medicationsResult.error);
    }
    if (allergiesResult.error) {
      console.error('Error fetching allergies:', allergiesResult.error);
    }
    if (examsResult.error) {
      console.error('Error fetching exams:', examsResult.error);
    }
    if (diseasesResult.error) {
      console.error('Error fetching diseases:', diseasesResult.error);
    }
    if (consultationsResult.error) {
      console.error('Error fetching consultations:', consultationsResult.error);
    }



    // Return patient profile and medical data
    console.log('📋 [Patient Search] Returning patient with ID:', patientId, 'for PIN:', pin.trim());
    console.log('📋 [Patient Search] Patient details:', {
      id: patientId,
      name: patient.full_name || patient.name,
      cpf: patient.cpf,
      user_id: patient.user_id,
      linked: patient.linked
    });
    
    return NextResponse.json({
      patient: {
        id: patientId, // Use the determined patient ID (works for both schemas)
        full_name: patient.full_name || patient.name, // Handle both field names
        email: patient.email,
        cpf: patient.cpf,
        pin: patient.pin,
        phone: patient.phone,
        birth_date: patient.birth_date,
        address: patient.address,
        emergency_contact_name: patient.emergency_contact_name,
        emergency_contact_phone: patient.emergency_contact_phone,
        created_at: patient.created_at,
        user_id: patient.user_id, // Include user_id for debugging
        linked: patient.linked // Include linked status if available
      },
      medicalData: {
        medications: medicationsResult.data || [],
        allergies: allergiesResult.data || [],
        exams: examsResult.data || [],
        diseases: diseasesResult.data || [],
        consultations: consultationsResult.data || []
      }
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/doctor/patient-search:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 