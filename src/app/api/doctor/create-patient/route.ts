import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase-server';

// POST /api/doctor/create-patient - Create a patient profile (doctors only)
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
        { error: 'Access denied. Only doctors can create patients.' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { cpf, name, pin } = body;

    // Validate required fields
    if (!cpf || cpf.trim() === '') {
      return NextResponse.json(
        { error: 'CPF is required' },
        { status: 400 }
      );
    }

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Patient name is required' },
        { status: 400 }
      );
    }

    // Clean PIN by removing spaces and non-numeric characters
    const cleanPin = pin.replace(/\D/g, '');
    
    if (!pin || pin.trim() === '' || cleanPin.length !== 6) {
      return NextResponse.json(
        { error: 'Valid 6-digit PIN is required' },
        { status: 400 }
      );
    }

    // Validate CPF format (basic validation)
    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    if (!cpfRegex.test(cpf.trim())) {
      return NextResponse.json(
        { error: 'CPF must be in format XXX.XXX.XXX-XX' },
        { status: 400 }
      );
    }

    // Check if CPF already exists
    const { data: existingProfile, error: existingError } = await supabase
      .from('profiles')
      .select('cpf')
      .eq('cpf', cpf.trim())
      .single();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'A patient with this CPF already exists' },
        { status: 409 }
      );
    }

    // Check if PIN already exists
    const { data: existingPin, error: existingPinError } = await supabase
      .from('profiles')
      .select('pin')
      .eq('pin', cleanPin)
      .single();

    if (existingPin) {
      return NextResponse.json(
        { error: 'This PIN is already in use. Please choose another one.' },
        { status: 409 }
      );
    }

    // Create patient profile
    // Now user_id can be NULL for doctor-created patients
    const { data: newPatient, error: createError } = await supabase
      .from('profiles')
      .insert([
        {
          cpf: cpf.trim(),
          full_name: name.trim(),
          pin: cleanPin,
          role: 'patient',
          user_id: null, // NULL for doctor-created patients
          email: null, // NULL for doctor-created patients
          created_by: profile.profile_id || profile.id // Track which doctor created this patient
        }
      ])
      .select()
      .single();

    if (createError) {
      console.error('Error creating patient:', createError);
      return NextResponse.json(
        { error: 'Failed to create patient profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Patient profile created successfully',
      patient: {
        id: newPatient.id,
        cpf: newPatient.cpf,
        full_name: newPatient.full_name,
        pin: newPatient.pin,
        created_at: newPatient.created_at,
        email: newPatient.email
      }
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/doctor/create-patient:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 