import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canCancel,
  calculateRefundAmount,
  getHoursUntilBooking,
} from "@/lib/booking-policies";
import { sendNotification } from "@/lib/notifications";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        payment: true,
        customer: {
          select: { firstName: true, lastName: true },
        },
        cleaner: {
          select: { firstName: true, lastName: true },
        },
        service: {
          select: { name: true },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only customer or worker can cancel
    const isCustomer = booking.customerId === session.user.id;
    const isWorker = booking.cleanerId === session.user.id;

    if (!isCustomer && !isWorker) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Calculate hours until booking
    const hoursUntilBooking = getHoursUntilBooking(
      booking.scheduledDate,
      booking.scheduledTime
    );

    // Check if cancellation is allowed
    const cancelCheck = canCancel(booking.status, hoursUntilBooking);

    if (!cancelCheck.allowed) {
      return NextResponse.json({ error: cancelCheck.reason }, { status: 400 });
    }

    // Calculate refund (only applies if customer cancels)
    const refund = isCustomer
      ? calculateRefundAmount(booking.totalPrice, hoursUntilBooking)
      : { amount: booking.totalPrice, percent: 100, reason: "Worker cancelled - full refund" };

    // If worker cancels, always full refund to customer
    // If customer cancels, refund based on policy

    const bookingChange = await prisma.bookingChange.create({
      data: {
        bookingId: id,
        requesterId: session.user.id,
        type: "CANCEL",
        status: "AUTO_APPROVED", // Cancellations are immediate
        reason,
        refundAmount: refund.amount,
        refundPercent: refund.percent,
        responderId: session.user.id,
        respondedAt: new Date(),
      },
    });

    // Update booking status to cancelled
    await prisma.booking.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: reason,
        // Track who cancelled
        ...(isWorker && { cancelledByCleaner: true }),
      },
    });

    // If payment exists and refund amount > 0, update payment status
    if (booking.payment && refund.amount > 0) {
      await prisma.payment.update({
        where: { id: booking.payment.id },
        data: {
          status: "REFUNDED",
          refundedAmount: refund.amount,
          refundedAt: new Date(),
        },
      });
    }

    // If worker cancelled, provide substitute URL for customer
    const substituteUrl = isWorker ? `/bookings/${id}/substitutes` : null;

    // Notify the other party about the cancellation
    const notificationData = {
      bookingId: id,
      workerName: `${booking.cleaner.firstName} ${booking.cleaner.lastName}`,
      customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
      serviceName: booking.service?.name || "Service",
      scheduledDate: booking.scheduledDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
      scheduledTime: booking.scheduledTime,
      reason: reason || undefined,
    };

    if (isWorker) {
      // Worker cancelled - notify customer
      sendNotification(booking.customerId, "BOOKING_CANCELLED", {
        ...notificationData,
        otherPartyName: notificationData.workerName,
      }, {
        actionUrl: substituteUrl || `/bookings`,
      }).catch(console.error);
    } else {
      // Customer cancelled - notify worker
      sendNotification(booking.cleanerId, "BOOKING_CANCELLED", {
        ...notificationData,
        otherPartyName: notificationData.customerName,
      }, {
        actionUrl: `/bookings`,
      }).catch(console.error);
    }

    return NextResponse.json({
      change: bookingChange,
      refund: {
        amount: refund.amount,
        percent: refund.percent,
        reason: refund.reason,
      },
      message: "Booking cancelled successfully",
      cancelledByCleaner: isWorker,
      substituteUrl,
    });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 }
    );
  }
}

// GET endpoint to preview cancellation (refund calculation)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only customer or worker can view
    if (
      booking.customerId !== session.user.id &&
      booking.cleanerId !== session.user.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hoursUntilBooking = getHoursUntilBooking(
      booking.scheduledDate,
      booking.scheduledTime
    );

    const cancelCheck = canCancel(booking.status, hoursUntilBooking);
    const refund = calculateRefundAmount(booking.totalPrice, hoursUntilBooking);

    return NextResponse.json({
      canCancel: cancelCheck.allowed,
      cancelReason: cancelCheck.reason,
      hoursUntilBooking: Math.round(hoursUntilBooking * 10) / 10,
      refund: {
        amount: refund.amount,
        percent: refund.percent,
        reason: refund.reason,
      },
      totalPrice: booking.totalPrice,
    });
  } catch (error) {
    console.error("Error calculating cancellation:", error);
    return NextResponse.json(
      { error: "Failed to calculate cancellation" },
      { status: 500 }
    );
  }
}
