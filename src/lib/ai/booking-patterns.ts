/**
 * AI Booking Pattern Detection
 *
 * Analyzes customer booking history to detect patterns and predict future bookings.
 * Part of Feature 3: Predictive Auto-Booking
 */

import { prisma } from "@/lib/prisma";
import { BookingFrequency } from "@prisma/client";

export interface DetectedPattern {
  frequency: BookingFrequency;
  dayOfWeek: number | null; // 0-6 (Sunday-Saturday)
  dayOfMonth: number | null; // 1-31
  timeSlot: string | null; // "09:00" format
  confidence: number; // 0-100
  sampleSize: number;
  workerId: string | null;
  professionId: string | null;
  serviceId: string | null;
}

export interface PatternAnalysisResult {
  customerId: string;
  patterns: DetectedPattern[];
  hasEnoughData: boolean;
  totalBookings: number;
  analyzedPeriodDays: number;
}

/**
 * Analyze a customer's booking history to detect patterns
 */
export async function analyzeBookingPatterns(
  customerId: string
): Promise<PatternAnalysisResult> {
  // Get completed bookings from the last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const bookings = await prisma.booking.findMany({
    where: {
      customerId,
      status: "COMPLETED",
      scheduledDate: { gte: sixMonthsAgo },
    },
    include: {
      service: { select: { id: true, name: true, category: true } },
      worker: {
        select: {
          id: true,
          workerProfile: {
            select: {
              professions: {
                select: { professionId: true },
                where: { isPrimary: true },
              },
            },
          },
        },
      },
    },
    orderBy: { scheduledDate: "asc" },
  });

  const totalBookings = bookings.length;
  const analyzedPeriodDays = Math.ceil(
    (Date.now() - sixMonthsAgo.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Need at least 3 bookings to detect patterns
  if (totalBookings < 3) {
    return {
      customerId,
      patterns: [],
      hasEnoughData: false,
      totalBookings,
      analyzedPeriodDays,
    };
  }

  const patterns: DetectedPattern[] = [];

  // Group bookings by worker to find repeat relationships
  const workerBookings = new Map<string, typeof bookings>();
  for (const booking of bookings) {
    const existing = workerBookings.get(booking.workerId) || [];
    existing.push(booking);
    workerBookings.set(booking.workerId, existing);
  }

  // Analyze patterns for workers with multiple bookings
  for (const [workerId, workerBookingList] of workerBookings) {
    if (workerBookingList.length >= 2) {
      const workerPattern = detectFrequencyPattern(workerBookingList);
      if (workerPattern && workerPattern.confidence >= 50) {
        const primaryProfessionId =
          workerBookingList[0].worker.workerProfile?.professions[0]?.professionId || null;

        patterns.push({
          ...workerPattern,
          workerId,
          professionId: primaryProfessionId,
          serviceId: workerBookingList[0].serviceId,
        });
      }
    }
  }

  // Also analyze overall patterns regardless of worker
  if (totalBookings >= 3) {
    const overallPattern = detectFrequencyPattern(bookings);
    if (overallPattern && overallPattern.confidence >= 40) {
      // Only add if not already covered by a worker-specific pattern
      const existingWorkerPattern = patterns.find(
        (p) => p.frequency === overallPattern.frequency
      );
      if (!existingWorkerPattern || existingWorkerPattern.confidence < overallPattern.confidence) {
        patterns.push({
          ...overallPattern,
          workerId: null,
          professionId: null,
          serviceId: null,
        });
      }
    }
  }

  // Sort by confidence descending
  patterns.sort((a, b) => b.confidence - a.confidence);

  return {
    customerId,
    patterns,
    hasEnoughData: totalBookings >= 3,
    totalBookings,
    analyzedPeriodDays,
  };
}

/**
 * Detect frequency pattern from a list of bookings
 */
function detectFrequencyPattern(
  bookings: Array<{ scheduledDate: Date; scheduledTime: string }>
): Omit<DetectedPattern, "workerId" | "professionId" | "serviceId"> | null {
  if (bookings.length < 2) return null;

  // Calculate intervals between bookings (in days)
  const intervals: number[] = [];
  for (let i = 1; i < bookings.length; i++) {
    const prev = bookings[i - 1].scheduledDate;
    const curr = bookings[i].scheduledDate;
    const diffDays = Math.round(
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays > 0) {
      intervals.push(diffDays);
    }
  }

  if (intervals.length === 0) return null;

  // Calculate average interval
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

  // Determine frequency based on average interval
  const { frequency, confidence: freqConfidence } = detectFrequency(
    avgInterval,
    intervals
  );

  // Analyze day of week preference
  const dayOfWeekCounts = new Map<number, number>();
  for (const booking of bookings) {
    const day = booking.scheduledDate.getDay();
    dayOfWeekCounts.set(day, (dayOfWeekCounts.get(day) || 0) + 1);
  }

  let preferredDayOfWeek: number | null = null;
  let dayConfidence = 0;
  const maxDayCount = Math.max(...dayOfWeekCounts.values());
  if (maxDayCount >= 2) {
    for (const [day, count] of dayOfWeekCounts) {
      if (count === maxDayCount) {
        preferredDayOfWeek = day;
        dayConfidence = (count / bookings.length) * 100;
        break;
      }
    }
  }

  // Analyze day of month preference (for monthly patterns)
  let preferredDayOfMonth: number | null = null;
  if (frequency === "MONTHLY") {
    const dayOfMonthCounts = new Map<number, number>();
    for (const booking of bookings) {
      const day = booking.scheduledDate.getDate();
      dayOfMonthCounts.set(day, (dayOfMonthCounts.get(day) || 0) + 1);
    }

    const maxMonthDayCount = Math.max(...dayOfMonthCounts.values());
    if (maxMonthDayCount >= 2) {
      for (const [day, count] of dayOfMonthCounts) {
        if (count === maxMonthDayCount) {
          preferredDayOfMonth = day;
          break;
        }
      }
    }
  }

  // Analyze time slot preference
  const timeSlotCounts = new Map<string, number>();
  for (const booking of bookings) {
    // Round to nearest hour
    const time = booking.scheduledTime;
    const hour = time.split(":")[0];
    const roundedTime = `${hour}:00`;
    timeSlotCounts.set(roundedTime, (timeSlotCounts.get(roundedTime) || 0) + 1);
  }

  let preferredTimeSlot: string | null = null;
  let timeConfidence = 0;
  const maxTimeCount = Math.max(...timeSlotCounts.values());
  if (maxTimeCount >= 2) {
    for (const [time, count] of timeSlotCounts) {
      if (count === maxTimeCount) {
        preferredTimeSlot = time;
        timeConfidence = (count / bookings.length) * 100;
        break;
      }
    }
  }

  // Calculate overall confidence
  // Weight: frequency match (50%), day consistency (25%), time consistency (25%)
  const overallConfidence = Math.round(
    freqConfidence * 0.5 +
      dayConfidence * 0.25 +
      timeConfidence * 0.25
  );

  return {
    frequency,
    dayOfWeek: preferredDayOfWeek,
    dayOfMonth: preferredDayOfMonth,
    timeSlot: preferredTimeSlot,
    confidence: overallConfidence,
    sampleSize: bookings.length,
  };
}

/**
 * Detect booking frequency from average interval
 */
export function detectFrequency(
  avgInterval: number,
  intervals: number[]
): { frequency: BookingFrequency; confidence: number } {
  // Calculate standard deviation to measure consistency
  const variance =
    intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) /
    intervals.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / avgInterval;

  // Lower CV means more consistent intervals
  const consistencyBonus = Math.max(0, (1 - coefficientOfVariation) * 30);

  let frequency: BookingFrequency;
  let baseConfidence: number;

  if (avgInterval >= 5 && avgInterval <= 9) {
    // Weekly: 5-9 days average
    frequency = "WEEKLY";
    const deviation = Math.abs(avgInterval - 7);
    baseConfidence = Math.max(30, 70 - deviation * 10);
  } else if (avgInterval >= 12 && avgInterval <= 18) {
    // Biweekly: 12-18 days average
    frequency = "BIWEEKLY";
    const deviation = Math.abs(avgInterval - 14);
    baseConfidence = Math.max(30, 70 - deviation * 5);
  } else if (avgInterval >= 25 && avgInterval <= 35) {
    // Monthly: 25-35 days average
    frequency = "MONTHLY";
    const deviation = Math.abs(avgInterval - 30);
    baseConfidence = Math.max(30, 70 - deviation * 3);
  } else {
    // Custom/irregular
    frequency = "CUSTOM";
    baseConfidence = 40;
  }

  const confidence = Math.min(100, Math.round(baseConfidence + consistencyBonus));

  return { frequency, confidence };
}

