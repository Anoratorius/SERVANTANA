import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { analyzeQuality } from "@/lib/ai/quality-scoring";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/bookings/[id]/quality-score
 * Get existing quality score for a booking
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId } = await params;

    // Verify access to booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        customerId: true,
        workerId: true,
        qualityScore: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only customer, worker, or admin can view
    const isParticipant =
      session.user.id === booking.customerId ||
      session.user.id === booking.workerId;
    const isAdmin = session.user.role === "ADMIN";

    if (!isParticipant && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!booking.qualityScore) {
      return NextResponse.json(
        { error: "No quality score found for this booking" },
        { status: 404 }
      );
    }

    return NextResponse.json(booking.qualityScore);
  } catch (error) {
    console.error("Error getting quality score:", error);
    return NextResponse.json(
      { error: "Failed to get quality score" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bookings/[id]/quality-score
 * Analyze photos and create quality score
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId } = await params;

    // Verify booking exists and get photos
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        photos: {
          orderBy: { createdAt: "asc" },
        },
        qualityScore: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only worker, customer, or admin can trigger scoring
    const isParticipant =
      session.user.id === booking.customerId ||
      session.user.id === booking.workerId;
    const isAdmin = session.user.role === "ADMIN";

    if (!isParticipant && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if score already exists
    if (booking.qualityScore) {
      return NextResponse.json(
        { error: "Quality score already exists", score: booking.qualityScore },
        { status: 409 }
      );
    }

    // Get before and after photos
    const beforePhotos = booking.photos.filter((p) => p.type === "before");
    const afterPhotos = booking.photos.filter((p) => p.type === "after");

    if (beforePhotos.length === 0) {
      return NextResponse.json(
        { error: "No before photos found" },
        { status: 400 }
      );
    }

    if (afterPhotos.length === 0) {
      return NextResponse.json(
        { error: "No after photos found" },
        { status: 400 }
      );
    }

    // Analyze quality
    const analysis = await analyzeQuality(
      beforePhotos.map((p) => p.fileUrl),
      afterPhotos.map((p) => p.fileUrl)
    );

    // Create quality score record
    const qualityScore = await prisma.qualityScore.create({
      data: {
        bookingId,
        beforeScore: analysis.beforeScore,
        afterScore: analysis.afterScore,
        improvementScore: analysis.improvementScore,
        metrics: analysis.metrics as object,
        qualityPassed: analysis.qualityPassed,
        aiAnalysis: analysis.aiAnalysis,
        concerns: analysis.concerns,
        highlights: analysis.highlights,
        beforePhotoIds: beforePhotos.map((p) => p.id),
        afterPhotoIds: afterPhotos.map((p) => p.id),
      },
    });

    // Update worker's average quality score if applicable
    if (analysis.qualityPassed) {
      await prisma.workerProfile.updateMany({
        where: { userId: booking.workerId },
        data: {
          // This would be calculated from all quality scores
          // For now, just track that they passed
        },
      });
    }

    return NextResponse.json({
      success: true,
      qualityScore,
      passed: analysis.qualityPassed,
    });
  } catch (error) {
    console.error("Error creating quality score:", error);
    return NextResponse.json(
      { error: "Failed to analyze quality" },
      { status: 500 }
    );
  }
}
