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
    const { estimatedMinutes } = await request.json();

    if (!estimatedMinutes || estimatedMinutes <= 0) {
      return NextResponse.json(
        { error: 'Invalid estimated minutes' },
        { status: 400 }
      );
    }

    // Check if user has enough minutes using database function
    const { data, error } = await supabase.rpc('has_enough_minutes', {
      p_user_id: user.id,
      p_required_minutes: estimatedMinutes,
    });

    if (error) {
      console.error('Error validating minutes:', error);
      return NextResponse.json(
        { error: 'Failed to validate balance' },
        { status: 500 }
      );
    }

    // Get current balance
    const { data: balance } = await supabase.rpc('get_minute_balance', {
      p_user_id: user.id,
    });

    return NextResponse.json({
      hasEnoughMinutes: data,
      balance: balance?.[0] || null,
      requiredMinutes: estimatedMinutes,
    });
  } catch (error) {
    console.error('Error in subscription validation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
