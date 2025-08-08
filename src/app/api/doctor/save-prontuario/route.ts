import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase-server';

interface SaveProntuarioRequest {
  patient_id: string;
  prontuario_text: string;
  consultation_id?: string | null;
  reviewed_by_doctor?: boolean; // optional override
}

// POST /api/doctor/save-prontuario - Save a generated prontuário to medical_records
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch current profile (doctor)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.role !== 'doctor') {
      return NextResponse.json(
        { error: 'Access denied. Only doctors can save prontuários.' },
        { status: 403 }
      );
    }

    // Parse request
    const body: SaveProntuarioRequest = await request.json();
    const { patient_id, prontuario_text, consultation_id, reviewed_by_doctor } = body;

    if (!patient_id || typeof patient_id !== 'string') {
      return NextResponse.json({ error: 'patient_id is required' }, { status: 400 });
    }
    if (!prontuario_text || !prontuario_text.trim()) {
      return NextResponse.json({ error: 'prontuario_text is required' }, { status: 400 });
    }

    // Insert into medical_records. We store the full text in `summary` for now.
    const insertPayload: Record<string, any> = {
      patient_id,
      created_by: profile.profile_id || profile.id,
      summary: prontuario_text,
      ai_generated: true,
      reviewed_by_doctor: reviewed_by_doctor ?? true,
    };

    if (consultation_id && typeof consultation_id === 'string') {
      insertPayload.consultation_id = consultation_id;
    }

    const { data: record, error: insertError } = await supabase
      .from('medical_records')
      .insert([insertPayload])
      .select()
      .single();

    if (insertError) {
      console.error('Error saving medical record:', insertError);
      return NextResponse.json(
        { error: 'Failed to save medical record', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, medical_record: record });
  } catch (error) {
    console.error('Unexpected error in POST /api/doctor/save-prontuario:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


