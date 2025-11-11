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

    // Get user profile for free consultation tracking
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('free_consultations_used, free_consultations_limit')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile', details: profileError.message },
        { status: 500 }
      );
    }

    // Check if user has a paid subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // If no paid subscription exists, return free tier info from profile
    if (!subscription || subError?.code === 'PGRST116') {
      return NextResponse.json({
        subscription: null,
        balance: {
          tier: 'free',
          minutes_balance: 0,
          total_available: 0,
          low_balance_alert: false,
          minutes_included: 0,
          minutes_purchased: 0,
          prontuarios_used: profile?.free_consultations_used || 0,
          prontuarios_limit: profile?.free_consultations_limit || 5,
        },
      });
    }

    // Handle other subscription errors
    if (subError) {
      console.error('Error fetching subscription:', subError);
      return NextResponse.json(
        { error: 'Failed to fetch subscription', details: subError.message },
        { status: 500 }
      );
    }

    // For FREE tier with subscription record (legacy)
    // This shouldn't happen with new users, but handle it for backward compatibility
    if (subscription.tier === 'free') {
      return NextResponse.json({
        subscription,
        balance: {
          tier: 'free',
          minutes_balance: 0,
          total_available: 0,
          low_balance_alert: false,
          minutes_included: 0,
          minutes_purchased: 0,
          prontuarios_used: profile?.free_consultations_used || 0,
          prontuarios_limit: profile?.free_consultations_limit || 5,
        },
      });
    }

    // For PROFESSIONAL tier - use RPC function for minute balance
    const { data: balance, error: balanceError } = await supabase.rpc(
      'get_minute_balance',
      {
        p_user_id: user.id,
      }
    );

    if (balanceError) {
      console.error('Error fetching minute balance:', balanceError);
      // Return fallback data instead of failing
      return NextResponse.json({
        subscription,
        balance: {
          tier: subscription.tier,
          minutes_balance: subscription.minutes_balance || 0,
          total_available: subscription.minutes_balance || 0,
          low_balance_alert: false,
          minutes_included: subscription.minutes_included || 0,
          minutes_purchased: 0,
          prontuarios_used: 0,
          prontuarios_limit: -1,
        },
      });
    }

    return NextResponse.json({
      subscription,
      balance: {
        ...(balance?.[0] || {
          tier: subscription.tier,
          minutes_balance: 0,
          total_available: 0,
          low_balance_alert: false,
        }),
        prontuarios_used: 0,
        prontuarios_limit: -1, // Unlimited for professional
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
