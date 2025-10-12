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

    // Get subscription details FIRST (faster than RPC function)
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // If no subscription exists, create a free one immediately
    if (!subscription || subError?.code === 'PGRST116') {
      console.log('No subscription found for user, creating free subscription...');

      const { data: newSubscription, error: createError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          tier: 'free',
          status: 'active',
          prontuarios_limit: 3,
          minutes_included: 0,
          minutes_balance: 0,
          minutes_used: 0,
          cost_per_minute: 0.036,
          allow_additional_minutes: false,
          stripe_customer_id: `cus_free_${user.id}`,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating subscription:', createError);
        return NextResponse.json(
          { error: 'Failed to create subscription', details: createError.message },
          { status: 500 }
        );
      }

      // Return immediately for new user with free tier
      return NextResponse.json({
        subscription: newSubscription,
        balance: {
          tier: 'free',
          minutes_balance: 0,
          total_available: 0,
          low_balance_alert: false,
          minutes_included: 0,
          minutes_purchased: 0,
          prontuarios_used: 0,
          prontuarios_limit: 3,
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

    // For FREE tier - simple and fast query
    if (subscription.tier === 'free') {
      // Get usage tracking for consultation count
      const { data: usageTracking, error: usageError } = await supabase
        .from('usage_tracking')
        .select('consultations_count')
        .eq('user_id', user.id)
        .gte('period_end', new Date().toISOString())
        .lte('period_start', new Date().toISOString())
        .single();

      if (usageError && usageError.code !== 'PGRST116') {
        console.error('Error fetching usage tracking:', usageError);
      }

      const prontuarios_used = usageTracking?.consultations_count || 0;
      const prontuarios_limit = subscription.prontuarios_limit || 3;

      return NextResponse.json({
        subscription,
        balance: {
          tier: 'free',
          minutes_balance: 0,
          total_available: 0,
          low_balance_alert: false,
          minutes_included: 0,
          minutes_purchased: 0,
          prontuarios_used,
          prontuarios_limit,
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
