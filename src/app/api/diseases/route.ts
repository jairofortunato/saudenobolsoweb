import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';
import { type DiseaseInsert, type DiseaseStatus } from '../../../../types/database';

// GET /api/diseases - Fetch diseases for the authenticated user
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

    // For patients, get their own diseases
    // For doctors, they would need to specify patient_id (for future implementation)
    const patient_id = profile.role === 'patient' ? (profile.profile_id || profile.id) : (profile.profile_id || profile.id);

    // Get diseases for the patient
    const { data: diseases, error: diseasesError } = await supabase
      .from('diseases')
      .select('*')
      .eq('patient_id', patient_id)
      .order('created_at', { ascending: false });

    if (diseasesError) {
      console.error('Error fetching diseases:', diseasesError);
      return NextResponse.json(
        { error: 'Failed to fetch diseases' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      diseases: diseases || [],
      count: diseases?.length || 0
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/diseases:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/diseases - Create a new disease entry
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
    const { name, diagnosed_date, is_chronic, status, description, notes, patient_id } = body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Disease name is required' },
        { status: 400 }
      );
    }

    // Validate status if provided
    const validStatuses: DiseaseStatus[] = ['active', 'resolved', 'in_remission'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid disease status' },
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

    // Prepare disease data
    const diseaseData: DiseaseInsert = {
      patient_id: targetPatientId,
      name: name.trim(),
      diagnosed_date: diagnosed_date || null,
      is_chronic: is_chronic || false,
      status: status || 'active',
      description: description?.trim() || null,
      notes: notes?.trim() || null,
              created_by: profile.profile_id || profile.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert disease into database
    const { data: newDisease, error: insertError } = await supabase
      .from('diseases')
      .insert(diseaseData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting disease:', insertError);
      return NextResponse.json(
        { error: 'Failed to create disease entry' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      disease: newDisease,
      message: 'Disease entry created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in POST /api/diseases:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 

// DELETE /api/diseases - Delete a disease entry
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

    // Get disease ID from URL
    const { searchParams } = new URL(request.url);
    const diseaseId = searchParams.get('id');

    if (!diseaseId) {
      return NextResponse.json(
        { error: 'Disease ID is required' },
        { status: 400 }
      );
    }

    // First, verify the disease exists and belongs to the user
    const { data: disease, error: fetchError } = await supabase
      .from('diseases')
      .select('*')
      .eq('id', diseaseId)
      .single();

    if (fetchError || !disease) {
      return NextResponse.json(
        { error: 'Disease not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to delete this disease
    // Patients can only delete their own diseases
    // Doctors can delete diseases they created
          if (profile.role === 'patient' && disease.patient_id !== (profile.profile_id || profile.id)) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

          if (profile.role === 'doctor' && disease.created_by !== (profile.profile_id || profile.id)) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Delete the disease
    const { error: deleteError } = await supabase
      .from('diseases')
      .delete()
      .eq('id', diseaseId);

    if (deleteError) {
      console.error('Error deleting disease:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete disease' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Disease deleted successfully',
      id: diseaseId
    });

  } catch (error) {
    console.error('Unexpected error in DELETE /api/diseases:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 

// PUT /api/diseases - Update a disease entry
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
    const { id, name, diagnosed_date, is_chronic, status, description, notes } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Disease ID is required' },
        { status: 400 }
      );
    }

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Disease name is required' },
        { status: 400 }
      );
    }

    // Validate status if provided
    const validStatuses: DiseaseStatus[] = ['active', 'resolved', 'in_remission'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid disease status' },
        { status: 400 }
      );
    }

    // First, verify the disease exists and belongs to the user
    const { data: existingDisease, error: fetchError } = await supabase
      .from('diseases')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingDisease) {
      return NextResponse.json(
        { error: 'Disease not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to update this disease
    // Patients can only update their own diseases
    // Doctors can update diseases they created
          if (profile.role === 'patient' && existingDisease.patient_id !== (profile.profile_id || profile.id)) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

          if (profile.role === 'doctor' && existingDisease.created_by !== (profile.profile_id || profile.id)) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Prepare updated disease data
    const updatedDiseaseData = {
      name: name.trim(),
      diagnosed_date: diagnosed_date || null,
      is_chronic: is_chronic !== undefined ? is_chronic : existingDisease.is_chronic,
      status: status || existingDisease.status,
      description: description?.trim() || null,
      notes: notes?.trim() || null,
      updated_at: new Date().toISOString()
    };

    // Update disease in database
    const { data: updatedDisease, error: updateError } = await supabase
      .from('diseases')
      .update(updatedDiseaseData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating disease:', updateError);
      return NextResponse.json(
        { error: 'Failed to update disease' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      disease: updatedDisease,
      message: 'Disease updated successfully'
    });

  } catch (error) {
    console.error('Unexpected error in PUT /api/diseases:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 