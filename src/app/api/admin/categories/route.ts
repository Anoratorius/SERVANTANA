import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { CategoryStatus } from "@prisma/client";
import { z } from "zod";

const createCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  nameDE: z.string().optional(),
  description: z.string().optional(),
  emoji: z.string().default("📁"),
  gradient: z.string().default("from-gray-400 to-gray-600"),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).default("APPROVED"),
});

// POST - create a new category (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = createCategorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { name, nameDE, description, emoji, gradient, status } = validation.data;

    // Check if category with same name exists
    const existing = await prisma.category.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Category with this name already exists" },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name,
        nameDE: nameDE || null,
        description: description || null,
        emoji,
        gradient,
        status: status as CategoryStatus,
        submittedBy: session.user.id,
        reviewedBy: status === "APPROVED" ? session.user.id : null,
        reviewedAt: status === "APPROVED" ? new Date() : null,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Failed to create category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}

// GET - fetch all categories for admin (including pending)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as CategoryStatus | null;

    const where = status ? { status } : {};

    const categories = await prisma.category.findMany({
      where,
      include: {
        professions: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
