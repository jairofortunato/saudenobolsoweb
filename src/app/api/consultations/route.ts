import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';
import { type ConsultationInsert } from '../../../../types/database';

// GET /api/consultations - Fetch consultations for the authenticated user
export async function GET(_request: NextRequest) {
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

    // Get user profile to determine patient_id
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

    // For patients, get their own consultations
    // For doctors, they would need to specify patient_id (for future implementation)
    const patient_id = profile.role === 'patient' ? profile.id : profile.id;

    // Get consultations for the patient
    const { data: consultations, error: consultationsError } = await supabase
      .from('consultations')
      .select('*')
      .eq('patient_id', patient_id)
      .order('consultation_date', { ascending: false });

    if (consultationsError) {
      console.error('Error fetching consultations:', consultationsError);
      return NextResponse.json(
        { error: 'Failed to fetch consultations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      consultations: consultations || [],
      count: consultations?.length || 0
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/consultations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/consultations - Create a new consultation entry
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

    // Get user profile
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

    // Parse request body
    const body = await request.json();
    const { doctor_name, specialty, consultation_date, reason, diagnosis, treatment, follow_up_date, notes, patient_id } = body;

    // Validate required fields
    if (!doctor_name || doctor_name.trim() === '') {
      return NextResponse.json(
        { error: 'Doctor name is required' },
        { status: 400 }
      );
    }

    if (!consultation_date) {
      return NextResponse.json(
        { error: 'Consultation date is required' },
        { status: 400 }
      );
    }

    // Determine patient_id
    let targetPatientId: string;
    
    if (profile.role === 'patient') {
      // Patients can only create entries for themselves
      targetPatientId = profile.id;
    } else if (profile.role === 'doctor') {
      // Doctors can create entries for specified patients
      if (!patient_id) {
        return NextResponse.json(
          { error: 'Patient ID is required for doctor entries' },
          { status: 400 }
        );
      }
      targetPatientId = patient_id;
    } else {
      return NextResponse.json(
        { error: 'Invalid user role' },
        { status: 403 }
      );
    }

    // Prepare consultation data
    const consultationData: ConsultationInsert = {
      patient_id: targetPatientId,
      doctor_name: doctor_name.trim(),
      specialty: specialty?.trim() || null,
      consultation_date: consultation_date,
      reason: reason?.trim() || null,
      diagnosis: diagnosis?.trim() || null,
      treatment: treatment?.trim() || null,
      follow_up_date: follow_up_date || null,
      notes: notes?.trim() || null,
      created_by: profile.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert consultation into database
    const { data: newConsultation, error: insertError } = await supabase
      .from('consultations')
      .insert(consultationData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting consultation:', insertError);
      return NextResponse.json(
        { error: 'Failed to create consultation entry' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      consultation: newConsultation,
      message: 'Consultation entry created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in POST /api/consultations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 

// DELETE /api/consultations - Delete a consultation entry
export async function DELETE(request: NextRequest) {
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

    // Get user profile
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

    // Get consultation ID from URL
    const { searchParams } = new URL(request.url);
    const consultationId = searchParams.get('id');

    if (!consultationId) {
      return NextResponse.json(
        { error: 'Consultation ID is required' },
        { status: 400 }
      );
    }

    // First, verify the consultation exists and belongs to the user
    const { data: consultation, error: fetchError } = await supabase
      .from('consultations')
      .select('*')
      .eq('id', consultationId)
      .single();

    if (fetchError || !consultation) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to delete this consultation
    // Patients can only delete their own consultations
    // Doctors can delete consultations they created
    if (profile.role === 'patient' && consultation.patient_id !== profile.id) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    if (profile.role === 'doctor' && consultation.created_by !== profile.id) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Delete the consultation
    const { error: deleteError } = await supabase
      .from('consultations')
      .delete()
      .eq('id', consultationId);

    if (deleteError) {
      console.error('Error deleting consultation:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete consultation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Consultation deleted successfully',
      id: consultationId
    });

  } catch (error) {
    console.error('Unexpected error in DELETE /api/consultations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 

// PUT /api/consultations - Update a consultation entry
export async function PUT(request: NextRequest) {
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

    // Get user profile
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

    // Parse request body
    const body = await request.json();
    const { id, doctor_name, specialty, consultation_date, reason, diagnosis, treatment, follow_up_date, notes } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Consultation ID is required' },
        { status: 400 }
      );
    }

    if (!doctor_name || doctor_name.trim() === '') {
      return NextResponse.json(
        { error: 'Doctor name is required' },
        { status: 400 }
      );
    }

    if (!consultation_date) {
      return NextResponse.json(
        { error: 'Consultation date is required' },
        { status: 400 }
      );
    }

    // First, verify the consultation exists and belongs to the user
    const { data: existingConsultation, error: fetchError } = await supabase
      .from('consultations')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingConsultation) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to update this consultation
    // Patients can only update their own consultations
    // Doctors can update consultations they created
    if (profile.role === 'patient' && existingConsultation.patient_id !== profile.id) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    if (profile.role === 'doctor' && existingConsultation.created_by !== profile.id) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Prepare updated consultation data
    const updatedConsultationData = {
      doctor_name: doctor_name.trim(),
      specialty: specialty?.trim() || null,
      consultation_date: consultation_date,
      reason: reason?.trim() || null,
      diagnosis: diagnosis?.trim() || null,
      treatment: treatment?.trim() || null,
      follow_up_date: follow_up_date || null,
      notes: notes?.trim() || null,
      updated_at: new Date().toISOString()
    };

    // Update consultation in database
    const { data: updatedConsultation, error: updateError } = await supabase
      .from('consultations')
      .update(updatedConsultationData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating consultation:', updateError);
      return NextResponse.json(
        { error: 'Failed to update consultation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      consultation: updatedConsultation,
      message: 'Consultation updated successfully'
    });

  } catch (error) {
    console.error('Unexpected error in PUT /api/consultations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 