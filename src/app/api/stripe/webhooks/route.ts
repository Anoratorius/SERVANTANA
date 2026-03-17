import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${errorMessage}`);
    return NextResponse.json(
      { error: `Webhook Error: ${errorMessage}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutExpired(session);
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(paymentIntent);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(account);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook ${event.type}:`, error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.bookingId;
  if (!bookingId) {
    console.error("No bookingId in checkout session metadata");
    return;
  }

  // Update payment record
  const payment = await prisma.payment.update({
    where: { stripeSessionId: session.id },
    data: {
      status: "SUCCEEDED",
      stripePaymentId: typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id,
      paymentMethod: session.payment_method_types?.[0] || "card",
    },
    include: {
      booking: true,
    },
  });

  // Update booking status to CONFIRMED
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "CONFIRMED",
      confirmedAt: new Date(),
    },
  });

  // Create earning record for cleaner (status PENDING until payout day)
  if (payment.cleanerPayout) {
    // Calculate next payout date (1st or 15th of month)
    const now = new Date();
    let payoutDate: Date;

    if (now.getDate() < 15) {
      // Next payout is 15th of this month
      payoutDate = new Date(now.getFullYear(), now.getMonth(), 15);
    } else {
      // Next payout is 1st of next month
      payoutDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    await prisma.earning.upsert({
      where: { bookingId },
      create: {
        cleanerId: payment.booking.cleanerId,
        bookingId,
        amount: payment.cleanerPayout,
        platformFee: payment.platformFee || 0,
        grossAmount: payment.bookingAmount || payment.amount,
        currency: payment.currency,
        status: "PENDING", // Will be AVAILABLE on payout date
        availableAt: payoutDate,
      },
      update: {
        amount: payment.cleanerPayout,
        platformFee: payment.platformFee || 0,
        status: "PENDING",
        availableAt: payoutDate,
      },
    });
  }

  console.log(`Payment completed for booking ${bookingId}, payout scheduled`);
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.bookingId;
  if (!bookingId) return;

  await prisma.payment.updateMany({
    where: { stripeSessionId: session.id },
    data: {
      status: "FAILED",
      failureReason: "Checkout session expired",
    },
  });

  console.log(`Checkout expired for booking ${bookingId}`);
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const bookingId = paymentIntent.metadata?.bookingId;
  if (!bookingId) return;

  // Get receipt URL from the charge
  const charges = paymentIntent.latest_charge;
  let receiptUrl = null;

  if (typeof charges === "string") {
    const charge = await getStripe().charges.retrieve(charges);
    receiptUrl = charge.receipt_url;
  }

  await prisma.payment.updateMany({
    where: { stripePaymentId: paymentIntent.id },
    data: {
      status: "SUCCEEDED",
      receiptUrl,
    },
  });

  console.log(`Payment succeeded for booking ${bookingId}`);
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const bookingId = paymentIntent.metadata?.bookingId;
  if (!bookingId) return;

  await prisma.payment.updateMany({
    where: { stripePaymentId: paymentIntent.id },
    data: {
      status: "FAILED",
      failureReason: paymentIntent.last_payment_error?.message || "Payment failed",
    },
  });

  console.log(`Payment failed for booking ${bookingId}`);
}

async function handleAccountUpdated(account: Stripe.Account) {
  // Update cleaner profile when their Stripe account status changes
  if (account.charges_enabled && account.payouts_enabled) {
    await prisma.cleanerProfile.updateMany({
      where: { stripeAccountId: account.id },
      data: { stripeOnboardingComplete: true },
    });
    console.log(`Stripe account ${account.id} onboarding complete`);
  }
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent?.id;

  if (!paymentIntentId) return;

  const refundedAmount = charge.amount_refunded / 100;

  // Update payment
  await prisma.payment.updateMany({
    where: { stripePaymentId: paymentIntentId },
    data: {
      status: charge.refunded ? "REFUNDED" : "SUCCEEDED",
      refundedAmount,
      refundedAt: new Date(),
    },
  });

  // Cancel the earning if fully refunded
  if (charge.refunded) {
    const payment = await prisma.payment.findFirst({
      where: { stripePaymentId: paymentIntentId },
    });

    if (payment) {
      await prisma.earning.updateMany({
        where: { bookingId: payment.bookingId },
        data: { status: "PENDING" }, // Mark as not available for payout
      });
    }
  }

  console.log(`Charge refunded: ${charge.id}`);
}