/**
 * Calculate confidence score for a detected pattern
 */
export function calculateConfidence(
  sampleSize: number,
  intervalConsistency: number, // 0-1, how consistent the intervals are
  dayConsistency: number, // 0-1, how consistent the booking days are
  timeConsistency: number // 0-1, how consistent the booking times are
): number {
  // Base confidence from sample size (more data = more confidence)
  // 3 bookings = 30%, 5 = 50%, 10 = 80%, 15+ = 95%
  const sampleConfidence = Math.min(95, 10 + sampleSize * 8);

  // Weight the factors
  const weightedConfidence =
    sampleConfidence * 0.3 +
    intervalConsistency * 100 * 0.35 +
    dayConsistency * 100 * 0.2 +
    timeConsistency * 100 * 0.15;

  return Math.min(100, Math.round(weightedConfidence));
}

/**
 * Predict next booking date based on pattern
 */
export function predictNextBookingDate(
  lastBookingDate: Date,
  frequency: BookingFrequency,
  dayOfWeek: number | null,
  dayOfMonth: number | null
): Date {
  const nextDate = new Date(lastBookingDate);

  switch (frequency) {
    case "WEEKLY":
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case "BIWEEKLY":
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case "MONTHLY":
      nextDate.setMonth(nextDate.getMonth() + 1);
      if (dayOfMonth) {
        // Set to preferred day of month, handling month length
        const maxDay = new Date(
          nextDate.getFullYear(),
          nextDate.getMonth() + 1,
          0
        ).getDate();
        nextDate.setDate(Math.min(dayOfMonth, maxDay));
      }
      break;
    case "CUSTOM":
    default:
      // Default to 2 weeks for custom patterns
      nextDate.setDate(nextDate.getDate() + 14);
  }

  // Adjust to preferred day of week if specified
  if (dayOfWeek !== null && frequency !== "MONTHLY") {
    const currentDay = nextDate.getDay();
    const diff = dayOfWeek - currentDay;
    if (diff !== 0) {
      // Move to the closest occurrence of the preferred day
      if (diff > 0 && diff <= 3) {
        nextDate.setDate(nextDate.getDate() + diff);
      } else if (diff < 0 && diff >= -3) {
        nextDate.setDate(nextDate.getDate() + diff);
      } else if (diff > 3) {
        nextDate.setDate(nextDate.getDate() + diff - 7);
      } else {
        nextDate.setDate(nextDate.getDate() + diff + 7);
      }
    }
  }

  return nextDate;
}

