import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: "Invalid signature" },
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

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleRefund(charge);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Platform fee percentage (3.8% - fair marketplace rate)
const PLATFORM_FEE_PERCENT = 0.038;
// Days until earnings become available for payout
const EARNINGS_HOLD_DAYS = 7;

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.bookingId;
  const cleanerId = session.metadata?.cleanerId;

  if (!bookingId) {
    console.error("No booking ID in session metadata");
    return;
  }

  // Get booking details
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      totalPrice: true,
      currency: true,
      cleanerId: true,
    },
  });

  if (!booking) {
    console.error("Booking not found:", bookingId);
    return;
  }

  // Check for duplicate earning to prevent double-processing
  const existingEarning = await prisma.earning.findUnique({
    where: { bookingId },
  });

  if (existingEarning) {
    console.log(`Earning already exists for booking ${bookingId}, skipping`);
    return;
  }

  const stripePaymentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id || null;

  // Use transaction for atomicity
  const grossAmount = booking.totalPrice;
  const platformFee = grossAmount * PLATFORM_FEE_PERCENT;
  const netAmount = grossAmount - platformFee;

  const availableAt = new Date();
  availableAt.setDate(availableAt.getDate() + EARNINGS_HOLD_DAYS);

  await prisma.$transaction([
    prisma.payment.update({
      where: { stripeSessionId: session.id },
      data: {
        stripePaymentId,
        status: "SUCCEEDED",
        paymentMethod: session.payment_method_types?.[0] || "card",
      },
    }),
    prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
      },
    }),
    prisma.earning.create({
      data: {
        cleanerId: cleanerId || booking.cleanerId,
        bookingId: bookingId,
        amount: netAmount,
        platformFee: platformFee,
        grossAmount: grossAmount,
        currency: booking.currency,
        status: "PENDING",
        availableAt: availableAt,
      },
    }),
  ]);

  console.log(`Payment completed for booking ${bookingId}, earning created for cleaner`);
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const bookingId = paymentIntent.metadata?.bookingId;
  if (!bookingId) return;

  // Get receipt URL from charges
  const chargeId = paymentIntent.latest_charge;
  let receiptUrl: string | undefined;

  if (typeof chargeId === "string") {
    try {
      const charge = await stripe.charges.retrieve(chargeId);
      receiptUrl = charge.receipt_url || undefined;
    } catch (error) {
      console.error("Failed to retrieve charge for receipt URL:", error);
    }
  }

  await prisma.payment.update({
    where: { stripePaymentId: paymentIntent.id },
    data: {
      status: "SUCCEEDED",
      receiptUrl,
    },
  });
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const bookingId = paymentIntent.metadata?.bookingId;
  if (!bookingId) return;

  await prisma.payment.update({
    where: { stripePaymentId: paymentIntent.id },
    data: {
      status: "FAILED",
      failureReason: paymentIntent.last_payment_error?.message,
    },
  });
}

async function handleRefund(charge: Stripe.Charge) {
  if (!charge.payment_intent) return;

  const payment = await prisma.payment.findFirst({
    where: { stripePaymentId: charge.payment_intent as string },
  });

  if (!payment) return;

  const refundAmount = charge.amount_refunded / 100; // Convert from cents

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: charge.refunded ? "REFUNDED" : "SUCCEEDED",
      refundedAmount: refundAmount,
      refundedAt: new Date(),
    },
  });
}
