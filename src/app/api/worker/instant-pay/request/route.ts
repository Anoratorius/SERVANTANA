import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMakeInstantPayout } from "@/lib/instant-pay/eligibility";
import {
  executeInstantPayout,
  executeMultipleInstantPayouts,
  getInstantPayoutHistory,
} from "@/lib/instant-pay/transfer";

/**
 * GET /api/worker/instant-pay/request
 * Get instant payout history
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

    const history = await getInstantPayoutHistory(workerId);

    return NextResponse.json(history);
  } catch (error) {
    console.error("Error getting instant payout history:", error);
    return NextResponse.json(
      { error: "Failed to get payout history" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/worker/instant-pay/request
 * Request instant payout
 *
 * Body: { earningIds: string[] } or { all: true }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workerId = session.user.id;
    const body = await request.json();

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

    // Get eligibility
    const eligibility = await prisma.instantPayEligibility.findUnique({
      where: { workerId },
    });

    if (!eligibility || !eligibility.instantPayEnabled) {
      return NextResponse.json(
        { error: "Instant pay not enabled. Please check eligibility." },
        { status: 403 }
      );
    }

    // Get earning IDs to process
    let earningIds: string[] = [];

    if (body.all) {
      // Get all available earnings
      const availableEarnings = await prisma.earning.findMany({
        where: {
          workerId,
          status: "AVAILABLE",
        },
        select: { id: true, amount: true },
      });
      earningIds = availableEarnings.map((e) => e.id);
    } else if (body.earningIds && Array.isArray(body.earningIds)) {
      earningIds = body.earningIds;
    } else if (body.earningId) {
      earningIds = [body.earningId];
    }

    if (earningIds.length === 0) {
      return NextResponse.json(
        { error: "No earnings specified for payout" },
        { status: 400 }
      );
    }

    // Verify all earnings belong to worker and are available
    const earnings = await prisma.earning.findMany({
      where: {
        id: { in: earningIds },
        workerId,
        status: "AVAILABLE",
      },
    });

    if (earnings.length !== earningIds.length) {
      return NextResponse.json(
        { error: "Some earnings not found, not yours, or not available" },
        { status: 400 }
      );
    }

    // Calculate total amount
    const totalAmount = earnings.reduce((sum, e) => sum + e.amount, 0);

    // Check daily limit
    const limitCheck = await canMakeInstantPayout(workerId, totalAmount);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: limitCheck.reason,
          remaining: limitCheck.remaining,
        },
        { status: 400 }
      );
    }

    // Execute payouts
    if (earningIds.length === 1) {
      const result = await executeInstantPayout(
        earningIds[0],
        workerId,
        eligibility.instantPayFeePercent
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        payout: {
          id: result.payoutId,
          stripeTransferId: result.stripeTransferId,
          amount: earnings[0].amount,
          fee: result.fee,
          netAmount: result.netAmount,
          currency: earnings[0].currency,
        },
      });
    } else {
      const result = await executeMultipleInstantPayouts(
        earningIds,
        workerId,
        eligibility.instantPayFeePercent
      );

      const successCount = result.results.filter((r) => r.success).length;
      const failedCount = result.results.filter((r) => !r.success).length;

      return NextResponse.json({
        success: result.success,
        summary: {
          requested: earningIds.length,
          successful: successCount,
          failed: failedCount,
          totalPaid: result.totalPaid,
          totalFees: result.totalFees,
        },
        results: result.results,
      });
    }
  } catch (error) {
    console.error("Error processing instant payout:", error);
    return NextResponse.json(
      { error: "Failed to process instant payout" },
      { status: 500 }
    );
  }
}
