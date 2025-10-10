import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const { audioDurationSeconds, consultationId, appointmentId } =
      await request.json();

    if (!audioDurationSeconds || audioDurationSeconds <= 0) {
      return NextResponse.json(
        { error: 'Invalid audio duration' },
        { status: 400 }
      );
    }

    // Call database function to deduct minutes
    const { data, error } = await supabase.rpc('deduct_minutes', {
      p_user_id: user.id,
      p_audio_duration_seconds: audioDurationSeconds,
      p_consultation_id: consultationId || null,
      p_appointment_id: appointmentId || null,
    });

    if (error) {
      console.error('Error deducting minutes:', error);
      return NextResponse.json(
        { error: 'Failed to deduct minutes' },
        { status: 500 }
      );
    }

    // Parse the result
    const result = typeof data === 'string' ? JSON.parse(data) : data;

    return NextResponse.json({
      success: true,
      deduction: result,
    });
  } catch (error) {
    console.error('Error in minute deduction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
