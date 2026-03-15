import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DisputeResolution } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit-log";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, resolution, resolutionNote, refundAmount } = body;

    if (!["resolve", "close"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use 'resolve' or 'close'" },
        { status: 400 }
      );
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            payment: true,
          },
        },
      },
    });

    if (!dispute) {
      return NextResponse.json(
        { error: "Dispute not found" },
        { status: 404 }
      );
    }

    if (dispute.status === "CLOSED" || dispute.status === "RESOLVED") {
      return NextResponse.json(
        { error: "Dispute has already been resolved" },
        { status: 400 }
      );
    }

    if (action === "resolve") {
      // Validate resolution
      if (!resolution || !Object.values(DisputeResolution).includes(resolution)) {
        return NextResponse.json(
          { error: "Valid resolution is required" },
          { status: 400 }
        );
      }

      // Validate refund amount if applicable
      if (
        ["FULL_REFUND", "PARTIAL_REFUND"].includes(resolution) &&
        (refundAmount === undefined || refundAmount < 0)
      ) {
        return NextResponse.json(
          { error: "Valid refund amount is required for refund resolutions" },
          { status: 400 }
        );
      }

      const updateData: Record<string, unknown> = {
        status: "RESOLVED",
        resolution,
        resolutionNote,
        refundAmount: ["FULL_REFUND", "PARTIAL_REFUND"].includes(resolution)
          ? refundAmount
          : null,
        resolvedById: session.user.id,
        resolvedAt: new Date(),
      };

      const updatedDispute = await prisma.dispute.update({
        where: { id },
        data: updateData,
      });

      // Process refund if applicable
      if (
        ["FULL_REFUND", "PARTIAL_REFUND"].includes(resolution) &&
        refundAmount > 0 &&
        dispute.booking.payment
      ) {
        await prisma.payment.update({
          where: { id: dispute.booking.payment.id },
          data: {
            status: "REFUNDED",
            refundedAmount: refundAmount,
            refundedAt: new Date(),
          },
        });
      }

      // Audit log
      await writeAuditLog({
        action: "DISPUTE_RESOLVED",
        actorId: session.user.id,
        targetId: dispute.id,
        targetType: "Dispute",
        details: {
          resolution,
          refundAmount,
          bookingId: dispute.bookingId,
        },
      });

      return NextResponse.json({
        dispute: updatedDispute,
        message: "Dispute resolved successfully",
      });
    } else {
      // Close without resolution
      const updatedDispute = await prisma.dispute.update({
        where: { id },
        data: {
          status: "CLOSED",
          resolution: "DISMISSED",
          resolutionNote,
          resolvedById: session.user.id,
          resolvedAt: new Date(),
        },
      });

      await writeAuditLog({
        action: "DISPUTE_CLOSED",
        actorId: session.user.id,
        targetId: dispute.id,
        targetType: "Dispute",
        details: { bookingId: dispute.bookingId },
      });

      return NextResponse.json({
        dispute: updatedDispute,
        message: "Dispute closed",
      });
    }
  } catch (error) {
    console.error("Error updating dispute:", error);
    return NextResponse.json(
      { error: "Failed to update dispute" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        booking: {
          select: {
            id: true,
            scheduledDate: true,
            scheduledTime: true,
            totalPrice: true,
            status: true,
            address: true,
            service: { select: { name: true } },
            payment: {
              select: {
                status: true,
                amount: true,
                refundedAmount: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        cleaner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        resolvedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
                role: true,
              },
            },
          },
        },
        evidence: {
          orderBy: { createdAt: "desc" },
          include: {
            uploader: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!dispute) {
      return NextResponse.json(
        { error: "Dispute not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ dispute });
  } catch (error) {
    console.error("Error fetching dispute:", error);
    return NextResponse.json(
      { error: "Failed to fetch dispute" },
      { status: 500 }
    );
  }
}
