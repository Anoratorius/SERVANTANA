import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        orderBy: [
          { status: "asc" }, // Open disputes first
          { createdAt: "desc" },
        ],
        skip,
        take: limit,
        include: {
          booking: {
            select: {
              scheduledDate: true,
              totalPrice: true,
              service: { select: { name: true } },
            },
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          worker: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              messages: true,
              evidence: true,
            },
          },
        },
      }),
      prisma.dispute.count({ where }),
    ]);

    // Get counts by status
    const [openCount, inReviewCount, resolvedCount, closedCount] = await Promise.all([
      prisma.dispute.count({ where: { status: "OPEN" } }),
      prisma.dispute.count({ where: { status: "IN_REVIEW" } }),
      prisma.dispute.count({ where: { status: "RESOLVED" } }),
      prisma.dispute.count({ where: { status: "CLOSED" } }),
    ]);

    return NextResponse.json({
      disputes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      counts: {
        open: openCount,
        inReview: inReviewCount,
        resolved: resolvedCount,
        closed: closedCount,
      },
    });
  } catch (error) {
    console.error("Error fetching disputes:", error);
    return NextResponse.json(
      { error: "Failed to fetch disputes" },
      { status: 500 }
    );
  }
}
