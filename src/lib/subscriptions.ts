/**
 * Subscription Management Module
 * Handles subscription tiers, pricing, and Stripe integration
 */

import { SubscriptionTier, SubscriptionStatus, BillingInterval } from "@prisma/client";
import { getStripe } from "./stripe";
import { prisma } from "./prisma";

// ============================================
// SUBSCRIPTION TIER CONFIGURATION
// ============================================

export interface TierConfig {
  tier: SubscriptionTier;
  name: string;
  description: string;
  platformFeePercent: number;
  prioritySearchBoost: number;
  maxEmployees: number;
  features: string[];
  pricing: {
    monthly: number; // in EUR cents
    yearly: number;  // in EUR cents (discounted)
  } | null; // null for FREE tier
  stripePriceIds?: {
    monthly: string;
    yearly: string;
  };
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, TierConfig> = {
  FREE: {
    tier: SubscriptionTier.FREE,
    name: "Free",
    description: "Standard account with basic features",
    platformFeePercent: 15,
    prioritySearchBoost: 0,
    maxEmployees: 1,
    features: [
      "Accept bookings",
      "Basic profile",
      "Standard search ranking",
      "Email support",
    ],
    pricing: null,
  },
  WORKER_PRO: {
    tier: SubscriptionTier.WORKER_PRO,
    name: "Worker Pro",
    description: "Lower fees and premium features for professionals",
    platformFeePercent: 10,
    prioritySearchBoost: 25,
    maxEmployees: 1,
    features: [
      "Only 10% platform fee (save 5%)",
      "Pro badge on profile",
      "Priority in search results",
      "Advanced analytics dashboard",
      "Priority customer support",
      "Featured worker opportunities",
    ],
    pricing: {
      monthly: 1999, // 19.99 EUR
      yearly: 19900, // 199.00 EUR (save ~17%)
    },
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_WORKER_PRO_MONTHLY || "",
      yearly: process.env.STRIPE_PRICE_WORKER_PRO_YEARLY || "",
    },
  },
  BUSINESS: {
    tier: SubscriptionTier.BUSINESS,
    name: "Business",
    description: "For teams and service companies",
    platformFeePercent: 8,
    prioritySearchBoost: 50,
    maxEmployees: 10,
    features: [
      "Only 8% platform fee",
      "Business badge on profile",
      "Up to 10 team members",
      "Bulk booking discounts",
      "Consolidated invoicing",
      "Priority search ranking",
      "Dedicated account manager",
      "API access",
    ],
    pricing: {
      monthly: 7999, // 79.99 EUR
      yearly: 79900, // 799.00 EUR (save ~17%)
    },
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY || "",
      yearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY || "",
    },
  },
  ENTERPRISE: {
    tier: SubscriptionTier.ENTERPRISE,
    name: "Enterprise",
    description: "Custom solutions for large organizations",
    platformFeePercent: 5,
    prioritySearchBoost: 100,
    maxEmployees: 100,
    features: [
      "Custom platform fee (as low as 5%)",
      "Unlimited team members",
      "Custom branding options",
      "White-label solutions",
      "Dedicated success team",
      "Custom integrations",
      "SLA guarantee",
      "24/7 priority support",
    ],
    pricing: null, // Contact sales
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get tier configuration
 */
export function getTierConfig(tier: SubscriptionTier): TierConfig {
  return SUBSCRIPTION_TIERS[tier];
}

/**
 * Get platform fee percentage for a user
 */
export async function getUserPlatformFee(userId: string): Promise<number> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
    return SUBSCRIPTION_TIERS.FREE.platformFeePercent;
  }

  return subscription.platformFeePercent;
}

/**
 * Get user's current subscription tier
 */
export async function getUserSubscriptionTier(userId: string): Promise<SubscriptionTier> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
    return SubscriptionTier.FREE;
  }

  return subscription.tier;
}

/**
 * Check if user has an active paid subscription
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) return false;

  return (
    subscription.tier !== SubscriptionTier.FREE &&
    subscription.status === SubscriptionStatus.ACTIVE
  );
}

/**
 * Get subscription details for a user
 */
export async function getSubscription(userId: string) {
  return prisma.subscription.findUnique({
    where: { userId },
  });
}

