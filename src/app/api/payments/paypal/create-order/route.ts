import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrdersController } from "@/lib/paypal";
import { calculateFees } from "@/lib/fees";
import {
  CheckoutPaymentIntent,
  OrderRequest,
  OrderApplicationContextLandingPage,
  OrderApplicationContextUserAction,
  OrderApplicationContextShippingPreference,
} from "@paypal/paypal-server-sdk";

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

    const ordersController = getOrdersController();

    // Calculate fees (same as Stripe)
    const currency = booking.currency || "EUR";
    const fees = calculateFees(booking.totalPrice, currency);

    console.log("PayPal fees breakdown:", {
      bookingPrice: booking.totalPrice,
      customerTotal: fees.customerTotal,
      fixedFee: fees.customerFixedFee,
      percentageFee: fees.customerPercentageFee,
      currency,
    });

    // Create PayPal order with fees included
    const orderRequest: OrderRequest = {
      intent: CheckoutPaymentIntent.Capture,
      purchaseUnits: [
        {
          amount: {
            currencyCode: currency,
            value: fees.customerTotal.toFixed(2),
          },
          description: `${booking.service?.name || "Cleaning"} Service with ${booking.cleaner?.firstName || ""} ${booking.cleaner?.lastName || ""}`,
          customId: bookingId,
          referenceId: bookingId,
        },
      ],
      applicationContext: {
        brandName: "Servantana",
        landingPage: OrderApplicationContextLandingPage.Login,
        userAction: OrderApplicationContextUserAction.PayNow,
        shippingPreference: OrderApplicationContextShippingPreference.NoShipping,
      },
    };

    const { result, statusCode } = await ordersController.createOrder({
      body: orderRequest,
    });

    if (statusCode !== 201 || !result) {
      throw new Error("Failed to create PayPal order");
    }

    // Create or update payment record with fee breakdown
    await prisma.payment.upsert({
      where: { bookingId: booking.id },
      update: {
        provider: "paypal",
        stripeSessionId: null,
        stripePaymentId: null,
        paypalOrderId: result.id,
        amount: fees.customerTotal,
        bookingAmount: booking.totalPrice,
        customerFee: fees.customerFixedFee + fees.customerPercentageFee,
        cleanerFee: fees.workerFixedFee + fees.workerPercentageFee,
        platformFee: fees.platformTotal,
        cleanerPayout: fees.workerReceives,
        currency,
        status: "PROCESSING",
        paymentMethod: "paypal",
      },
      create: {
        bookingId: booking.id,
        provider: "paypal",
        paypalOrderId: result.id,
        amount: fees.customerTotal,
        bookingAmount: booking.totalPrice,
        customerFee: fees.customerFixedFee + fees.customerPercentageFee,
        cleanerFee: fees.workerFixedFee + fees.workerPercentageFee,
        platformFee: fees.platformTotal,
        cleanerPayout: fees.workerReceives,
        currency,
        status: "PROCESSING",
        paymentMethod: "paypal",
      },
    });

    return NextResponse.json({
      orderId: result.id,
      status: result.status,
    });
  } catch (error) {
    console.error("Error creating PayPal order:", error);
    return NextResponse.json(
      { error: "Failed to create PayPal order" },
      { status: 500 }
    );
  }
}
