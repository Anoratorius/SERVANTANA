import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { CategoryStatus } from "@prisma/client";

// GET - fetch all professions for admin (including pending)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as CategoryStatus | null;
    const categoryId = searchParams.get("categoryId");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;

    const professions = await prisma.profession.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, emoji: true },
        },
        _count: {
          select: { cleaners: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(professions);
  } catch (error) {
    console.error("Failed to fetch professions:", error);
    return NextResponse.json(
      { error: "Failed to fetch professions" },
      { status: 500 }
    );
  }
}

const createProfessionSchema = z.object({
  name: z.string().min(2),
  nameDE: z.string().optional(),
  emoji: z.string().default("👤"),
  categoryId: z.string().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).default("APPROVED"),
});

// POST - admin creates a new profession
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = createProfessionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { name, nameDE, emoji, categoryId, status } = validation.data;

    // Check for duplicates
    const existing = await prisma.profession.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Profession with this name already exists" },
        { status: 400 }
      );
    }

    const profession = await prisma.profession.create({
      data: {
        name: name.trim(),
        nameDE: nameDE?.trim() || null,
        emoji,
        categoryId: categoryId || null,
        status: status as CategoryStatus,
        submittedBy: session.user.id,
        reviewedBy: status === "APPROVED" ? session.user.id : null,
        reviewedAt: status === "APPROVED" ? new Date() : null,
      },
      include: {
        category: {
          select: { id: true, name: true, emoji: true },
        },
      },
    });

    return NextResponse.json(profession, { status: 201 });
  } catch (error) {
    console.error("Failed to create profession:", error);
    return NextResponse.json(
      { error: "Failed to create profession" },
      { status: 500 }
    );
  }
}
