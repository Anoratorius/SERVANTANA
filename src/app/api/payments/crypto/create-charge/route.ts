import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCryptoCharge } from "@/lib/crypto";
import { calculateFees } from "@/lib/fees";

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

    // Get the booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        cleaner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        service: {
          select: {
            name: true,
          },
        },
        payment: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Verify the user is the customer
    if (booking.customerId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only pay for your own bookings" },
        { status: 403 }
      );
    }

    // Check if booking is already paid
    if (booking.payment?.status === "SUCCEEDED") {
      return NextResponse.json(
        { error: "This booking has already been paid" },
        { status: 400 }
      );
    }

    const origin = request.headers.get("origin") || process.env.NEXTAUTH_URL;

    // Calculate fees (same as Stripe/PayPal)
    const currency = booking.currency || "EUR";
    const fees = calculateFees(booking.totalPrice, currency);

    console.log("Crypto fees breakdown:", {
      bookingPrice: booking.totalPrice,
      customerTotal: fees.customerTotal,
      fixedFee: fees.customerFixedFee,
      percentageFee: fees.customerPercentageFee,
      currency,
    });

    // Create Coinbase Commerce charge with fees included
    const charge = await createCryptoCharge({
      name: `${booking.service?.name || "Cleaning"} Service`,
      description: `Booking with ${booking.cleaner?.firstName || ""} ${booking.cleaner?.lastName || ""} on ${new Date(booking.scheduledDate).toLocaleDateString()}`,
      pricing_type: "fixed_price",
      local_price: {
        amount: fees.customerTotal.toFixed(2),
        currency,
      },
      metadata: {
        bookingId: booking.id,
        customerId: booking.customerId,
        cleanerId: booking.cleanerId,
      },
      redirect_url: `${origin}/bookings/${booking.id}/confirmation?payment=success&method=crypto`,
      cancel_url: `${origin}/bookings/${booking.id}/confirmation?payment=cancelled`,
    });

    // Create or update payment record with fee breakdown
    await prisma.payment.upsert({
      where: { bookingId: booking.id },
      update: {
        provider: "crypto",
        stripeSessionId: null,
        stripePaymentId: null,
        paypalOrderId: null,
        paypalCaptureId: null,
        cryptoChargeId: charge.id,
        cryptoChargeCode: charge.code,
        amount: fees.customerTotal,
        bookingAmount: booking.totalPrice,
        customerFee: fees.customerFixedFee + fees.customerPercentageFee,
        cleanerFee: fees.workerFixedFee + fees.workerPercentageFee,
        platformFee: fees.platformTotal,
        cleanerPayout: fees.workerReceives,
        currency,
        status: "PROCESSING",
        paymentMethod: "crypto",
      },
      create: {
        bookingId: booking.id,
        provider: "crypto",
        cryptoChargeId: charge.id,
        cryptoChargeCode: charge.code,
        amount: fees.customerTotal,
        bookingAmount: booking.totalPrice,
        customerFee: fees.customerFixedFee + fees.customerPercentageFee,
        cleanerFee: fees.workerFixedFee + fees.workerPercentageFee,
        platformFee: fees.platformTotal,
        cleanerPayout: fees.workerReceives,
        currency,
        status: "PROCESSING",
        paymentMethod: "crypto",
      },
    });

    return NextResponse.json({
      chargeId: charge.id,
      chargeCode: charge.code,
      hostedUrl: charge.hosted_url,
      expiresAt: charge.expires_at,
      pricing: charge.pricing,
    });
  } catch (error) {
    console.error("Error creating crypto charge:", error);
    return NextResponse.json(
      { error: "Failed to create crypto payment" },
      { status: 500 }
    );
  }
}
