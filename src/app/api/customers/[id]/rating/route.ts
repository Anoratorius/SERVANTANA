import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get customer's average rating (visible only to workers)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only workers can view customer ratings
    if (session.user.role !== "WORKER") {
      return NextResponse.json(
        { error: "Only workers can view customer ratings" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const reviews = await prisma.customerReview.findMany({
      where: { customerId: id },
      select: {
        punctuality: true,
        cleanliness: true,
        communication: true,
        overall: true,
      },
    });

    if (reviews.length === 0) {
      return NextResponse.json({
        averageRating: null,
        totalReviews: 0,
        breakdown: null,
      });
    }

    // Calculate averages
    const totals = reviews.reduce(
      (acc, review) => ({
        punctuality: acc.punctuality + review.punctuality,
        cleanliness: acc.cleanliness + review.cleanliness,
        communication: acc.communication + review.communication,
        overall: acc.overall + review.overall,
      }),
      { punctuality: 0, cleanliness: 0, communication: 0, overall: 0 }
    );

    const count = reviews.length;
    const breakdown = {
      punctuality: Math.round((totals.punctuality / count) * 10) / 10,
      cleanliness: Math.round((totals.cleanliness / count) * 10) / 10,
      communication: Math.round((totals.communication / count) * 10) / 10,
      overall: Math.round((totals.overall / count) * 10) / 10,
    };

    const averageRating =
      Math.round(
        ((breakdown.punctuality +
          breakdown.cleanliness +
          breakdown.communication +
          breakdown.overall) /
          4) *
          10
      ) / 10;

    return NextResponse.json({
      averageRating,
      totalReviews: count,
      breakdown,
    });
  } catch (error) {
    console.error("Error fetching customer rating:", error);
    return NextResponse.json(
      { error: "Failed to fetch rating" },
      { status: 500 }
    );
  }
}
