import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PayoutStatus, Role } from "@prisma/client";
import { createTransfer } from "@/lib/stripe";
import { createSinglePayout } from "@/lib/paypal-payouts";

// Secret key for cron jobs (set in environment)
const CRON_SECRET = process.env.CRON_SECRET;

// Get all payouts for admin
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (adminUser?.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as PayoutStatus | null;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status && status !== ("all" as unknown)) {
      where.status = status;
    }

    const [payouts, total] = await Promise.all([
      prisma.payout.findMany({
        where,
        include: {
          worker: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          earnings: {
            select: {
              id: true,
              amount: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.payout.count({ where }),
    ]);

    // Get summary stats
    const stats = await prisma.payout.groupBy({
      by: ["status"],
      _sum: { amount: true },
      _count: true,
    });

    // Get pending earnings (ready for payout)
    const pendingEarnings = await prisma.earning.aggregate({
      where: {
        status: "PENDING",
        availableAt: { lte: new Date() },
      },
      _sum: { amount: true },
      _count: true,
    });

    return NextResponse.json({
      payouts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: stats.reduce((acc, s) => {
        acc[s.status] = { count: s._count, total: s._sum.amount || 0 };
        return acc;
      }, {} as Record<string, { count: number; total: number }>),
      pendingEarnings: {
        count: pendingEarnings._count,
        total: pendingEarnings._sum.amount || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching payouts:", error);
    return NextResponse.json(
      { error: "Failed to fetch payouts" },
      { status: 500 }
    );
  }
}

/**
 * POST: Process payouts (called by cron on 1st and 15th, or manually by admin)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization (either admin session or cron secret)
    const authHeader = request.headers.get("authorization");
    const isCronJob = authHeader === `Bearer ${CRON_SECRET}` && CRON_SECRET;

    if (!isCronJob) {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
      });

      if (user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
      }
    }

    // Get all earnings that are ready for payout
    const pendingEarnings = await prisma.earning.findMany({
      where: {
        status: "PENDING",
        availableAt: { lte: new Date() },
      },
      include: {
        worker: {
          include: {
            workerProfile: {
              select: {
                paypalEmail: true,
                stripeAccountId: true,
                stripeOnboardingComplete: true,
              },
            },
          },
        },
      },
    });

    if (pendingEarnings.length === 0) {
      return NextResponse.json({
        message: "No pending payouts to process",
        processed: 0,
      });
    }

    // Group earnings by worker
    const workerEarnings = new Map<
      string,
      {
        worker: typeof pendingEarnings[0]["worker"];
        earnings: typeof pendingEarnings;
        totalAmount: number;
        currency: string;
      }
    >();

    for (const earning of pendingEarnings) {
      const workerId = earning.workerId;
      const existing = workerEarnings.get(workerId);

      if (existing) {
        existing.earnings.push(earning);
        existing.totalAmount += earning.amount;
      } else {
        workerEarnings.set(workerId, {
          worker: earning.worker,
          earnings: [earning],
          totalAmount: earning.amount,
          currency: earning.currency,
        });
      }
    }

    const results: Array<{
      workerId: string;
      workerName: string;
      amount: number;
      currency: string;
      method: "stripe" | "paypal" | "skipped";
      success: boolean;
      error?: string;
      payoutId?: string;
    }> = [];

    // Process each worker's payout
    for (const [workerId, data] of workerEarnings) {
      const { worker, earnings, totalAmount, currency } = data;
      const workerName = `${worker.firstName} ${worker.lastName}`;

      try {
        let payoutMethod: "stripe" | "paypal" | "skipped" = "skipped";
        let externalPayoutId: string | undefined;

        // Try Stripe first, then PayPal
        if (
          worker.workerProfile?.stripeAccountId &&
          worker.workerProfile?.stripeOnboardingComplete
        ) {
          // Pay via Stripe
          const transfer = await createTransfer({
            amount: totalAmount,
            currency,
            destinationAccountId: worker.workerProfile.stripeAccountId,
            description: `Servantana earnings payout - ${new Date().toISOString().split("T")[0]}`,
            metadata: {
              workerId,
              earningIds: earnings.map((e) => e.id).join(","),
            },
          });

          payoutMethod = "stripe";
          externalPayoutId = transfer.id;
        } else if (worker.workerProfile?.paypalEmail) {
          // Pay via PayPal
          const payout = await createSinglePayout(
            worker.workerProfile.paypalEmail,
            totalAmount,
            currency,
            `payout_${workerId}_${Date.now()}`,
            `Servantana earnings for ${earnings.length} booking(s)`
          );

          payoutMethod = "paypal";
          externalPayoutId = payout.batch_header.payout_batch_id;
        } else {
          // No payment method configured
          results.push({
            workerId,
            workerName,
            amount: totalAmount,
            currency,
            method: "skipped",
            success: false,
            error: "No payment method configured (need Stripe or PayPal)",
          });
          continue;
        }

        // Create payout record
        const payout = await prisma.payout.create({
          data: {
            workerId,
            amount: totalAmount,
            currency,
            status: "PROCESSING",
            payoutMethod,
            stripePayoutId: payoutMethod === "stripe" ? externalPayoutId : null,
            processedAt: new Date(),
          },
        });

        // Update earnings to link to payout and mark as paid out
        await prisma.earning.updateMany({
          where: { id: { in: earnings.map((e) => e.id) } },
          data: {
            status: "PAID_OUT",
            payoutId: payout.id,
          },
        });

        // Mark payout as completed
        await prisma.payout.update({
          where: { id: payout.id },
          data: { status: "COMPLETED" },
        });

        results.push({
          workerId,
          workerName,
          amount: totalAmount,
          currency,
          method: payoutMethod,
          success: true,
          payoutId: payout.id,
        });
      } catch (error) {
        console.error(`Payout failed for worker ${workerId}:`, error);
        results.push({
          workerId,
          workerName,
          amount: totalAmount,
          currency,
          method: "skipped",
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const totalPaid = results
      .filter((r) => r.success)
      .reduce((sum, r) => sum + r.amount, 0);

    return NextResponse.json({
      message: `Processed ${successCount}/${results.length} payouts`,
      processed: successCount,
      failed: results.length - successCount,
      totalPaid,
      results,
    });
  } catch (error) {
    console.error("Error processing payouts:", error);
    return NextResponse.json(
      { error: "Failed to process payouts" },
      { status: 500 }
    );
  }
}
