import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateTrustScore,
  updateEligibility,
} from "@/lib/instant-pay/eligibility";

/**
 * GET /api/worker/instant-pay/eligibility
 * Get worker's instant pay eligibility status
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workerId = session.user.id;

    // Check if user is a worker
    const workerProfile = await prisma.workerProfile.findUnique({
      where: { userId: workerId },
    });

    if (!workerProfile) {
      return NextResponse.json(
        { error: "Worker profile not found" },
        { status: 404 }
      );
    }

    // Calculate current trust score
    const trustResult = await calculateTrustScore(workerId);

    // Get existing eligibility record
    const eligibility = await prisma.instantPayEligibility.findUnique({
      where: { workerId },
    });

    // Get available earnings
    const availableEarnings = await prisma.earning.findMany({
      where: {
        workerId,
        status: "AVAILABLE",
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        booking: {
          select: {
            id: true,
            scheduledDate: true,
          },
        },
      },
    });

    const totalAvailable = availableEarnings.reduce(
      (sum, e) => sum + e.amount,
      0
    );

    // Calculate remaining daily limit
    const now = new Date();
    const shouldResetLimit =
      !eligibility?.limitResetAt ||
      now.toDateString() !== eligibility.limitResetAt.toDateString();

    const usedToday = shouldResetLimit ? 0 : (eligibility?.usedToday || 0);
    const dailyLimit = trustResult.dailyLimit;
    const remainingLimit = Math.max(0, dailyLimit - usedToday);

    return NextResponse.json({
      eligible: trustResult.eligible,
      trustScore: trustResult.trustScore,
      tier: trustResult.tier,
      factors: trustResult.factors,
      breakdown: trustResult.breakdown,
      feePercent: trustResult.feePercent,
      limits: {
        dailyLimit,
        usedToday,
        remainingLimit,
      },
      availableEarnings: {
        count: availableEarnings.length,
        total: totalAvailable,
        earnings: availableEarnings,
      },
      stripeConnected: workerProfile.stripeOnboardingComplete || false,
      requirements: {
        stripeOnboarded: {
          met: workerProfile.stripeOnboardingComplete || false,
          required: true,
        },
        minTrustScore: {
          met: trustResult.trustScore >= 70,
          required: true,
          current: trustResult.trustScore,
          minimum: 70,
        },
      },
    });
  } catch (error) {
    console.error("Error getting instant pay eligibility:", error);
    return NextResponse.json(
      { error: "Failed to get eligibility" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/worker/instant-pay/eligibility
 * Update/recalculate eligibility
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workerId = session.user.id;

    // Check if user is a worker
    const workerProfile = await prisma.workerProfile.findUnique({
      where: { userId: workerId },
    });

    if (!workerProfile) {
      return NextResponse.json(
        { error: "Worker profile not found" },
        { status: 404 }
      );
    }

    // Update eligibility
    await updateEligibility(workerId);

    // Return updated status
    const trustResult = await calculateTrustScore(workerId);
    const eligibility = await prisma.instantPayEligibility.findUnique({
      where: { workerId },
    });

    return NextResponse.json({
      success: true,
      eligible: trustResult.eligible,
      trustScore: trustResult.trustScore,
      tier: trustResult.tier,
      eligibility,
    });
  } catch (error) {
    console.error("Error updating instant pay eligibility:", error);
    return NextResponse.json(
      { error: "Failed to update eligibility" },
      { status: 500 }
    );
  }
}
