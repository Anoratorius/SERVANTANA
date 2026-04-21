/**
 * Instant Pay Eligibility
 *
 * Calculate trust score and determine if worker qualifies for instant payouts.
 */

import { prisma } from "@/lib/prisma";

export interface EligibilityFactors {
  accountAgeDays: number;
  completedBookings: number;
  averageRating: number;
  verifiedDocuments: number;
  stripeOnboarded: boolean;
  chargebackCount: number;
  disputeCount: number;
}

export interface TrustScoreResult {
  trustScore: number; // 0-100
  factors: EligibilityFactors;
  breakdown: {
    accountAge: number;
    bookings: number;
    rating: number;
    documents: number;
    stripe: number;
    chargebacks: number;
    disputes: number;
  };
  eligible: boolean;
  tier: "none" | "standard" | "premium";
  feePercent: number;
  dailyLimit: number;
}

// Trust score factor weights
const WEIGHTS = {
  accountAge: 0.15, // 15%
  completedBookings: 0.25, // 25%
  averageRating: 0.20, // 20%
  verifiedDocuments: 0.15, // 15%
  stripeOnboarded: 0.10, // 10%
  noChargebacks: 0.10, // 10%
  noDisputes: 0.05, // 5%
};

// Thresholds
const THRESHOLDS = {
  accountAgeDays: 90, // 90 days for max score
  completedBookings: 20, // 20 bookings for max score
  averageRating: 4.5, // 4.5+ for max score
  verifiedDocuments: 3, // 3 documents for max score
};

// Tiers
const TIERS = {
  standard: { minScore: 70, feePercent: 1.5, dailyLimit: 500 },
  premium: { minScore: 85, feePercent: 1.0, dailyLimit: 1000 },
  enterprise: { minScore: 95, feePercent: 0.5, dailyLimit: 2500 },
};

/**
 * Calculate trust score for a worker
 */
