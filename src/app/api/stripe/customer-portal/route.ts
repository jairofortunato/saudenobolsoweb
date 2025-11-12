import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the authenticated user from the session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[CUSTOMER PORTAL] Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[CUSTOMER PORTAL] User authenticated:', user.id);

    // Get the user's subscription to find their Stripe customer ID
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      console.error('[CUSTOMER PORTAL] Subscription error:', subError);
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    console.log('[CUSTOMER PORTAL] Creating portal session for customer:', subscription.stripe_customer_id);

    // Create a Stripe Customer Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/doctor/configuracoes`,
    });

    console.log('[CUSTOMER PORTAL] Portal session created:', session.url);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[CUSTOMER PORTAL] Error creating customer portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
