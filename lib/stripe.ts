import Stripe from 'stripe';

// Initialize Stripe with secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

// Pricing configuration
export const PRICING = {
  costPerMinute: parseFloat(process.env.COST_PER_MINUTE || '0.036'),
  minutesIncludedProfessional: parseInt(
    process.env.MINUTES_INCLUDED_PROFESSIONAL || '5240',
    10
  ),
  professionalPriceId: process.env.STRIPE_PRICE_ID_PRO_MONTHLY!,
  professionalMonthlyPrice: 190.0, // R$ 190/month
} as const;

// Helper function to format currency in BRL
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}

// Calculate cost based on audio duration in seconds
export function calculateCost(durationSeconds: number): {
  minutes: number;
  cost: number;
  formattedCost: string;
} {
  const minutes = Math.ceil(durationSeconds / 60);
  const cost = minutes * PRICING.costPerMinute;

  return {
    minutes,
    cost: parseFloat(cost.toFixed(2)),
    formattedCost: formatCurrency(cost),
  };
}

// Get or create Stripe customer
export async function getOrCreateCustomer(
  userId: string,
  email: string
): Promise<string> {
  // Search for existing customer
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0].id;
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      userId,
    },
  });

  return customer.id;
}

// Create checkout session for Professional subscription
export async function createSubscriptionCheckout(
  customerId: string,
  userId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  return await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: PRICING.professionalPriceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
    },
    subscription_data: {
      metadata: {
        userId,
      },
    },
    locale: 'pt-BR',
    billing_address_collection: 'required',
  });
}

// Get subscription details
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    return null;
  }
}

// Cancel subscription
export async function cancelSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.cancel(subscriptionId);
}

// Create customer portal session
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

// Verify webhook signature
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}