export async function calculateTrustScore(
  workerId: string
): Promise<TrustScoreResult> {
  // Fetch worker data
  const worker = await prisma.user.findUnique({
    where: { id: workerId },
    include: {
      workerProfile: true,
      workerDocuments: {
        where: { status: "VERIFIED" },
      },
      bookingsAsWorker: {
        where: { status: "COMPLETED" },
        select: { id: true },
      },
      reviewsReceived: {
        select: { rating: true },
      },
      disputesAsWorker: {
        select: { id: true, resolution: true },
      },
      earnings: {
        where: { status: "PAID_OUT" },
        select: { id: true },
      },
    },
  });

  if (!worker || !worker.workerProfile) {
    return {
      trustScore: 0,
      factors: {
        accountAgeDays: 0,
        completedBookings: 0,
        averageRating: 0,
        verifiedDocuments: 0,
        stripeOnboarded: false,
        chargebackCount: 0,
        disputeCount: 0,
      },
      breakdown: {
        accountAge: 0,
        bookings: 0,
        rating: 0,
        documents: 0,
        stripe: 0,
        chargebacks: 0,
        disputes: 0,
      },
      eligible: false,
      tier: "none",
      feePercent: 0,
      dailyLimit: 0,
    };
  }

  // Calculate factors
  const accountAgeDays = Math.floor(
    (Date.now() - new Date(worker.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const completedBookings = worker.bookingsAsWorker.length;
  const averageRating =
    worker.reviewsReceived.length > 0
      ? worker.reviewsReceived.reduce((sum, r) => sum + r.rating, 0) /
        worker.reviewsReceived.length
      : 0;
  const verifiedDocuments = worker.workerDocuments.length;
  const stripeOnboarded = worker.workerProfile.stripeOnboardingComplete || false;

  // Count chargebacks (disputes resolved against worker)
  const chargebackCount = worker.disputesAsWorker.filter(
    (d) =>
      d.resolution === "FULL_REFUND" || d.resolution === "PARTIAL_REFUND"
  ).length;
  const disputeCount = worker.disputesAsWorker.length;

  const factors: EligibilityFactors = {
    accountAgeDays,
    completedBookings,
    averageRating,
    verifiedDocuments,
    stripeOnboarded,
    chargebackCount,
    disputeCount,
  };

  // Calculate individual scores (0-100)
  const breakdown = {
    accountAge: Math.min(100, (accountAgeDays / THRESHOLDS.accountAgeDays) * 100),
    bookings: Math.min(
      100,
      (completedBookings / THRESHOLDS.completedBookings) * 100
    ),
    rating:
      averageRating > 0
        ? Math.min(100, (averageRating / 5) * 100 * (averageRating >= THRESHOLDS.averageRating ? 1 : 0.8))
        : 0,
    documents: Math.min(
      100,
      (verifiedDocuments / THRESHOLDS.verifiedDocuments) * 100
    ),
    stripe: stripeOnboarded ? 100 : 0,
    chargebacks: chargebackCount === 0 ? 100 : Math.max(0, 100 - chargebackCount * 50),
    disputes: disputeCount === 0 ? 100 : Math.max(0, 100 - disputeCount * 25),
  };

  // Calculate weighted total
  const trustScore = Math.round(
    breakdown.accountAge * WEIGHTS.accountAge +
    breakdown.bookings * WEIGHTS.completedBookings +
    breakdown.rating * WEIGHTS.averageRating +
    breakdown.documents * WEIGHTS.verifiedDocuments +
    breakdown.stripe * WEIGHTS.stripeOnboarded +
    breakdown.chargebacks * WEIGHTS.noChargebacks +
    breakdown.disputes * WEIGHTS.noDisputes
  );

  // Determine tier
  let tier: "none" | "standard" | "premium" = "none";
  let feePercent = 0;
  let dailyLimit = 0;

  if (trustScore >= TIERS.enterprise.minScore && stripeOnboarded) {
    tier = "premium";
    feePercent = TIERS.enterprise.feePercent;
    dailyLimit = TIERS.enterprise.dailyLimit;
  } else if (trustScore >= TIERS.premium.minScore && stripeOnboarded) {
    tier = "premium";
    feePercent = TIERS.premium.feePercent;
    dailyLimit = TIERS.premium.dailyLimit;
  } else if (trustScore >= TIERS.standard.minScore && stripeOnboarded) {
    tier = "standard";
    feePercent = TIERS.standard.feePercent;
    dailyLimit = TIERS.standard.dailyLimit;
  }

  return {
    trustScore,
    factors,
    breakdown,
    eligible: tier !== "none",
    tier,
    feePercent,
    dailyLimit,
  };
}

/**
 * Update or create eligibility record
 */
export async function updateEligibility(workerId: string): Promise<void> {
  const result = await calculateTrustScore(workerId);

  await prisma.instantPayEligibility.upsert({
    where: { workerId },
    create: {
      workerId,
      trustScore: result.trustScore,
      completedBookings: result.factors.completedBookings,
      accountAgeDays: result.factors.accountAgeDays,
      instantPayEnabled: result.eligible,
      instantPayFeePercent: result.feePercent,
      dailyInstantLimit: result.dailyLimit,
      chargebackCount: result.factors.chargebackCount,
      usedToday: 0,
    },
    update: {
      trustScore: result.trustScore,
      completedBookings: result.factors.completedBookings,
      accountAgeDays: result.factors.accountAgeDays,
      instantPayEnabled: result.eligible,
      instantPayFeePercent: result.feePercent,
      dailyInstantLimit: result.dailyLimit,
      chargebackCount: result.factors.chargebackCount,
    },
  });
}

/**
 * Check if worker can make an instant payout of a given amount
 */
export async function canMakeInstantPayout(
  workerId: string,
  amount: number
): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  const eligibility = await prisma.instantPayEligibility.findUnique({
    where: { workerId },
  });

  if (!eligibility) {
    return { allowed: false, reason: "Instant pay not enabled" };
  }

  if (!eligibility.instantPayEnabled) {
    return { allowed: false, reason: "Instant pay not enabled for this account" };
  }

  // Check if limit needs reset (next day)
  const now = new Date();
  const shouldReset =
    !eligibility.limitResetAt ||
    now.toDateString() !== eligibility.limitResetAt.toDateString();

  const usedToday = shouldReset ? 0 : eligibility.usedToday;
  const remaining = eligibility.dailyInstantLimit - usedToday;

  if (amount > remaining) {
    return {
      allowed: false,
      reason: `Daily limit exceeded. Remaining: ${remaining.toFixed(2)}`,
      remaining,
    };
  }

  return { allowed: true, remaining };
}
