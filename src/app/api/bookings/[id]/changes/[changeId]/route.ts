import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; changeId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, changeId } = await params;
    const body = await request.json();
    const { action, responseNote } = body;

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    const change = await prisma.bookingChange.findUnique({
      where: { id: changeId },
      include: {
        booking: true,
      },
    });

    if (!change) {
      return NextResponse.json(
        { error: "Change request not found" },
        { status: 404 }
      );
    }

    if (change.bookingId !== id) {
      return NextResponse.json(
        { error: "Change request does not belong to this booking" },
        { status: 400 }
      );
    }

    if (change.status !== "PENDING") {
      return NextResponse.json(
        { error: "This change request has already been processed" },
        { status: 400 }
      );
    }

    // Only the other party can approve/reject (not the requester)
    const isCustomer = change.booking.customerId === session.user.id;
    const isWorker = change.booking.cleanerId === session.user.id;
    const isRequester = change.requesterId === session.user.id;

    if (!isCustomer && !isWorker) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isRequester) {
      return NextResponse.json(
        { error: "Cannot approve/reject your own request" },
        { status: 400 }
      );
    }

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

    const updatedChange = await prisma.bookingChange.update({
      where: { id: changeId },
      data: {
        status: newStatus,
        responderId: session.user.id,
        responseNote,
        respondedAt: new Date(),
      },
    });

    // If approved and it's a reschedule, update the booking
    if (action === "approve" && change.type === "RESCHEDULE") {
      await prisma.booking.update({
        where: { id },
        data: {
          scheduledDate: change.newDate!,
          scheduledTime: change.newTime!,
        },
      });
    }

    return NextResponse.json({
      change: updatedChange,
      message:
        action === "approve"
          ? "Change request approved"
          : "Change request rejected",
    });
  } catch (error) {
    console.error("Error processing change request:", error);
    return NextResponse.json(
      { error: "Failed to process change request" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; changeId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, changeId } = await params;

    const change = await prisma.bookingChange.findUnique({
      where: { id: changeId },
      include: {
        booking: {
          select: {
            id: true,
            customerId: true,
            cleanerId: true,
            scheduledDate: true,
            scheduledTime: true,
          },
        },
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        responder: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!change) {
      return NextResponse.json(
        { error: "Change request not found" },
        { status: 404 }
      );
    }

    if (change.bookingId !== id) {
      return NextResponse.json(
        { error: "Change request does not belong to this booking" },
        { status: 400 }
      );
    }

    // Only customer or worker can view
    if (
      change.booking.customerId !== session.user.id &&
      change.booking.cleanerId !== session.user.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ change });
  } catch (error) {
    console.error("Error fetching change request:", error);
    return NextResponse.json(
      { error: "Failed to fetch change request" },
      { status: 500 }
    );
  }
}
