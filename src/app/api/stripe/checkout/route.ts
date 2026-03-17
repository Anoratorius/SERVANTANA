import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCheckoutSession, getCheckoutSession } from "@/lib/stripe";
import { calculateFees } from "@/lib/fees";

// POST: Create a checkout session for a booking
// Money goes to platform account, cleaner gets paid on 1st/15th
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    // Get booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
        cleaner: true,
        payment: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Verify the user is the customer for this booking
    if (booking.customerId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only pay for your own bookings" },
        { status: 403 }
      );
    }

    // Check if payment already exists and succeeded
    if (booking.payment?.status === "SUCCEEDED") {
      return NextResponse.json(
        { error: "This booking has already been paid" },
        { status: 400 }
      );
    }

    // Calculate fees
    const currency = booking.currency || "EUR";
    const fees = calculateFees(booking.totalPrice, currency);

    console.log("Checkout fees breakdown:", {
      bookingPrice: booking.totalPrice,
      customerTotal: fees.customerTotal,
      fixedFee: fees.customerFixedFee,
      percentageFee: fees.customerPercentageFee,
      currency,
    });

    // Create checkout session - money goes to platform
    const origin = request.headers.get("origin") || process.env.NEXTAUTH_URL;
    const successUrl = `${origin}/bookings/${bookingId}/confirmation?payment=success`;
    const cancelUrl = `${origin}/bookings/${bookingId}/confirmation?payment=cancelled`;

    const checkoutSession = await createCheckoutSession({
      bookingId,
      customerEmail: booking.customer.email,
      amountTotal: fees.customerTotal,
      currency,
      successUrl,
      cancelUrl,
      metadata: {
        customerId: booking.customerId,
        cleanerId: booking.cleanerId,
      },
    });

    // Create or update payment record
    if (booking.payment) {
      await prisma.payment.update({
        where: { id: booking.payment.id },
        data: {
          stripeSessionId: checkoutSession.id,
          amount: fees.customerTotal,
          bookingAmount: booking.totalPrice,
          customerFee: fees.customerFixedFee + fees.customerPercentageFee,
          cleanerFee: fees.cleanerFixedFee + fees.cleanerPercentageFee,
          platformFee: fees.platformTotal,
          cleanerPayout: fees.cleanerReceives,
          currency,
          status: "PROCESSING",
        },
      });
    } else {
      await prisma.payment.create({
        data: {
          bookingId,
          provider: "stripe",
          stripeSessionId: checkoutSession.id,
          amount: fees.customerTotal,
          bookingAmount: booking.totalPrice,
          customerFee: fees.customerFixedFee + fees.customerPercentageFee,
          cleanerFee: fees.cleanerFixedFee + fees.cleanerPercentageFee,
          platformFee: fees.platformTotal,
          cleanerPayout: fees.cleanerReceives,
          currency,
          status: "PROCESSING",
        },
      });
    }

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
      fees,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

// GET: Check payment status for a booking
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");
    const sessionId = searchParams.get("sessionId");

    if (!bookingId && !sessionId) {
      return NextResponse.json(
        { error: "Booking ID or Session ID is required" },
        { status: 400 }
      );
    }

    // If sessionId provided, get session details
    if (sessionId) {
      const checkoutSession = await getCheckoutSession(sessionId);

      return NextResponse.json({
        status: checkoutSession.payment_status,
        paymentStatus: checkoutSession.payment_status === "paid" ? "SUCCEEDED" : "PENDING",
        amountTotal: checkoutSession.amount_total,
        currency: checkoutSession.currency,
      });
    }

    // Get payment by booking ID
    const payment = await prisma.payment.findUnique({
      where: { bookingId: bookingId! },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      paidAt: payment.status === "SUCCEEDED" ? payment.updatedAt : null,
    });
  } catch (error) {
    console.error("Error checking payment status:", error);
    return NextResponse.json(
      { error: "Failed to check payment status" },
      { status: 500 }
    );
  }
}
