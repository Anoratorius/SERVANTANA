import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            email: true,
          },
        },
        cleaner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            email: true,
            workerProfile: {
              select: {
                stripeAccountId: true,
                stripeOnboardingComplete: true,
              },
            },
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
          },
        },
        review: true,
        payment: {
          select: {
            id: true,
            provider: true,
            status: true,
            amount: true,
            currency: true,
            receiptUrl: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only allow customer or worker to view the booking
    if (booking.customerId !== session.user.id && booking.cleanerId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if worker has Stripe Connect set up
    const workerHasStripe = Boolean(
      booking.cleaner.workerProfile?.stripeAccountId &&
      booking.cleaner.workerProfile?.stripeOnboardingComplete
    );

    return NextResponse.json({ booking, workerHasStripe });
  } catch (error) {
    console.error("Error fetching booking:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const { status } = body;

    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only customer or worker can modify booking
    const isCustomer = booking.customerId === session.user.id;
    const isWorker = booking.cleanerId === session.user.id;

    if (!isCustomer && !isWorker) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      PENDING: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["IN_PROGRESS", "CANCELLED"],
      IN_PROGRESS: ["COMPLETED", "CANCELLED"],
      COMPLETED: [],
      CANCELLED: [],
    };

    const allowedStatuses = validTransitions[booking.status];
    if (!allowedStatuses || !allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${booking.status} to ${status}` },
        { status: 400 }
      );
    }

    // Role-based permission checks
    if (status === "CONFIRMED" && !isWorker) {
      return NextResponse.json(
        { error: "Only the worker can confirm a booking" },
        { status: 403 }
      );
    }
    if (status === "IN_PROGRESS" && !isWorker) {
      return NextResponse.json(
        { error: "Only the worker can start a booking" },
        { status: 403 }
      );
    }
    if (status === "COMPLETED" && !isWorker) {
      return NextResponse.json(
        { error: "Only the worker can complete a booking" },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = { status };

    // Add timestamps based on status change
    if (status === "CONFIRMED") {
      updateData.confirmedAt = new Date();
    } else if (status === "IN_PROGRESS") {
      updateData.startedAt = new Date();
    } else if (status === "COMPLETED") {
      updateData.completedAt = new Date();
    } else if (status === "CANCELLED") {
      updateData.cancelledAt = new Date();
      updateData.cancellationReason = body.cancellationReason || null;
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        cleaner: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        service: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ booking: updatedBooking });
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
}
