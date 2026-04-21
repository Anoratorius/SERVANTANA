import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe, formatAmountForStripe } from "@/lib/stripe";

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
        worker: {
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
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
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

    // Create Stripe Checkout Session
    const origin = request.headers.get("origin") || process.env.NEXTAUTH_URL;
    const checkoutSession = await stripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: booking.currency.toLowerCase(),
            product_data: {
              name: `${booking.service?.name || "Cleaning"} Service`,
              description: `Booking with ${booking.worker?.firstName || ""} ${booking.worker?.lastName || ""} on ${new Date(booking.scheduledDate).toLocaleDateString()} at ${booking.scheduledTime}`,
            },
            unit_amount: formatAmountForStripe(booking.totalPrice, booking.currency),
          },
          quantity: 1,
        },
      ],
      customer_email: booking.customer.email,
      metadata: {
        bookingId: booking.id,
        customerId: booking.customerId,
        workerId: booking.workerId,
      },
      success_url: `${origin}/bookings/${booking.id}/confirmation?payment=success`,
      cancel_url: `${origin}/bookings/${booking.id}/confirmation?payment=cancelled`,
    });

    // Create or update payment record
    await prisma.payment.upsert({
      where: { bookingId: booking.id },
      update: {
        provider: "stripe",
        stripeSessionId: checkoutSession.id,
        paypalOrderId: null,
        paypalCaptureId: null,
        amount: booking.totalPrice,
        currency: booking.currency,
        status: "PROCESSING",
        paymentMethod: "card",
      },
      create: {
        bookingId: booking.id,
        provider: "stripe",
        stripeSessionId: checkoutSession.id,
        amount: booking.totalPrice,
        currency: booking.currency,
        status: "PROCESSING",
        paymentMethod: "card",
      },
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