// ============================================
// STRIPE INTEGRATION
// ============================================

/**
 * Create or get Stripe customer for user
 */
export async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      stripeCustomerId: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await getStripe().customers.create({
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    metadata: {
      userId: user.id,
    },
  });

  // Save customer ID
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/**
 * Create a checkout session for subscription
 */
export async function createSubscriptionCheckout(params: {
  userId: string;
  tier: SubscriptionTier;
  billingInterval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const { userId, tier, billingInterval, successUrl, cancelUrl } = params;

  const tierConfig = getTierConfig(tier);

  if (!tierConfig.pricing || !tierConfig.stripePriceIds) {
    throw new Error(`Tier ${tier} does not support subscriptions`);
  }

  const priceId = billingInterval === BillingInterval.YEARLY
    ? tierConfig.stripePriceIds.yearly
    : tierConfig.stripePriceIds.monthly;

  if (!priceId) {
    throw new Error(`No Stripe price ID configured for ${tier} ${billingInterval}`);
  }

  const customerId = await getOrCreateStripeCustomer(userId);

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: {
        userId,
        tier,
        billingInterval,
      },
    },
    metadata: {
      userId,
      tier,
      billingInterval,
    },
  });

  return session.url || "";
}

/**
 * Create a customer portal session for managing subscription
 */
export async function createCustomerPortalSession(
  userId: string,
  returnUrl: string
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    throw new Error("No Stripe customer found for user");
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(userId: string): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription?.stripeSubscriptionId) {
    throw new Error("No active subscription found");
  }

  // Cancel at period end (user keeps benefits until end of billing period)
  await getStripe().subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  // Update our record
  await prisma.subscription.update({
    where: { userId },
    data: {
      cancelAtPeriodEnd: true,
      canceledAt: new Date(),
    },
  });
}

/**
 * Reactivate a canceled subscription (before period ends)
 */
export async function reactivateSubscription(userId: string): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription?.stripeSubscriptionId) {
    throw new Error("No subscription found");
  }

  // Remove cancel at period end
  await getStripe().subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });

  // Update our record
  await prisma.subscription.update({
    where: { userId },
    data: {
      cancelAtPeriodEnd: false,
      canceledAt: null,
      cancellationReason: null,
    },
  });
}

/**
 * Upgrade or downgrade subscription
 */
export async function changeSubscriptionTier(
  userId: string,
  newTier: SubscriptionTier,
  billingInterval: BillingInterval
): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription?.stripeSubscriptionId) {
    throw new Error("No active subscription found");
  }

  const tierConfig = getTierConfig(newTier);

  if (!tierConfig.pricing || !tierConfig.stripePriceIds) {
    throw new Error(`Tier ${newTier} does not support subscriptions`);
  }

  const newPriceId = billingInterval === BillingInterval.YEARLY
    ? tierConfig.stripePriceIds.yearly
    : tierConfig.stripePriceIds.monthly;

  // Get current subscription to find the item ID
  const stripeSubscription = await getStripe().subscriptions.retrieve(
    subscription.stripeSubscriptionId
  );

  const itemId = stripeSubscription.items.data[0]?.id;

  if (!itemId) {
    throw new Error("No subscription item found");
  }

  // Update the subscription with new price (prorated by default)
  await getStripe().subscriptions.update(subscription.stripeSubscriptionId, {
    items: [
      {
        id: itemId,
        price: newPriceId,
      },
    ],
    proration_behavior: "create_prorations",
    metadata: {
      tier: newTier,
      billingInterval,
    },
  });
}

// ============================================
// WEBHOOK HANDLERS
// ============================================

/**
 * Handle subscription created/updated from Stripe webhook
 */
