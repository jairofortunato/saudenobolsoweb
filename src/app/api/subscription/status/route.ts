import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
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

    // Get minute balance using database function
    const { data: balance, error: balanceError } = await supabase.rpc(
      'get_minute_balance',
      {
        p_user_id: user.id,
      }
    );

    if (balanceError) {
      console.error('Error fetching minute balance:', balanceError);
      return NextResponse.json(
        { error: 'Failed to fetch balance' },
        { status: 500 }
      );
    }

    // Get subscription details
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (subError) {
      console.error('Error fetching subscription:', subError);
    }

    // Get usage tracking for consultation count (free tier)
    const { data: usageTracking, error: usageError } = await supabase
      .from('usage_tracking')
      .select('consultations_count')
      .eq('user_id', user.id)
      .gte('period_end', new Date().toISOString())
      .lte('period_start', new Date().toISOString())
      .single();

    if (usageError && usageError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is fine for first-time users
      console.error('Error fetching usage tracking:', usageError);
    }

    // Calculate prontuarios_used and prontuarios_limit based on tier
    const tier = balance?.[0]?.tier || subscription?.tier || 'free';
    const prontuarios_used = tier === 'free' ? (usageTracking?.consultations_count || 0) : 0;
    const prontuarios_limit = tier === 'free' ? (subscription?.prontuarios_limit || 3) : -1; // -1 means unlimited

    return NextResponse.json({
      subscription: subscription || null,
      balance: {
        ...(balance?.[0] || {
          tier: 'free',
          minutes_balance: 0,
          total_available: 0,
          low_balance_alert: false,
        }),
        prontuarios_used,
        prontuarios_limit,
      },
    });
  } catch (error) {
    console.error('Error in subscription status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
