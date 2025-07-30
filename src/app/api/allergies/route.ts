import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';
import { type AllergyInsert, type AllergySeverity } from '../../../../types/database';

// GET /api/allergies - Fetch allergies for the authenticated user
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

    // Handle both old and new schema - use profile_id if available, otherwise use id
    const patient_id = profile.profile_id || profile.id;

    // Get allergies for the patient
    const { data: allergies, error: allergiesError } = await supabase
      .from('allergies')
      .select('*')
      .eq('patient_id', patient_id)
      .order('created_at', { ascending: false });

    if (allergiesError) {
      console.error('Error fetching allergies:', allergiesError);
      return NextResponse.json(
        { error: 'Failed to fetch allergies' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      allergies: allergies || [],
      count: allergies?.length || 0
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/allergies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/allergies - Create a new allergy entry
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
    const { name, severity, reaction, notes, patient_id } = body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Allergy name is required' },
        { status: 400 }
      );
    }

    // Validate severity if provided
    const validSeverities: AllergySeverity[] = ['mild', 'moderate', 'severe', 'life-threatening'];
    if (severity && !validSeverities.includes(severity)) {
      return NextResponse.json(
        { error: 'Invalid allergy severity' },
        { status: 400 }
      );
    }

    // Determine patient_id
    let targetPatientId: string;
    
    if (profile.role === 'patient') {
      // Patients can only create entries for themselves
      targetPatientId = profile.profile_id || profile.id;
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

    // Prepare allergy data
    const allergyData: AllergyInsert = {
      patient_id: targetPatientId,
      name: name.trim(),
      severity: severity || null,
      reaction: reaction?.trim() || null,
      notes: notes?.trim() || null,
      created_by: profile.profile_id || profile.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert allergy into database
    const { data: newAllergy, error: insertError } = await supabase
      .from('allergies')
      .insert(allergyData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting allergy:', insertError);
      return NextResponse.json(
        { error: 'Failed to create allergy entry' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      allergy: newAllergy,
      message: 'Allergy entry created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in POST /api/allergies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/allergies - Delete an allergy entry
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

    // Get allergy ID from URL
    const { searchParams } = new URL(request.url);
    const allergyId = searchParams.get('id');

    if (!allergyId) {
      return NextResponse.json(
        { error: 'Allergy ID is required' },
        { status: 400 }
      );
    }

    // First, verify the allergy exists and belongs to the user
    const { data: allergy, error: fetchError } = await supabase
      .from('allergies')
      .select('*')
      .eq('id', allergyId)
      .single();

    if (fetchError || !allergy) {
      return NextResponse.json(
        { error: 'Allergy not found' },
        { status: 404 }
      );
    }

    // Get the current user's profile ID (handle both schemas)
    const currentUserProfileId = profile.profile_id || profile.id;

    // Check if user has permission to delete this allergy
    // Patients can only delete their own allergies
    // Doctors can delete allergies they created
    if (profile.role === 'patient' && allergy.patient_id !== currentUserProfileId) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    if (profile.role === 'doctor' && allergy.created_by !== currentUserProfileId) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Delete the allergy
    const { error: deleteError } = await supabase
      .from('allergies')
      .delete()
      .eq('id', allergyId);

    if (deleteError) {
      console.error('Error deleting allergy:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete allergy' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Allergy deleted successfully',
      id: allergyId
    });

  } catch (error) {
    console.error('Unexpected error in DELETE /api/allergies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/allergies - Update an allergy entry
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
    const { id, name, severity, reaction, notes } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Allergy ID is required' },
        { status: 400 }
      );
    }

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Allergy name is required' },
        { status: 400 }
      );
    }

    // Validate severity if provided
    const validSeverities: AllergySeverity[] = ['mild', 'moderate', 'severe', 'life-threatening'];
    if (severity && !validSeverities.includes(severity)) {
      return NextResponse.json(
        { error: 'Invalid allergy severity' },
        { status: 400 }
      );
    }

    // First, verify the allergy exists and belongs to the user
    const { data: existingAllergy, error: fetchError } = await supabase
      .from('allergies')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingAllergy) {
      return NextResponse.json(
        { error: 'Allergy not found' },
        { status: 404 }
      );
    }

    // Get the current user's profile ID (handle both schemas)
    const currentUserProfileId = profile.profile_id || profile.id;

    // Check if user has permission to update this allergy
    // Patients can only update their own allergies
    // Doctors can update allergies they created
    if (profile.role === 'patient' && existingAllergy.patient_id !== currentUserProfileId) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    if (profile.role === 'doctor' && existingAllergy.created_by !== currentUserProfileId) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Prepare updated allergy data
    const updatedAllergyData = {
      name: name.trim(),
      severity: severity || null,
      reaction: reaction?.trim() || null,
      notes: notes?.trim() || null,
      updated_at: new Date().toISOString()
    };

    // Update allergy in database
    const { data: updatedAllergy, error: updateError } = await supabase
      .from('allergies')
      .update(updatedAllergyData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating allergy:', updateError);
      return NextResponse.json(
        { error: 'Failed to update allergy' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      allergy: updatedAllergy,
      message: 'Allergy updated successfully'
    });

  } catch (error) {
    console.error('Unexpected error in PUT /api/allergies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 