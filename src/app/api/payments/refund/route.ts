import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getPaymentsController } from "@/lib/paypal";
import { z } from "zod";
import type Stripe from "stripe";

const refundSchema = z.object({
  bookingId: z.string(),
  amount: z.number().optional(), // Optional for partial refunds
  reason: z.string().optional(),
});

// Process Stripe refund
async function processStripeRefund(
  payment: { id: string; stripePaymentId: string; amount: number },
  refundAmount: number,
  reason?: string
) {
  const refund = await stripe().refunds.create({
    payment_intent: payment.stripePaymentId,
    amount: refundAmount,
    reason: (reason as Stripe.RefundCreateParams.Reason) || "requested_by_customer",
  });

  return {
    id: refund.id,
    amount: refund.amount / 100,
    currency: refund.currency,
    status: refund.status || "succeeded", // Default to succeeded if null
    provider: "stripe" as const,
  };
}

// Process PayPal refund
async function processPayPalRefund(
  payment: { id: string; paypalCaptureId: string; amount: number; currency: string },
  refundAmount: number,
  reason?: string
) {
  const paymentsController = getPaymentsController();

  // PayPal refund request - uses Money type with currencyCode and value (string)
  const refundRequest = {
    amount: {
      currencyCode: payment.currency.toUpperCase(),
      value: (refundAmount / 100).toFixed(2), // Convert cents to currency units
    },
    noteToPayer: reason || "Refund processed",
  };

  const response = await paymentsController.refundCapturedPayment({
    captureId: payment.paypalCaptureId,
    body: refundRequest,
    prefer: "return=representation", // Get full refund details back
  });

  const refundResult = response.result;

  return {
    id: refundResult.id || "unknown",
    amount: parseFloat(refundResult.amount?.value || "0"),
    currency: refundResult.amount?.currencyCode?.toLowerCase() || payment.currency,
    status: refundResult.status?.toLowerCase() || "completed",
    provider: "paypal" as const,
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can process refunds" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = refundSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { bookingId, amount, reason } = validationResult.data;

    // Get the payment
    const payment = await prisma.payment.findUnique({
      where: { bookingId },
      include: {
        booking: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    if (payment.status !== "SUCCEEDED") {
      return NextResponse.json(
        { error: "Can only refund successful payments" },
        { status: 400 }
      );
    }

    // Calculate refund amount (in cents)
    const refundAmount = amount
      ? Math.round(amount * 100)
      : Math.round(payment.amount * 100);

    const isFullRefund = refundAmount === Math.round(payment.amount * 100);

    let refundResult: {
      id: string;
      amount: number;
      currency: string;
      status: string;
      provider: "stripe" | "paypal";
    };

    // Process refund based on payment provider
    if (payment.provider === "paypal" && payment.paypalCaptureId) {
      refundResult = await processPayPalRefund(
        {
          id: payment.id,
          paypalCaptureId: payment.paypalCaptureId,
          amount: payment.amount,
          currency: payment.currency,
        },
        refundAmount,
        reason
      );
    } else if (payment.stripePaymentId) {
      refundResult = await processStripeRefund(
        {
          id: payment.id,
          stripePaymentId: payment.stripePaymentId,
          amount: payment.amount,
        },
        refundAmount,
        reason
      );
    } else {
      return NextResponse.json(
        { error: "No valid payment ID found for refund" },
        { status: 400 }
      );
    }

    // Update payment record
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: isFullRefund ? "REFUNDED" : "SUCCEEDED",
        refundedAmount: refundResult.amount,
        refundedAt: new Date(),
      },
    });

    // Update booking status if fully refunded
    if (isFullRefund) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancellationReason: reason || "Refunded by admin",
        },
      });
    }

    return NextResponse.json({
      message: "Refund processed successfully",
      refund: refundResult,
    });
  } catch (error) {
    console.error("Error processing refund:", error);
    return NextResponse.json(
      { error: "Failed to process refund" },
      { status: 500 }
    );
  }
}
