import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateClaimSchema = z.object({
  status: z.enum(["PENDING", "UNDER_REVIEW", "APPROVED", "DENIED", "RESOLVED"]).optional(),
  resolution: z.enum([
    "FULL_REFUND",
    "PARTIAL_REFUND",
    "SERVICE_CREDIT",
    "FREE_REBOOK",
    "NO_ACTION",
    "WORKER_WARNING",
    "WORKER_SUSPENDED",
  ]).optional(),
  resolutionNote: z.string().optional(),
  refundAmount: z.number().min(0).optional(),
});

// GET - Get specific claim details (admin)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const claim = await prisma.guaranteeClaim.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            service: true,
            review: true,
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
        worker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            workerProfile: {
              select: {
                verified: true,
                hourlyRate: true,
                experienceYears: true,
              },
            },
          },
        },
        resolvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    return NextResponse.json(claim);
  } catch (error) {
    console.error("Error fetching claim:", error);
    return NextResponse.json({ error: "Failed to fetch claim" }, { status: 500 });
  }
}

// PATCH - Update claim status/resolution (admin)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const validation = updateClaimSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { status, resolution, resolutionNote, refundAmount } = validation.data;

    const claim = await prisma.guaranteeClaim.findUnique({
      where: { id },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (status) {
      updateData.status = status;

      // If resolving, set resolution details
      if (status === "RESOLVED" || status === "APPROVED" || status === "DENIED") {
        updateData.resolvedAt = new Date();
        updateData.resolvedById = session.user.id;
      }
    }

    if (resolution) {
      updateData.resolution = resolution;
    }

    if (resolutionNote !== undefined) {
      updateData.resolutionNote = resolutionNote;
    }

    if (refundAmount !== undefined) {
      updateData.refundAmount = refundAmount;
    }

    const updatedClaim = await prisma.guaranteeClaim.update({
      where: { id },
      data: updateData,
      include: {
        booking: {
          select: {
            id: true,
            totalPrice: true,
          },
        },
        customer: {
          select: {
            id: true,
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
      },
    });

    // Log admin action
    await prisma.auditLog.create({
      data: {
        action: "GUARANTEE_CLAIM_UPDATE",
        actorId: session.user.id,
        targetId: id,
        targetType: "GUARANTEE_CLAIM",
        details: JSON.stringify({
          claimId: id,
          previousStatus: claim.status,
          newStatus: status,
          resolution,
          refundAmount,
        }),
        severity: "WARNING",
      },
    });

    return NextResponse.json(updatedClaim);
  } catch (error) {
    console.error("Error updating claim:", error);
    return NextResponse.json({ error: "Failed to update claim" }, { status: 500 });
  }
}