/**
 * Save or update detected patterns in the database
 */
export async function saveDetectedPatterns(
  customerId: string,
  patterns: DetectedPattern[]
): Promise<void> {
  // Remove old patterns for this customer
  await prisma.bookingPattern.deleteMany({
    where: { customerId },
  });

  // Insert new patterns
  if (patterns.length > 0) {
    await prisma.bookingPattern.createMany({
      data: patterns.map((pattern) => ({
        customerId,
        frequency: pattern.frequency,
        dayOfWeek: pattern.dayOfWeek,
        dayOfMonth: pattern.dayOfMonth,
        timeSlot: pattern.timeSlot,
        confidence: pattern.confidence,
        sampleSize: pattern.sampleSize,
        workerId: pattern.workerId,
        professionId: pattern.professionId,
        serviceId: pattern.serviceId,
        autoBookEnabled: false, // User must explicitly enable
        notifyDaysBefore: 3,
      })),
    });
  }
}

/**
 * Get patterns that are ready for suggestions
 * (high confidence patterns where enough time has passed since last suggestion)
 */
export async function getPatternsReadyForSuggestion(
  minConfidence: number = 60
): Promise<
  Array<{
    pattern: Awaited<ReturnType<typeof prisma.bookingPattern.findFirst>>;
    predictedDate: Date;
  }>
> {
  const patterns = await prisma.bookingPattern.findMany({
    where: {
      confidence: { gte: minConfidence },
    },
    include: {
      customer: {
        select: {
          id: true,
          firstName: true,
          email: true,
        },
      },
    },
  });

  const ready: Array<{
    pattern: typeof patterns[0];
    predictedDate: Date;
  }> = [];

  const now = new Date();

  for (const pattern of patterns) {
    // Get the most recent booking for this customer (and worker if specified)
    const lastBooking = await prisma.booking.findFirst({
      where: {
        customerId: pattern.customerId,
        ...(pattern.workerId ? { workerId: pattern.workerId } : {}),
        status: { in: ["COMPLETED", "CONFIRMED", "PENDING"] },
      },
      orderBy: { scheduledDate: "desc" },
      select: { scheduledDate: true },
    });

    if (!lastBooking) continue;

    const predictedDate = predictNextBookingDate(
      lastBooking.scheduledDate,
      pattern.frequency,
      pattern.dayOfWeek,
      pattern.dayOfMonth
    );

    // Check if we should suggest now (notify X days before predicted date)
    const daysUntilPredicted = Math.ceil(
      (predictedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilPredicted <= pattern.notifyDaysBefore && daysUntilPredicted > 0) {
      // Check if we already have a pending suggestion for this pattern
      const existingSuggestion = await prisma.bookingSuggestion.findFirst({
        where: {
          patternId: pattern.id,
          status: "PENDING",
        },
      });

      if (!existingSuggestion) {
        ready.push({ pattern, predictedDate });
      }
    }
  }

  return ready;
}