export async function handleSubscriptionUpdated(
  stripeSubscription: {
    id: string;
    status: string;
    current_period_start: number;
    current_period_end: number;
    cancel_at_period_end: boolean;
    canceled_at: number | null;
    metadata: Record<string, string>;
    items: { data: Array<{ price: { id: string } }> };
    customer: string;
  }
): Promise<void> {
  const { metadata } = stripeSubscription;
  let userId = metadata.userId;

  // If no userId in metadata, look up by customer ID
  if (!userId) {
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: stripeSubscription.customer as string },
    });
    if (!user) {
      console.error("No user found for Stripe customer:", stripeSubscription.customer);
      return;
    }
    userId = user.id;
  }

  const tier = (metadata.tier as SubscriptionTier) || SubscriptionTier.WORKER_PRO;
  const billingInterval = (metadata.billingInterval as BillingInterval) || BillingInterval.MONTHLY;
  const tierConfig = getTierConfig(tier);

  // Map Stripe status to our status
  const statusMap: Record<string, SubscriptionStatus> = {
    active: SubscriptionStatus.ACTIVE,
    past_due: SubscriptionStatus.PAST_DUE,
    canceled: SubscriptionStatus.CANCELED,
    unpaid: SubscriptionStatus.EXPIRED,
    incomplete: SubscriptionStatus.PAST_DUE,
    incomplete_expired: SubscriptionStatus.EXPIRED,
    trialing: SubscriptionStatus.TRIALING,
  };

  const status = statusMap[stripeSubscription.status] || SubscriptionStatus.EXPIRED;

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      tier,
      status,
      billingInterval,
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: stripeSubscription.items.data[0]?.price.id,
      stripeCurrentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      stripeCurrentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      canceledAt: stripeSubscription.canceled_at
        ? new Date(stripeSubscription.canceled_at * 1000)
        : null,
      platformFeePercent: tierConfig.platformFeePercent,
      prioritySearchBoost: tierConfig.prioritySearchBoost,
      maxEmployees: tierConfig.maxEmployees,
    },
    update: {
      tier,
      status,
      billingInterval,
      stripePriceId: stripeSubscription.items.data[0]?.price.id,
      stripeCurrentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      stripeCurrentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      canceledAt: stripeSubscription.canceled_at
        ? new Date(stripeSubscription.canceled_at * 1000)
        : null,
      platformFeePercent: tierConfig.platformFeePercent,
      prioritySearchBoost: tierConfig.prioritySearchBoost,
      maxEmployees: tierConfig.maxEmployees,
    },
  });
}

/**
 * Handle subscription deleted from Stripe webhook
 */
export async function handleSubscriptionDeleted(
  stripeSubscriptionId: string
): Promise<void> {
  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId },
  });

  if (!subscription) {
    console.error("No subscription found for Stripe ID:", stripeSubscriptionId);
    return;
  }

  // Reset to FREE tier
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      tier: SubscriptionTier.FREE,
      status: SubscriptionStatus.EXPIRED,
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeCurrentPeriodStart: null,
      stripeCurrentPeriodEnd: null,
      billingInterval: null,
      platformFeePercent: SUBSCRIPTION_TIERS.FREE.platformFeePercent,
      prioritySearchBoost: SUBSCRIPTION_TIERS.FREE.prioritySearchBoost,
      maxEmployees: SUBSCRIPTION_TIERS.FREE.maxEmployees,
    },
  });
}

/**
 * Handle invoice paid from Stripe webhook
 */
export async function handleInvoicePaid(invoice: {
  id: string;
  subscription: string;
  customer: string;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: string;
  paid: boolean;
  period_start: number;
  period_end: number;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  payment_intent: string | null;
}): Promise<void> {
  // Find subscription
  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: invoice.subscription as string },
  });

  if (!subscription) {
    console.error("No subscription found for invoice:", invoice.id);
    return;
  }

  // Create invoice record
  await prisma.subscriptionInvoice.upsert({
    where: { stripeInvoiceId: invoice.id },
    create: {
      subscriptionId: subscription.id,
      userId: subscription.userId,
      stripeInvoiceId: invoice.id,
      stripePaymentIntentId: invoice.payment_intent,
      amountDue: invoice.amount_due / 100,
      amountPaid: invoice.amount_paid / 100,
      currency: invoice.currency.toUpperCase(),
      status: invoice.status || "paid",
      paid: invoice.paid,
      periodStart: new Date(invoice.period_start * 1000),
      periodEnd: new Date(invoice.period_end * 1000),
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
      paidAt: invoice.paid ? new Date() : null,
    },
    update: {
      amountPaid: invoice.amount_paid / 100,
      status: invoice.status || "paid",
      paid: invoice.paid,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
      paidAt: invoice.paid ? new Date() : null,
    },
  });
}
