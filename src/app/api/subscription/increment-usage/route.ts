import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/**
 * POST /api/subscription/increment-usage
 * Increments the consultation count for free tier users after successful consultation
 * Professional tier users don't need this as they have unlimited consultations
 */
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

    // Get user's subscription to check tier
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('tier, current_period_start, current_period_end')
      .eq('user_id', user.id)
      .single();

    if (subError) {
      console.error('Error fetching subscription:', subError);
      return NextResponse.json(
        { error: 'Failed to fetch subscription' },
        { status: 500 }
      );
    }

    // Professional tier doesn't need usage tracking (unlimited consultations)
    if (subscription?.tier === 'professional') {
      return NextResponse.json({
        success: true,
        message: 'Professional tier - unlimited consultations',
        consultations_used: -1, // -1 indicates unlimited
      });
    }

    // For free tier, increment consultation count in usage_tracking
    const periodStart = subscription?.current_period_start || new Date().toISOString();
    const periodEnd = subscription?.current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Check if usage tracking record exists for current period
    const { data: existingUsage, error: usageError } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', user.id)
      .gte('period_end', new Date().toISOString())
      .lte('period_start', new Date().toISOString())
      .single();

    if (usageError && usageError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is expected for first consultation
      console.error('Error fetching usage tracking:', usageError);
    }

    if (existingUsage) {
      // Update existing record
      const { data: updatedUsage, error: updateError } = await supabase
        .from('usage_tracking')
        .update({
          consultations_count: existingUsage.consultations_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUsage.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating usage tracking:', updateError);
        return NextResponse.json(
          { error: 'Failed to update usage tracking' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        consultations_used: updatedUsage.consultations_count,
        message: 'Usage incremented successfully',
      });
    } else {
      // Create new record for this period
      const { data: newUsage, error: insertError } = await supabase
        .from('usage_tracking')
        .insert({
          user_id: user.id,
          subscription_id: subscription?.id,
          period_start: periodStart,
          period_end: periodEnd,
          consultations_count: 1,
          total_minutes_used: 0,
          total_cost: 0,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating usage tracking:', insertError);
        return NextResponse.json(
          { error: 'Failed to create usage tracking' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        consultations_used: newUsage.consultations_count,
        message: 'Usage tracking initialized',
      });
    }
  } catch (error) {
    console.error('Error in increment usage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
