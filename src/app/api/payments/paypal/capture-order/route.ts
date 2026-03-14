import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrdersController } from "@/lib/paypal";
import { PLATFORM_FEE_PERCENT, EARNINGS_HOLD_DAYS } from "@/lib/payment-config";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, bookingId } = body;

    if (!orderId || !bookingId) {
      return NextResponse.json(
        { error: "Order ID and Booking ID are required" },
        { status: 400 }
      );
    }

    // Verify booking exists and belongs to user
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payment: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.customerId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only pay for your own bookings" },
        { status: 403 }
      );
    }

    const ordersController = getOrdersController();

    // Capture the PayPal order
    const { result, statusCode } = await ordersController.captureOrder({
      id: orderId,
    });

    if (statusCode !== 201 || !result) {
      throw new Error("Failed to capture PayPal order");
    }

    const captureStatus = result.status;
    const captureId =
      result.purchaseUnits?.[0]?.payments?.captures?.[0]?.id;

    if (captureStatus === "COMPLETED") {
      // Check for duplicate earning
      const existingEarning = await prisma.earning.findUnique({
        where: { bookingId },
      });

      const grossAmount = booking.totalPrice;
      const platformFee = grossAmount * PLATFORM_FEE_PERCENT;
      const netAmount = grossAmount - platformFee;

      const availableAt = new Date();
      availableAt.setDate(availableAt.getDate() + EARNINGS_HOLD_DAYS);

      // Use transaction for atomicity
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { bookingId: booking.id },
          data: {
            paypalCaptureId: captureId,
            status: "SUCCEEDED",
            paymentMethod: "paypal",
          },
        });

        await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: "CONFIRMED",
            confirmedAt: new Date(),
          },
        });

        if (!existingEarning) {
          await tx.earning.create({
            data: {
              cleanerId: booking.cleanerId,
              bookingId: bookingId,
              amount: netAmount,
              platformFee: platformFee,
              grossAmount: grossAmount,
              currency: booking.currency,
              status: "PENDING",
              availableAt: availableAt,
            },
          });
        }
      });

      return NextResponse.json({
        success: true,
        status: captureStatus,
        message: "Payment captured successfully",
      });
    } else {
      // Payment not completed
      await prisma.payment.update({
        where: { bookingId: booking.id },
        data: {
          status: "FAILED",
          failureReason: `PayPal status: ${captureStatus}`,
        },
      });

      return NextResponse.json(
        { error: `Payment not completed. Status: ${captureStatus}` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error capturing PayPal order:", error);
    return NextResponse.json(
      { error: "Failed to capture PayPal payment" },
      { status: 500 }
    );
  }
}
