import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTransfer } from "@/lib/stripe";
import { createSinglePayout } from "@/lib/paypal-payouts";

/**
 * Cron endpoint for processing daily payouts at 5:55 AM local time
 *
 * Runs every 12 hours via external cron service (cron-job.org)
 * For each cleaner, checks if it's past 5:55 AM in their timezone
 * and they haven't been paid today - if so, pays them
 */

const CRON_SECRET = process.env.CRON_SECRET;
const PAYOUT_HOUR = 5;
const PAYOUT_MINUTE = 55;

/**
 * Check if it's past 5:55 AM in the given timezone today
 */
function isPastPayoutTime(timezone: string): boolean {
  try {
    const now = new Date();
    const localTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    const hour = localTime.getHours();
    const minute = localTime.getMinutes();

    // Check if current time is past 5:55 AM
    return hour > PAYOUT_HOUR || (hour === PAYOUT_HOUR && minute >= PAYOUT_MINUTE);
  } catch {
    return false;
  }
}

/**
 * Get today's date string in the cleaner's timezone (YYYY-MM-DD)
 */
function getTodayInTimezone(timezone: string): string {
  try {
    const now = new Date();
    const localTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    return localTime.toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");

  if (!CRON_SECRET) {
    console.error("CRON_SECRET not configured");
    return NextResponse.json({ error: "Cron not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log(`Daily payout job started at ${new Date().toISOString()}`);

    // Get all cleaners with pending earnings that are available
    const cleanersWithEarnings = await prisma.user.findMany({
      where: {
        role: "CLEANER",
        earnings: {
          some: {
            status: "PENDING",
            availableAt: { lte: new Date() },
          },
        },
      },
      include: {
        workerProfile: {
          select: {
            timezone: true,
            paypalEmail: true,
            stripeAccountId: true,
            stripeOnboardingComplete: true,
          },
        },
        earnings: {
          where: {
            status: "PENDING",
            availableAt: { lte: new Date() },
          },
        },
        payouts: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    // Filter to only cleaners where:
    // 1. It's past 5:55 AM in their timezone
    // 2. They haven't been paid today (in their timezone)
    const cleanersToPayOut = cleanersWithEarnings.filter((cleaner) => {
      const timezone = cleaner.workerProfile?.timezone || "UTC";

      // Check if it's past 5:55 AM in their timezone
      if (!isPastPayoutTime(timezone)) {
        return false;
      }

      // Check if they were already paid today
      const todayLocal = getTodayInTimezone(timezone);
      const lastPayout = cleaner.payouts[0];

      if (lastPayout) {
        const lastPayoutDate = new Date(
          lastPayout.createdAt.toLocaleString("en-US", { timeZone: timezone })
        ).toISOString().split("T")[0];

        if (lastPayoutDate === todayLocal) {
          return false; // Already paid today
        }
      }

      return true;
    });

    if (cleanersToPayOut.length === 0) {
      return NextResponse.json({
        message: "No cleaners ready for payout (not past 5:55 AM local time or already paid today)",
        checked: cleanersWithEarnings.length,
        processed: 0,
      });
    }

    const results: Array<{
      cleanerId: string;
      cleanerName: string;
      timezone: string;
      amount: number;
      currency: string;
      method: "stripe" | "paypal" | "skipped";
      success: boolean;
      error?: string;
    }> = [];

    // Process each cleaner's payout
    for (const cleaner of cleanersToPayOut) {
      const cleanerName = `${cleaner.firstName} ${cleaner.lastName}`;
      const earnings = cleaner.earnings;
      const timezone = cleaner.workerProfile?.timezone || "UTC";

      // Group earnings by currency
      const earningsByCurrency = new Map<string, typeof earnings>();
      for (const earning of earnings) {
        const existing = earningsByCurrency.get(earning.currency) || [];
        existing.push(earning);
        earningsByCurrency.set(earning.currency, existing);
      }

      // Process each currency separately
      for (const [currency, currencyEarnings] of earningsByCurrency) {
        const totalAmount = currencyEarnings.reduce((sum, e) => sum + e.amount, 0);

        try {
          let payoutMethod: "stripe" | "paypal" | "skipped" = "skipped";
          let externalPayoutId: string | undefined;

          // Try Stripe first, then PayPal
          if (
            cleaner.workerProfile?.stripeAccountId &&
            cleaner.workerProfile?.stripeOnboardingComplete
          ) {
            const transfer = await createTransfer({
              amount: totalAmount,
              currency,
              destinationAccountId: cleaner.workerProfile.stripeAccountId,
              description: `Servantana payout - ${new Date().toISOString().split("T")[0]}`,
              metadata: {
                cleanerId: cleaner.id,
                timezone,
                earningIds: currencyEarnings.map((e) => e.id).join(","),
              },
            });
            payoutMethod = "stripe";
            externalPayoutId = transfer.id;
          } else if (cleaner.workerProfile?.paypalEmail) {
            const payout = await createSinglePayout(
              cleaner.workerProfile.paypalEmail,
              totalAmount,
              currency,
              `payout_${cleaner.id}_${Date.now()}`,
              `Servantana earnings for ${currencyEarnings.length} booking(s)`
            );
            payoutMethod = "paypal";
            externalPayoutId = payout.batch_header.payout_batch_id;
          } else {
            results.push({
              cleanerId: cleaner.id,
              cleanerName,
              timezone,
              amount: totalAmount,
              currency,
              method: "skipped",
              success: false,
              error: "No payment method configured",
            });
            continue;
          }

          // Create payout record
          const payout = await prisma.payout.create({
            data: {
              cleanerId: cleaner.id,
              amount: totalAmount,
              currency,
              status: "COMPLETED",
              payoutMethod,
              stripePayoutId: payoutMethod === "stripe" ? externalPayoutId : null,
              processedAt: new Date(),
            },
          });

          // Update earnings
          await prisma.earning.updateMany({
            where: { id: { in: currencyEarnings.map((e) => e.id) } },
            data: {
              status: "PAID_OUT",
              payoutId: payout.id,
            },
          });

          results.push({
            cleanerId: cleaner.id,
            cleanerName,
            timezone,
            amount: totalAmount,
            currency,
            method: payoutMethod,
            success: true,
          });
        } catch (error) {
          console.error(`Payout failed for ${cleanerName}:`, error);
          results.push({
            cleanerId: cleaner.id,
            cleanerName,
            timezone,
            amount: totalAmount,
            currency,
            method: "skipped",
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const totalPaid = results.filter((r) => r.success).reduce((sum, r) => sum + r.amount, 0);

    console.log(`Payout completed: ${successCount}/${results.length} successful`);

    return NextResponse.json({
      message: `Processed ${successCount}/${results.length} payouts at 5:55 AM local time`,
      date: new Date().toISOString(),
      processed: successCount,
      failed: results.length - successCount,
      totalPaid,
      results,
    });
  } catch (error) {
    console.error("Cron payout error:", error);
    return NextResponse.json({ error: "Cron execution failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
