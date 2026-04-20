/**
 * Subscription API
 * GET: Get current subscription and available tiers
 * POST: Create checkout session for new subscription
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  getSubscription,
  SUBSCRIPTION_TIERS,
  createSubscriptionCheckout,
  getTierConfig,
} from "@/lib/subscriptions";
import { SubscriptionTier, BillingInterval } from "@prisma/client";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current subscription
    const subscription = await getSubscription(session.user.id);

    // Get available tiers (excluding ENTERPRISE which requires sales contact)
    const availableTiers = Object.values(SUBSCRIPTION_TIERS)
      .filter((tier) => tier.tier !== SubscriptionTier.ENTERPRISE)
      .map((tier) => ({
        ...tier,
        pricing: tier.pricing
          ? {
              monthly: tier.pricing.monthly / 100, // Convert to EUR
              yearly: tier.pricing.yearly / 100,
              monthlyEquivalentYearly: Math.round((tier.pricing.yearly / 12) / 100 * 100) / 100,
            }
          : null,
        // Don't expose Stripe price IDs to client
        stripePriceIds: undefined,
      }));

    return NextResponse.json({
      subscription: subscription
        ? {
            id: subscription.id,
            tier: subscription.tier,
            status: subscription.status,
            billingInterval: subscription.billingInterval,
            currentPeriodEnd: subscription.stripeCurrentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            platformFeePercent: subscription.platformFeePercent,
            prioritySearchBoost: subscription.prioritySearchBoost,
          }
        : null,
      currentTier: subscription?.tier || SubscriptionTier.FREE,
      availableTiers,
    });
  } catch (error) {
    console.error("Error getting subscription:", error);
    return NextResponse.json(
      { error: "Failed to get subscription" },
      { status: 500 }
    );
  }
}

const createCheckoutSchema = z.object({
  tier: z.enum(["WORKER_PRO", "BUSINESS"]),
  billingInterval: z.enum(["MONTHLY", "YEARLY"]),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a worker
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "WORKER" && user?.role !== "CLEANER") {
      return NextResponse.json(
        { error: "Only workers can subscribe to premium plans" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createCheckoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { tier, billingInterval } = validation.data;

    // Check if tier is available
    const tierConfig = getTierConfig(tier as SubscriptionTier);
    if (!tierConfig.pricing) {
      return NextResponse.json(
        { error: "This tier is not available for self-service subscription" },
        { status: 400 }
      );
    }

    // Get base URL
    const baseUrl = process.env.NEXTAUTH_URL || "https://servantana.com";

    // Create checkout session
    const checkoutUrl = await createSubscriptionCheckout({
      userId: session.user.id,
      tier: tier as SubscriptionTier,
      billingInterval: billingInterval as BillingInterval,
      successUrl: `${baseUrl}/dashboard/subscription?success=true`,
      cancelUrl: `${baseUrl}/dashboard/subscription?canceled=true`,
    });

    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    console.error("Error creating checkout:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
