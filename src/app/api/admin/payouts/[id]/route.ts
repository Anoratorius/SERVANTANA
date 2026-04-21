import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["PROCESSING", "COMPLETED", "FAILED"]),
  stripePayoutId: z.string().optional(),
  failureReason: z.string().optional(),
});

// Update payout status (process/complete/fail)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (adminUser?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const validationResult = updateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    const { status, stripePayoutId, failureReason } = validationResult.data;

    const payout = await prisma.payout.findUnique({
      where: { id },
    });

    if (!payout) {
      return NextResponse.json(
        { error: "Payout not found" },
        { status: 404 }
      );
    }

    // Update payout
    const updateData: Record<string, unknown> = { status };

    if (status === "COMPLETED") {
      updateData.processedAt = new Date();
      if (stripePayoutId) {
        updateData.stripePayoutId = stripePayoutId;
      }
    }

    if (status === "FAILED") {
      updateData.failureReason = failureReason || "Payout failed";
    }

    // Use transaction for failed payouts to atomically revert earnings
    const updatedPayout = await prisma.$transaction(async (tx) => {
      if (status === "FAILED") {
        await tx.earning.updateMany({
          where: { payoutId: id },
          data: {
            status: "AVAILABLE",
            payoutId: null,
          },
        });
      }

      return tx.payout.update({
        where: { id },
        data: updateData,
        include: {
          worker: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });
    });

    return NextResponse.json({
      message: `Payout ${status.toLowerCase()}`,
      payout: updatedPayout,
    });
  } catch (error) {
    console.error("Error updating payout:", error);
    return NextResponse.json(
      { error: "Failed to update payout" },
      { status: 500 }
    );
  }
}
