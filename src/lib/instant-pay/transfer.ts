/**
 * Instant Pay Transfer
 *
 * Execute Stripe transfers to worker accounts.
 */

import { prisma } from "@/lib/prisma";
import { getStripe, formatAmountForStripe } from "@/lib/stripe";

export interface TransferResult {
  success: boolean;
  payoutId?: string;
  stripeTransferId?: string;
  netAmount?: number;
  fee?: number;
  error?: string;
}

/**
 * Execute instant payout for an earning
 */
export async function executeInstantPayout(
  earningId: string,
  workerId: string,
  feePercent: number
): Promise<TransferResult> {
  // Fetch earning and worker profile
  const [earning, workerProfile] = await Promise.all([
    prisma.earning.findUnique({
      where: { id: earningId },
      include: { booking: true },
    }),
    prisma.workerProfile.findUnique({
      where: { userId: workerId },
    }),
  ]);

  if (!earning) {
    return { success: false, error: "Earning not found" };
  }

  if (earning.workerId !== workerId) {
    return { success: false, error: "Earning does not belong to this worker" };
  }

  if (earning.status !== "AVAILABLE") {
    return { success: false, error: `Earning is not available (status: ${earning.status})` };
  }

  if (!workerProfile?.stripeAccountId) {
    return { success: false, error: "Worker has not connected Stripe account" };
  }

  if (!workerProfile.stripeOnboardingComplete) {
    return { success: false, error: "Worker Stripe onboarding not complete" };
  }

  // Calculate fee and net amount
  const fee = earning.amount * (feePercent / 100);
  const netAmount = earning.amount - fee;

  if (netAmount <= 0) {
    return { success: false, error: "Net amount after fee is zero or negative" };
  }

  // Create instant payout record (PENDING)
  const instantPayout = await prisma.instantPayout.create({
    data: {
      workerId,
      earningId,
      amount: earning.amount,
      fee,
      netAmount,
      currency: earning.currency,
      status: "PENDING",
    },
  });

  try {
    // Update to PROCESSING
    await prisma.instantPayout.update({
      where: { id: instantPayout.id },
      data: { status: "PROCESSING" },
    });

    // Execute Stripe transfer
    const transfer = await getStripe().transfers.create({
      amount: formatAmountForStripe(netAmount, earning.currency),
      currency: earning.currency.toLowerCase(),
      destination: workerProfile.stripeAccountId,
      transfer_group: `booking_${earning.bookingId}`,
      metadata: {
        earningId,
        bookingId: earning.bookingId,
        instantPay: "true",
        originalAmount: earning.amount.toString(),
        fee: fee.toString(),
        netAmount: netAmount.toString(),
      },
    });

    // Update payout as completed
    await prisma.$transaction([
      prisma.instantPayout.update({
        where: { id: instantPayout.id },
        data: {
          status: "COMPLETED",
          stripeTransferId: transfer.id,
          processedAt: new Date(),
        },
      }),
      // Mark earning as paid out
      prisma.earning.update({
        where: { id: earningId },
        data: { status: "PAID_OUT" },
      }),
      // Update daily usage
      prisma.instantPayEligibility.update({
        where: { workerId },
        data: {
          usedToday: { increment: netAmount },
          limitResetAt: new Date(),
        },
      }),
    ]);

    return {
      success: true,
      payoutId: instantPayout.id,
      stripeTransferId: transfer.id,
      netAmount,
      fee,
    };
  } catch (error) {
    // Update payout as failed
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    await prisma.instantPayout.update({
      where: { id: instantPayout.id },
      data: {
        status: "FAILED",
        failureReason: errorMessage,
      },
    });

    console.error("Instant payout failed:", error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Execute instant payout for multiple earnings at once
 */
export async function executeMultipleInstantPayouts(
  earningIds: string[],
  workerId: string,
  feePercent: number
): Promise<{
  success: boolean;
  results: TransferResult[];
  totalPaid: number;
  totalFees: number;
}> {
  const results: TransferResult[] = [];
  let totalPaid = 0;
  let totalFees = 0;

  for (const earningId of earningIds) {
    const result = await executeInstantPayout(earningId, workerId, feePercent);
    results.push(result);

    if (result.success && result.netAmount && result.fee) {
      totalPaid += result.netAmount;
      totalFees += result.fee;
    }
  }

  const allSuccess = results.every((r) => r.success);

  return {
    success: allSuccess,
    results,
    totalPaid,
    totalFees,
  };
}

/**
 * Get instant payout history for a worker
 */
export async function getInstantPayoutHistory(
  workerId: string,
  limit = 20
): Promise<{
  payouts: Array<{
    id: string;
    amount: number;
    fee: number;
    netAmount: number;
    status: string;
    createdAt: Date;
    processedAt: Date | null;
  }>;
  stats: {
    totalPaidOut: number;
    totalFees: number;
    payoutCount: number;
  };
}> {
  const payouts = await prisma.instantPayout.findMany({
    where: { workerId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const stats = await prisma.instantPayout.aggregate({
    where: { workerId, status: "COMPLETED" },
    _sum: { netAmount: true, fee: true },
    _count: true,
  });

  return {
    payouts: payouts.map((p) => ({
      id: p.id,
      amount: p.amount,
      fee: p.fee,
      netAmount: p.netAmount,
      status: p.status,
      createdAt: p.createdAt,
      processedAt: p.processedAt,
    })),
    stats: {
      totalPaidOut: stats._sum.netAmount || 0,
      totalFees: stats._sum.fee || 0,
      payoutCount: stats._count,
    },
  };
}
