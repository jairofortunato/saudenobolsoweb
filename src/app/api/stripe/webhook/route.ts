import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { constructWebhookEvent, PRICING } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role for admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = constructWebhookEvent(body, signature);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Log the event
  console.log(`[STRIPE WEBHOOK] Received event: ${event.type} (${event.id})`);

  const { error: logError } = await supabase.from('stripe_events_log').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: event.data.object,
    processed: false,
  });

  if (logError) {
    console.error('[STRIPE WEBHOOK] Error logging event:', logError);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
    }

    // Mark event as processed
    await supabase
      .from('stripe_events_log')
      .update({ processed: true })
      .eq('stripe_event_id', event.id);

    console.log(`[STRIPE WEBHOOK] Successfully processed event: ${event.type}`);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;

  console.log('[STRIPE WEBHOOK] handleCheckoutCompleted called', {
    userId,
    sessionId: session.id,
    customerId: session.customer,
    subscriptionId: session.subscription,
  });

  if (!userId) {
    console.error('[STRIPE WEBHOOK] No userId in session metadata');
    return;
  }

  // Get profile_id from user_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('profile_id')
    .eq('user_id', userId)
    .single();

  if (profileError || !profile) {
    console.error('[STRIPE WEBHOOK] Error fetching profile:', profileError);
    return;
  }

  console.log('[STRIPE WEBHOOK] Found profile_id:', profile.profile_id);

  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  const subscriptionData = {
    user_id: userId,
    profile_id: profile.profile_id,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    stripe_price_id: PRICING.professionalPriceId,
    tier: 'professional',
    status: 'active',
    minutes_included: PRICING.minutesIncludedProfessional,
    minutes_balance: PRICING.minutesIncludedProfessional,
    minutes_used: 0,
    cost_per_minute: PRICING.costPerMinute,
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toISOString(), // 30 days
  };

  console.log('[STRIPE WEBHOOK] Upserting subscription:', subscriptionData);

  // Update or create subscription record
  const { data: subscriptionResult, error } = await supabase
    .from('subscriptions')
    .upsert(subscriptionData, {
      onConflict: 'user_id',
    })
    .select();

  if (error) {
    console.error('[STRIPE WEBHOOK] Error updating subscription:', error);
  } else {
    console.log('[STRIPE WEBHOOK] Subscription updated successfully:', subscriptionResult);
  }

  // Log payment history
  const paymentData = {
    user_id: userId,
    subscription_id: subscriptionResult?.[0]?.id,
    stripe_payment_intent_id: session.payment_intent as string,
    amount: session.amount_total || 0, // Already in cents
    currency: session.currency || 'brl',
    status: 'succeeded',
    description: 'Professional subscription - Monthly payment',
  };

  console.log('[STRIPE WEBHOOK] Inserting payment history:', paymentData);

  const { error: paymentError } = await supabase
    .from('payment_history')
    .insert(paymentData);

  if (paymentError) {
    console.error('[STRIPE WEBHOOK] Error logging payment:', paymentError);
  } else {
    console.log('[STRIPE WEBHOOK] Payment history logged successfully');
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  const status = subscription.status === 'active' ? 'active' : 'inactive';

  await supabase
    .from('subscriptions')
    .update({
      status,
      current_period_start: new Date(
        subscription.current_period_start * 1000
      ).toISOString(),
      current_period_end: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  // Get subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('user_id, id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!subscription) return;

  // Reset monthly minutes on renewal
  await supabase.rpc('reset_monthly_minutes', {
    p_user_id: subscription.user_id,
  });

  // Log payment
  await supabase.from('payment_history').insert({
    user_id: subscription.user_id,
    subscription_id: subscription.id,
    stripe_payment_intent_id: invoice.payment_intent as string,
    stripe_invoice_id: invoice.id,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    status: 'succeeded',
    description: 'Professional subscription renewal',
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('user_id, id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!subscription) return;

  // Log failed payment
  await supabase.from('payment_history').insert({
    user_id: subscription.user_id,
    subscription_id: subscription.id,
    stripe_payment_intent_id: invoice.payment_intent as string,
    stripe_invoice_id: invoice.id,
    amount: invoice.amount_due,
    currency: invoice.currency,
    status: 'failed',
    description: 'Professional subscription renewal (failed)',
  });
}

// Disable body parser for webhooks
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
