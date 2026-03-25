import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const verifySchema = z.object({
  verified: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

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

    const validationResult = verifySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    const { verified, isActive } = validationResult.data;

    // Find cleaner profile by user ID
    const cleanerProfile = await prisma.cleanerProfile.findUnique({
      where: { userId: id },
    });

    if (!cleanerProfile) {
      return NextResponse.json(
        { error: "Worker profile not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, boolean> = {};
    if (verified !== undefined) updateData.verified = verified;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.cleanerProfile.update({
      where: { userId: id },
      data: updateData,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Determine message
    let message = "Worker updated successfully";
    if (verified !== undefined) {
      message = verified ? "Worker verified successfully" : "Worker verification revoked";
    }
    if (isActive !== undefined) {
      message = isActive ? "Worker reactivated successfully" : "Worker deactivated successfully";
    }

    return NextResponse.json({
      message,
      cleaner: updated,
    });
  } catch (error) {
    console.error("Error verifying cleaner:", error);
    return NextResponse.json(
      { error: "Failed to update verification status" },
      { status: 500 }
    );
  }
}
