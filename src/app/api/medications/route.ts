import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';
import { type MedicationInsert } from '../../../../types/database';

// GET /api/medications - Fetch medications for the authenticated user
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

    // For patients, get their own medications
    // For doctors, they would need to specify patient_id (for future implementation)
    const patient_id = profile.role === 'patient' ? (profile.profile_id || profile.id) : (profile.profile_id || profile.id);

    // Get medications for the patient
    const { data: medications, error: medicationsError } = await supabase
      .from('medications')
      .select('*')
      .eq('patient_id', patient_id)
      .order('created_at', { ascending: false });

    if (medicationsError) {
      console.error('Error fetching medications:', medicationsError);
      return NextResponse.json(
        { error: 'Failed to fetch medications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      medications: medications || [],
      count: medications?.length || 0
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/medications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/medications - Create a new medication entry
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
    const { name, dosage, frequency, start_date, end_date, is_active, notes, patient_id } = body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Medication name is required' },
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

    // Prepare medication data
    const medicationData: MedicationInsert = {
      patient_id: targetPatientId,
      name: name.trim(),
      dosage: dosage?.trim() || null,
      frequency: frequency?.trim() || null,
      start_date: start_date || null,
      end_date: end_date || null,
      is_active: is_active !== undefined ? is_active : true,
      notes: notes?.trim() || null,
              created_by: profile.profile_id || profile.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert medication into database
    const { data: newMedication, error: insertError } = await supabase
      .from('medications')
      .insert(medicationData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting medication:', insertError);
      return NextResponse.json(
        { error: 'Failed to create medication entry' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      medication: newMedication,
      message: 'Medication entry created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in POST /api/medications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 

// DELETE /api/medications - Delete a medication entry
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

    // Get medication ID from URL
    const { searchParams } = new URL(request.url);
    const medicationId = searchParams.get('id');

    if (!medicationId) {
      return NextResponse.json(
        { error: 'Medication ID is required' },
        { status: 400 }
      );
    }

    // First, verify the medication exists and belongs to the user
    const { data: medication, error: fetchError } = await supabase
      .from('medications')
      .select('*')
      .eq('id', medicationId)
      .single();

    if (fetchError || !medication) {
      return NextResponse.json(
        { error: 'Medication not found' },
        { status: 404 }
      );
    }

    // Get the current user's profile ID (handle both schemas)
    const currentUserProfileId = profile.profile_id || profile.id;

    // Check if user has permission to delete this medication
    // Patients can only delete their own medications
    // Doctors can delete medications they created
    if (profile.role === 'patient' && medication.patient_id !== currentUserProfileId) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    if (profile.role === 'doctor' && medication.created_by !== currentUserProfileId) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Delete the medication
    const { error: deleteError } = await supabase
      .from('medications')
      .delete()
      .eq('id', medicationId);

    if (deleteError) {
      console.error('Error deleting medication:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete medication' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Medication deleted successfully',
      id: medicationId
    });

  } catch (error) {
    console.error('Unexpected error in DELETE /api/medications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 

// PUT /api/medications - Update a medication entry
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
    const { id, name, dosage, frequency, start_date, end_date, is_active, notes } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Medication ID is required' },
        { status: 400 }
      );
    }

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Medication name is required' },
        { status: 400 }
      );
    }

    // First, verify the medication exists and belongs to the user
    const { data: existingMedication, error: fetchError } = await supabase
      .from('medications')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingMedication) {
      return NextResponse.json(
        { error: 'Medication not found' },
        { status: 404 }
      );
    }

    // Get the current user's profile ID (handle both schemas)
    const currentUserProfileId = profile.profile_id || profile.id;

    // Check if user has permission to update this medication
    // Patients can only update their own medications
    // Doctors can update medications they created
    if (profile.role === 'patient' && existingMedication.patient_id !== currentUserProfileId) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    if (profile.role === 'doctor' && existingMedication.created_by !== currentUserProfileId) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Prepare updated medication data
    const updatedMedicationData = {
      name: name.trim(),
      dosage: dosage?.trim() || null,
      frequency: frequency?.trim() || null,
      start_date: start_date || null,
      end_date: end_date || null,
      is_active: is_active !== undefined ? is_active : true,
      notes: notes?.trim() || null,
      updated_at: new Date().toISOString()
    };

    // Update medication in database
    const { data: updatedMedication, error: updateError } = await supabase
      .from('medications')
      .update(updatedMedicationData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating medication:', updateError);
      return NextResponse.json(
        { error: 'Failed to update medication' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      medication: updatedMedication,
      message: 'Medication updated successfully'
    });

  } catch (error) {
    console.error('Unexpected error in PUT /api/medications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 