import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe, formatAmountForStripe } from "@/lib/stripe";

/**
 * Create a PaymentIntent for mobile apps
 * Mobile apps use PaymentSheet which requires PaymentIntent + Customer + Ephemeral Key
 */
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

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            stripeCustomerId: true,
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

    // Check if already paid
    if (booking.payment?.status === "SUCCEEDED") {
      return NextResponse.json(
        { error: "This booking has already been paid" },
        { status: 400 }
      );
    }

    const stripeClient = stripe();

    // Get or create Stripe customer
    let stripeCustomerId = booking.customer.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripeClient.customers.create({
        email: booking.customer.email,
        name: `${booking.customer.firstName} ${booking.customer.lastName}`,
        metadata: {
          userId: booking.customer.id,
        },
      });
      stripeCustomerId = customer.id;

      // Save customer ID
      await prisma.user.update({
        where: { id: booking.customer.id },
        data: { stripeCustomerId: customer.id },
      });
    }

    // Create ephemeral key for the customer
    const ephemeralKey = await stripeClient.ephemeralKeys.create(
      { customer: stripeCustomerId },
      { apiVersion: "2024-12-18.acacia" }
    );

    // Create PaymentIntent
    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: formatAmountForStripe(booking.totalPrice, booking.currency),
      currency: booking.currency.toLowerCase(),
      customer: stripeCustomerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        bookingId: booking.id,
        customerId: booking.customerId,
        cleanerId: booking.cleanerId,
      },
      description: `${booking.service?.name || "Service"} - Booking with ${booking.cleaner?.firstName} ${booking.cleaner?.lastName}`,
    });

    // Create or update payment record
    await prisma.payment.upsert({
      where: { bookingId: booking.id },
      update: {
        provider: "stripe",
        stripePaymentIntentId: paymentIntent.id,
        amount: booking.totalPrice,
        currency: booking.currency,
        status: "PROCESSING",
        paymentMethod: "card",
      },
      create: {
        bookingId: booking.id,
        provider: "stripe",
        stripePaymentIntentId: paymentIntent.id,
        amount: booking.totalPrice,
        currency: booking.currency,
        status: "PROCESSING",
        paymentMethod: "card",
      },
    });

    return NextResponse.json({
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: stripeCustomerId,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
