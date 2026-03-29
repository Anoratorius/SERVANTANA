import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { applyRateLimit } from "@/lib/rate-limit";

// GET - fetch approved categories
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { status: "APPROVED" },
      include: {
        professions: {
          where: { isActive: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(categories, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

// POST - submit new category suggestion
export async function POST(request: NextRequest) {
  // Rate limiting: 3 suggestions per hour
  const rateLimited = applyRateLimit(request, "suggestCategory");
  if (rateLimited) return rateLimited;

  try {
    const session = await auth();
    const body = await request.json();

    const { name, nameDE, description, emoji } = body;

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        nameDE: nameDE?.trim() || null,
        description: description?.trim() || null,
        emoji: emoji || "📁",
        submittedBy: session?.user?.id || null,
        status: "PENDING",
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Failed to create category:", error);
    return NextResponse.json(
      { error: "Failed to submit category" },
      { status: 500 }
    );
  }
}
