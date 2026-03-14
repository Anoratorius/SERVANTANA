import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCoinbaseWebhook } from "@/lib/crypto";
import { PLATFORM_FEE_PERCENT, EARNINGS_HOLD_DAYS } from "@/lib/payment-config";

interface CoinbaseWebhookEvent {
  id: string;
  type: string;
  data: {
    id: string;
    code: string;
    metadata: {
      bookingId: string;
      customerId: string;
      cleanerId: string;
    };
    payments: Array<{
      network: string;
      transaction_id: string;
      status: string;
      value: {
        amount: string;
        currency: string;
      };
    }>;
    timeline: Array<{
      time: string;
      status: string;
    }>;
  };
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-cc-webhook-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing webhook signature" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("COINBASE_COMMERCE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook verification not configured" },
      { status: 500 }
    );
  }

  try {
    const isValid = verifyCoinbaseWebhook(body, signature, webhookSecret);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Webhook verification failed:", error);
    return NextResponse.json(
      { error: "Webhook verification failed" },
      { status: 400 }
    );
  }

  try {
    const event: CoinbaseWebhookEvent = JSON.parse(body).event;

    switch (event.type) {
      case "charge:confirmed":
        await handleChargeConfirmed(event);
        break;

      case "charge:failed":
        await handleChargeFailed(event);
        break;

      case "charge:delayed":
        await handleChargeDelayed(event);
        break;

      case "charge:pending":
        // Payment is pending confirmation on the blockchain
        console.log(`Charge pending: ${event.data.code}`);
        break;

      case "charge:resolved":
        // Charge was resolved (after being delayed)
        await handleChargeConfirmed(event);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing crypto webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleChargeConfirmed(event: CoinbaseWebhookEvent) {
  const { bookingId, cleanerId } = event.data.metadata || {};
  const payment = event.data.payments?.[0];

  if (!bookingId) {
    console.error("No booking ID in charge metadata");
    return;
  }

  // Get booking for price info
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { totalPrice: true, currency: true, cleanerId: true },
  });

  if (!booking) {
    console.error("Booking not found:", bookingId);
    return;
  }

  // Check for duplicate earning
  const existingEarning = await prisma.earning.findUnique({
    where: { bookingId },
  });

  if (existingEarning) {
    console.log(`Earning already exists for booking ${bookingId}, skipping`);
    return;
  }

  const grossAmount = booking.totalPrice;
  const platformFee = grossAmount * PLATFORM_FEE_PERCENT;
  const netAmount = grossAmount - platformFee;

  const availableAt = new Date();
  availableAt.setDate(availableAt.getDate() + EARNINGS_HOLD_DAYS);

  // Use transaction for atomicity
  await prisma.$transaction([
    prisma.payment.update({
      where: { cryptoChargeId: event.data.id },
      data: {
        status: "SUCCEEDED",
        cryptoNetwork: payment?.network,
        cryptoTxId: payment?.transaction_id,
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

  console.log(`Crypto payment confirmed for booking ${bookingId}`);
}

async function handleChargeFailed(event: CoinbaseWebhookEvent) {
  const { bookingId } = event.data.metadata;

  if (!bookingId) return;

  await prisma.payment.update({
    where: { cryptoChargeId: event.data.id },
    data: {
      status: "FAILED",
      failureReason: "Crypto payment failed or expired",
    },
  });

  console.log(`Crypto payment failed for booking ${bookingId}`);
}

async function handleChargeDelayed(event: CoinbaseWebhookEvent) {
  const { bookingId } = event.data.metadata;

  if (!bookingId) return;

  // Payment received but unconfirmed - waiting for blockchain confirmations
  await prisma.payment.update({
    where: { cryptoChargeId: event.data.id },
    data: {
      status: "PROCESSING",
    },
  });

  console.log(`Crypto payment delayed (awaiting confirmations) for booking ${bookingId}`);
}
