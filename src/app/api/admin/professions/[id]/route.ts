import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { CategoryStatus } from "@prisma/client";

const updateProfessionSchema = z.object({
  name: z.string().min(2).optional(),
  nameDE: z.string().optional().nullable(),
  emoji: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  isActive: z.boolean().optional(),
});

// PATCH - update profession (edit or approve/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validation = updateProfessionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { name, nameDE, emoji, categoryId, status, isActive } = validation.data;

    // Check for duplicate name if changing
    if (name) {
      const existing = await prisma.profession.findFirst({
        where: {
          name: { equals: name, mode: "insensitive" },
          id: { not: id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Profession with this name already exists" },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name.trim();
    if (nameDE !== undefined) updateData.nameDE = nameDE?.trim() || null;
    if (emoji !== undefined) updateData.emoji = emoji;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (status !== undefined) {
      updateData.status = status as CategoryStatus;
      updateData.reviewedBy = session.user.id;
      updateData.reviewedAt = new Date();
    }

    const profession = await prisma.profession.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: { id: true, name: true, emoji: true },
        },
      },
    });

    return NextResponse.json(profession);
  } catch (error) {
    console.error("Failed to update profession:", error);
    return NextResponse.json(
      { error: "Failed to update profession" },
      { status: 500 }
    );
  }
}

// DELETE - delete profession
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if any workers have this profession
    const workerCount = await prisma.workerProfession.count({
      where: { professionId: id },
    });

    if (workerCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${workerCount} workers have this profession` },
        { status: 400 }
      );
    }

    await prisma.profession.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete profession:", error);
    return NextResponse.json(
      { error: "Failed to delete profession" },
      { status: 500 }
    );
  }
}
