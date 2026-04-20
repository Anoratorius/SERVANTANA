import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { applyRateLimit } from "@/lib/rate-limit";

// GET - fetch all approved professions (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");

    const where: Record<string, unknown> = {
      status: "APPROVED",
      isActive: true,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const professions = await prisma.profession.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, nameDE: true, emoji: true },
        },
        _count: {
          select: { workers: true },
        },
      },
      orderBy: { name: "asc" },
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

const suggestProfessionSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  nameDE: z.string().optional(),
  emoji: z.string().optional(),
  categoryId: z.string().optional(),
});

// POST - worker suggests a new profession
export async function POST(request: NextRequest) {
  // Rate limiting: 3 suggestions per hour
  const rateLimited = await applyRateLimit(request, "suggestProfession");
  if (rateLimited) return rateLimited;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = suggestProfessionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { name, nameDE, emoji, categoryId } = validation.data;

    // Check if profession already exists
    const existing = await prisma.profession.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });

    if (existing) {
      // If it exists and is approved, return it
      if (existing.status === "APPROVED") {
        return NextResponse.json(existing);
      }
      // If pending, let them know
      return NextResponse.json(
        { error: "This profession is pending approval" },
        { status: 400 }
      );
    }

    // Create new profession suggestion
    const profession = await prisma.profession.create({
      data: {
        name: name.trim(),
        nameDE: nameDE?.trim() || null,
        emoji: emoji || "👤",
        categoryId: categoryId || null,
        status: "PENDING",
        submittedBy: session.user.id,
      },
    });

    return NextResponse.json(profession, { status: 201 });
  } catch (error) {
    console.error("Failed to suggest profession:", error);
    return NextResponse.json(
      { error: "Failed to suggest profession" },
      { status: 500 }
    );
  }
}
