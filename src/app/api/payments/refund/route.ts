import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { z } from "zod";
import type Stripe from "stripe";

const refundSchema = z.object({
  bookingId: z.string(),
  amount: z.number().optional(), // Optional for partial refunds
  reason: z.string().optional(),
});

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

    if (!payment.stripePaymentId) {
      return NextResponse.json(
        { error: "No Stripe payment ID found" },
        { status: 400 }
      );
    }

    // Calculate refund amount (in cents)
    const refundAmount = amount
      ? Math.round(amount * 100)
      : Math.round(payment.amount * 100);

    // Create refund in Stripe
    const refund = await stripe().refunds.create({
      payment_intent: payment.stripePaymentId,
      amount: refundAmount,
      reason: reason as Stripe.RefundCreateParams.Reason || "requested_by_customer",
    });

    // Update payment record
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: refund.amount === Math.round(payment.amount * 100) ? "REFUNDED" : "SUCCEEDED",
        refundedAmount: refund.amount / 100,
        refundedAt: new Date(),
      },
    });

    // Update booking status if fully refunded
    if (refund.amount === Math.round(payment.amount * 100)) {
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
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency,
        status: refund.status,
      },
    });
  } catch (error) {
    console.error("Error processing refund:", error);
    return NextResponse.json(
      { error: "Failed to process refund" },
      { status: 500 }
    );
  }
}
