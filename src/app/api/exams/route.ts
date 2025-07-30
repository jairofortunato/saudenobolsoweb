import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';
import { type ExamInsert } from '../../../../types/database';

// GET /api/exams - Fetch exams for the authenticated user
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

    // For patients, get their own exams
    // For doctors, they would need to specify patient_id (for future implementation)
    const patient_id = profile.role === 'patient' ? (profile.profile_id || profile.id) : (profile.profile_id || profile.id);

    // Get exams for the patient
    const { data: exams, error: examsError } = await supabase
      .from('exams')
      .select('*')
      .eq('patient_id', patient_id)
      .order('exam_date', { ascending: false });

    if (examsError) {
      console.error('Error fetching exams:', examsError);
      return NextResponse.json(
        { error: 'Failed to fetch exams' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exams: exams || [],
      count: exams?.length || 0
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/exams:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/exams - Create a new exam entry
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
    const { name, exam_date, result, file_url, doctor_name, notes, patient_id } = body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Exam name is required' },
        { status: 400 }
      );
    }

    if (!exam_date) {
      return NextResponse.json(
        { error: 'Exam date is required' },
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

    // Prepare exam data
    const examData: ExamInsert = {
      patient_id: targetPatientId,
      name: name.trim(),
      exam_date: exam_date,
      result: result?.trim() || null,
      file_url: file_url?.trim() || null,
      doctor_name: doctor_name?.trim() || null,
      notes: notes?.trim() || null,
              created_by: profile.profile_id || profile.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert exam into database
    const { data: newExam, error: insertError } = await supabase
      .from('exams')
      .insert(examData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting exam:', insertError);
      return NextResponse.json(
        { error: 'Failed to create exam entry' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exam: newExam,
      message: 'Exam entry created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in POST /api/exams:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 

// DELETE /api/exams - Delete an exam entry
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

    // Get exam ID from URL
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('id');

    if (!examId) {
      return NextResponse.json(
        { error: 'Exam ID is required' },
        { status: 400 }
      );
    }

    // First, verify the exam exists and belongs to the user
    const { data: exam, error: fetchError } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single();

    if (fetchError || !exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to delete this exam
    // Patients can only delete their own exams
    // Doctors can delete exams they created
          if (profile.role === 'patient' && exam.patient_id !== (profile.profile_id || profile.id)) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

          if (profile.role === 'doctor' && exam.created_by !== (profile.profile_id || profile.id)) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Delete the exam
    const { error: deleteError } = await supabase
      .from('exams')
      .delete()
      .eq('id', examId);

    if (deleteError) {
      console.error('Error deleting exam:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete exam' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Exam deleted successfully',
      id: examId
    });

  } catch (error) {
    console.error('Unexpected error in DELETE /api/exams:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 

// PUT /api/exams - Update an exam entry
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
    const { id, name, exam_date, result, file_url, doctor_name, notes } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Exam ID is required' },
        { status: 400 }
      );
    }

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Exam name is required' },
        { status: 400 }
      );
    }

    if (!exam_date) {
      return NextResponse.json(
        { error: 'Exam date is required' },
        { status: 400 }
      );
    }

    // First, verify the exam exists and belongs to the user
    const { data: existingExam, error: fetchError } = await supabase
      .from('exams')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingExam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to update this exam
    // Patients can only update their own exams
    // Doctors can update exams they created
          if (profile.role === 'patient' && existingExam.patient_id !== (profile.profile_id || profile.id)) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

          if (profile.role === 'doctor' && existingExam.created_by !== (profile.profile_id || profile.id)) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Prepare updated exam data
    const updatedExamData = {
      name: name.trim(),
      exam_date: exam_date,
      result: result?.trim() || null,
      file_url: file_url?.trim() || null,
      doctor_name: doctor_name?.trim() || null,
      notes: notes?.trim() || null,
      updated_at: new Date().toISOString()
    };

    // Update exam in database
    const { data: updatedExam, error: updateError } = await supabase
      .from('exams')
      .update(updatedExamData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating exam:', updateError);
      return NextResponse.json(
        { error: 'Failed to update exam' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exam: updatedExam,
      message: 'Exam updated successfully'
    });

  } catch (error) {
    console.error('Unexpected error in PUT /api/exams:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 