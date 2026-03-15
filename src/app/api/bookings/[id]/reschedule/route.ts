import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canReschedule,
  getHoursUntilBooking,
  isRescheduleFree,
} from "@/lib/booking-policies";

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
    const { newDate, newTime, reason } = body;

    if (!newDate || !newTime) {
      return NextResponse.json(
        { error: "New date and time are required" },
        { status: 400 }
      );
    }

    // Validate newDate is a valid date
    const parsedNewDate = new Date(newDate);
    if (isNaN(parsedNewDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    // Validate newTime format (HH:MM)
    if (!/^\d{2}:\d{2}$/.test(newTime)) {
      return NextResponse.json(
        { error: "Invalid time format. Use HH:MM" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        changes: {
          where: { type: "RESCHEDULE" },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only customer or cleaner can request reschedule
    const isCustomer = booking.customerId === session.user.id;
    const isCleaner = booking.cleanerId === session.user.id;

    if (!isCustomer && !isCleaner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Calculate hours until booking
    const hoursUntilBooking = getHoursUntilBooking(
      booking.scheduledDate,
      booking.scheduledTime
    );

    // Check if reschedule is allowed
    const rescheduleCheck = canReschedule(
      booking.status,
      hoursUntilBooking,
      booking.changes.length
    );

    if (!rescheduleCheck.allowed) {
      return NextResponse.json(
        { error: rescheduleCheck.reason },
        { status: 400 }
      );
    }

    // If cleaner reschedules, auto-approve. If customer reschedules, needs cleaner approval
    const autoApprove = isCleaner;
    const isFree = isRescheduleFree(hoursUntilBooking);

    const bookingChange = await prisma.bookingChange.create({
      data: {
        bookingId: id,
        requesterId: session.user.id,
        type: "RESCHEDULE",
        status: autoApprove ? "AUTO_APPROVED" : "PENDING",
        reason,
        originalDate: booking.scheduledDate,
        originalTime: booking.scheduledTime,
        newDate: parsedNewDate,
        newTime,
        responderId: autoApprove ? session.user.id : undefined,
        respondedAt: autoApprove ? new Date() : undefined,
      },
    });

    // If auto-approved (cleaner requested), update booking immediately
    if (autoApprove) {
      await prisma.booking.update({
        where: { id },
        data: {
          scheduledDate: parsedNewDate,
          scheduledTime: newTime,
        },
      });
    }

    return NextResponse.json({
      change: bookingChange,
      autoApproved: autoApprove,
      isFree,
      message: autoApprove
        ? "Booking rescheduled successfully"
        : "Reschedule request sent to cleaner for approval",
    });
  } catch (error) {
    console.error("Error creating reschedule request:", error);
    return NextResponse.json(
      { error: "Failed to create reschedule request" },
      { status: 500 }
    );
  }
}
