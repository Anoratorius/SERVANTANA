import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { CategoryStatus } from "@prisma/client";

const updateCategorySchema = z.object({
  name: z.string().min(2).optional(),
  nameDE: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  emoji: z.string().optional(),
  gradient: z.string().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

// PATCH - update category (edit details or approve/reject)
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
    const validation = updateCategorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { name, nameDE, description, emoji, gradient, status } = validation.data;

    // If name is being changed, check for duplicates
    if (name) {
      const existing = await prisma.category.findFirst({
        where: {
          name: { equals: name, mode: "insensitive" },
          id: { not: id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Category with this name already exists" },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (nameDE !== undefined) updateData.nameDE = nameDE;
    if (description !== undefined) updateData.description = description;
    if (emoji !== undefined) updateData.emoji = emoji;
    if (gradient !== undefined) updateData.gradient = gradient;

    if (status !== undefined) {
      updateData.status = status as CategoryStatus;
      updateData.reviewedBy = session.user.id;
      updateData.reviewedAt = new Date();
    }

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Failed to update category:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

// DELETE - delete category
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

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
