/**
 * Worker Subscription Payment API
 * Creates a payment session for annual subscription fee
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import {
  getSubscriptionFeeAmount,
  getCurrencySymbol,
} from "@/lib/worker-subscription";

const APP_URL = process.env.NEXTAUTH_URL || "https://servantana.com";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is a worker
    if (session.user.role !== "WORKER" && session.user.role !== "CLEANER") {
      return NextResponse.json(
        { error: "Only workers can pay subscription" },
        { status: 403 }
      );
    }

    // Get worker profile
    const workerProfile = await prisma.workerProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });

    if (!workerProfile) {
      return NextResponse.json(
        { error: "Worker profile not found" },
        { status: 404 }
      );
    }

    // Check subscription status
    if (workerProfile.workerSubscriptionStatus === "ACTIVE") {
      return NextResponse.json(
        { error: "Subscription is already active" },
        { status: 400 }
      );
    }

    const currency = workerProfile.currency.toLowerCase();
    const amount = getSubscriptionFeeAmount(workerProfile.currency);
    const currencySymbol = getCurrencySymbol(workerProfile.currency);

    // Create Stripe Checkout Session
    const checkoutSession = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: workerProfile.user.email,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: "Servantana Worker Annual Subscription",
              description: `12-month subscription (${currencySymbol}${amount}/year)`,
            },
            unit_amount: amount * 100, // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "worker_subscription",
        workerId: session.user.id,
        workerProfileId: workerProfile.id,
      },
      success_url: `${APP_URL}/en/worker/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/en/worker/subscription/pay?cancelled=true`,
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error("Worker subscription payment error:", error);
    return NextResponse.json(
      {
        error: "Failed to create payment session",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Check current subscription status
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workerProfile = await prisma.workerProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        workerSubscriptionStatus: true,
        subscriptionExpiresAt: true,
        firstJobCompletedAt: true,
        paymentDueAt: true,
        isVisible: true,
        currency: true,
      },
    });

    if (!workerProfile) {
      return NextResponse.json(
        { error: "Worker profile not found" },
        { status: 404 }
      );
    }

    const feeAmount = getSubscriptionFeeAmount(workerProfile.currency);
    const currencySymbol = getCurrencySymbol(workerProfile.currency);

    return NextResponse.json({
      status: workerProfile.workerSubscriptionStatus,
      expiresAt: workerProfile.subscriptionExpiresAt,
      firstJobCompletedAt: workerProfile.firstJobCompletedAt,
      paymentDueAt: workerProfile.paymentDueAt,
      isVisible: workerProfile.isVisible,
      fee: {
        amount: feeAmount,
        currency: workerProfile.currency,
        symbol: currencySymbol,
        display: `${currencySymbol}${feeAmount}/year`,
      },
    });
  } catch (error) {
    console.error("Get subscription status error:", error);
    return NextResponse.json(
      { error: "Failed to get subscription status" },
      { status: 500 }
    );
  }
}
