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

    // Check if user has a paid subscription (professional tier)
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier')
      .eq('user_id', user.id)
      .single();

    // Professional tier doesn't need usage tracking (unlimited consultations)
    if (subscription?.tier === 'professional') {
      return NextResponse.json({
        success: true,
        message: 'Professional tier - unlimited consultations',
        consultations_used: -1, // -1 indicates unlimited
      });
    }

    // For free tier users, increment consultation count in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('free_consultations_used, free_consultations_limit')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    // Increment the consultation counter
    const newCount = (profile.free_consultations_used || 0) + 1;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        free_consultations_used: newCount,
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating consultation count:', updateError);
      return NextResponse.json(
        { error: 'Failed to update consultation count' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      consultations_used: newCount,
      consultations_limit: profile.free_consultations_limit || 5,
      message: 'Consultation count incremented successfully',
    });
  } catch (error) {
    console.error('Error in increment usage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
