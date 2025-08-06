import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase-server';

// POST /api/doctor/patient-search-by-name - Search for patients by name (doctors only)
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
    const { name } = body;

    // Validate name
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Patient name is required' },
        { status: 400 }
      );
    }

    const searchName = name.trim();

    console.log(`🔍 [Patient Search by Name] Searching for: "${searchName}" by doctor: ${profile.profile_id}`);

    // First, let's check how many patients exist in the system
    const { data: allPatients, error: countError } = await supabase
      .from('profiles')
      .select('profile_id, full_name, cpf')
      .eq('role', 'patient');

    console.log(`📊 [Patient Search by Name] System has ${allPatients?.length || 0} total patients`);
    if (allPatients?.length) {
      console.log(`📋 [Patient Search by Name] Sample patients:`, allPatients.slice(0, 5).map(p => ({ name: p.full_name, cpf: p.cpf })));
    }

    // Search for patients by name (case-insensitive, starts with)
    // Search ALL patients in the system, not just those created by this doctor
    const { data: patients, error: searchError } = await supabase
      .from('profiles')
      .select('profile_id, full_name, cpf, pin, created_at')
      .eq('role', 'patient')
      .ilike('full_name', `%${searchName}%`) // Starts with search pattern
      .order('full_name', { ascending: true })
      .limit(10); // Limit to 10 results for performance

    if (searchError) {
      console.error('❌ [Patient Search by Name] Search error:', searchError);
      return NextResponse.json(
        { error: 'Error searching patients' },
        { status: 500 }
      );
    }

    console.log(`✅ [Patient Search by Name] Found ${patients?.length || 0} matches for "${searchName}"`);
    if (patients?.length) {
      console.log(`📋 [Patient Search by Name] Matches:`, patients.map(p => ({ name: p.full_name, cpf: p.cpf })));
    }

    // Format the results
    const formattedPatients = (patients || []).map(patient => ({
      id: patient.profile_id,
      name: patient.full_name,
      cpf: patient.cpf,
      pin: patient.pin,
      created_at: patient.created_at
    }));

    console.log(`🔍 [Patient Search by Name] Found ${formattedPatients.length} patients for query: "${searchName}"`);

    return NextResponse.json({
      patients: formattedPatients,
      query: searchName,
      count: formattedPatients.length
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/doctor/patient-search-by-name:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}