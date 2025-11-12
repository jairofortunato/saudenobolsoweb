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
      .select('stripe_customer_id, stripe_subscription_id, status, tier')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      console.error('[CUSTOMER PORTAL] Subscription error:', subError);
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    const customerId = subscription.stripe_customer_id;
    console.log('[CUSTOMER PORTAL] Subscription data:', {
      customer_id: customerId,
      subscription_id: subscription.stripe_subscription_id,
      status: subscription.status,
      tier: subscription.tier,
    });

    // Validate customer ID exists
    if (!customerId) {
      console.error('[CUSTOMER PORTAL] No Stripe customer ID in subscription');
      return NextResponse.json(
        { error: 'No Stripe customer ID found' },
        { status: 400 }
      );
    }

    // Detect test/live mode mismatch
    const isTestCustomer = customerId.startsWith('cus_test_');
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
    const isTestMode = stripeSecretKey.startsWith('sk_test_');

    if (isTestCustomer && !isTestMode) {
      console.error('[CUSTOMER PORTAL] Test customer in live mode:', customerId);
      return NextResponse.json(
        {
          error: 'Esta assinatura foi criada em modo de teste. Por favor, faça uma nova assinatura no ambiente de produção.',
          mode_mismatch: true,
          is_test_customer: true,
        },
        { status: 400 }
      );
    }

    if (!isTestCustomer && isTestMode) {
      console.error('[CUSTOMER PORTAL] Live customer in test mode:', customerId);
      return NextResponse.json(
        {
          error: 'Esta assinatura de produção não pode ser gerenciada no modo de teste.',
          mode_mismatch: true,
          is_test_customer: false,
        },
        { status: 400 }
      );
    }

    console.log('[CUSTOMER PORTAL] Creating portal session for customer:', customerId);

    // Create a Stripe Customer Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/doctor/configuracoes`,
    });

    console.log('[CUSTOMER PORTAL] Portal session created:', session.url);

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('[CUSTOMER PORTAL] Error creating customer portal session:', error);
    console.error('[CUSTOMER PORTAL] Error details:', {
      message: error?.message,
      type: error?.type,
      code: error?.code,
      statusCode: error?.statusCode,
    });

    // Provide more specific error messages
    let errorMessage = 'Failed to create portal session';
    let statusCode = 500;

    if (error?.type === 'StripeInvalidRequestError') {
      if (error?.message?.includes('No such customer')) {
        errorMessage = 'Cliente não encontrado no Stripe. Esta pode ser uma assinatura de teste que precisa ser recriada em produção.';
        statusCode = 404;
      } else {
        errorMessage = `Stripe error: ${error?.message || 'Invalid request'}`;
        statusCode = 400;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: statusCode }
    );
  }
}
