import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  analyzeBookingPatterns,
  saveDetectedPatterns,
} from "@/lib/ai/booking-patterns";

/**
 * GET /api/ai/predict-booking
 * Get detected booking patterns for the current user
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get existing patterns from database
    const patterns = await prisma.bookingPattern.findMany({
      where: { customerId: session.user.id },
      include: {
        worker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        profession: {
          select: {
            id: true,
            name: true,
            emoji: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { confidence: "desc" },
    });

    // Get recent suggestions for context
    const recentSuggestions = await prisma.bookingSuggestion.findMany({
      where: {
        customerId: session.user.id,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Get booking stats for context
    const totalBookings = await prisma.booking.count({
      where: {
        customerId: session.user.id,
        status: "COMPLETED",
      },
    });

    return NextResponse.json({
      patterns,
      recentSuggestions,
      stats: {
        totalBookings,
        patternsDetected: patterns.length,
        highConfidencePatterns: patterns.filter((p) => p.confidence >= 70).length,
      },
    });
  } catch (error) {
    console.error("Error fetching booking patterns:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking patterns" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/predict-booking
 * Trigger pattern analysis for the current user
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { autoBookEnabled, notifyDaysBefore, patternId } = body;

    // If patternId is provided, update that pattern's settings
    if (patternId) {
      const pattern = await prisma.bookingPattern.findFirst({
        where: {
          id: patternId,
          customerId: session.user.id,
        },
      });

      if (!pattern) {
        return NextResponse.json({ error: "Pattern not found" }, { status: 404 });
      }

      const updatedPattern = await prisma.bookingPattern.update({
        where: { id: patternId },
        data: {
          ...(typeof autoBookEnabled === "boolean" && { autoBookEnabled }),
          ...(typeof notifyDaysBefore === "number" && { notifyDaysBefore }),
        },
      });

      return NextResponse.json({
        message: "Pattern settings updated",
        pattern: updatedPattern,
      });
    }

    // Otherwise, run full pattern analysis
    const analysis = await analyzeBookingPatterns(session.user.id);

    if (!analysis.hasEnoughData) {
      return NextResponse.json({
        message: "Not enough booking history to detect patterns",
        analysis: {
          totalBookings: analysis.totalBookings,
          analyzedPeriodDays: analysis.analyzedPeriodDays,
          minimumRequired: 3,
        },
        patterns: [],
      });
    }

    // Save detected patterns
    await saveDetectedPatterns(session.user.id, analysis.patterns);

    // Fetch the saved patterns with relations
    const savedPatterns = await prisma.bookingPattern.findMany({
      where: { customerId: session.user.id },
      include: {
        worker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        profession: {
          select: {
            id: true,
            name: true,
            emoji: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { confidence: "desc" },
    });

    return NextResponse.json({
      message: "Pattern analysis complete",
      analysis: {
        totalBookings: analysis.totalBookings,
        analyzedPeriodDays: analysis.analyzedPeriodDays,
        patternsDetected: analysis.patterns.length,
      },
      patterns: savedPatterns,
    });
  } catch (error) {
    console.error("Error analyzing booking patterns:", error);
    return NextResponse.json(
      { error: "Failed to analyze booking patterns" },
      { status: 500 }
    );
  }
}
