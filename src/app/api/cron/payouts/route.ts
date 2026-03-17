import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTransfer } from "@/lib/stripe";
import { createSinglePayout } from "@/lib/paypal-payouts";

/**
 * Cron endpoint for processing payouts at 12:01 AM local time on 1st and 15th
 *
 * Runs every hour to catch all timezones as they hit midnight.
 *
 * To set up in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/payouts",
 *     "schedule": "1 * * * *"
 *   }]
 * }
 *
 * This runs at minute 1 of every hour (XX:01) to catch 00:01 in each timezone.
 */

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Get all timezones where it's currently 00:01 on 1st or 15th
 */
function getPayoutTimezones(): string[] {
  const now = new Date();
  const payoutTimezones: string[] = [];

  // List of common IANA timezones to check
  const timezones = [
    // UTC and Europe
    "UTC",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Rome",
    "Europe/Madrid",
    "Europe/Amsterdam",
    "Europe/Brussels",
    "Europe/Vienna",
    "Europe/Warsaw",
    "Europe/Prague",
    "Europe/Budapest",
    "Europe/Bucharest",
    "Europe/Athens",
    "Europe/Helsinki",
    "Europe/Stockholm",
    "Europe/Oslo",
    "Europe/Copenhagen",
    "Europe/Dublin",
    "Europe/Lisbon",
    "Europe/Zurich",
    "Europe/Moscow",
    "Europe/Istanbul",
    // Americas
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Phoenix",
    "America/Toronto",
    "America/Vancouver",
    "America/Mexico_City",
    "America/Sao_Paulo",
    "America/Buenos_Aires",
    "America/Lima",
    "America/Bogota",
    // Asia
    "Asia/Tokyo",
    "Asia/Seoul",
    "Asia/Shanghai",
    "Asia/Hong_Kong",
    "Asia/Singapore",
    "Asia/Bangkok",
    "Asia/Jakarta",
    "Asia/Manila",
    "Asia/Kolkata",
    "Asia/Mumbai",
    "Asia/Dubai",
    "Asia/Riyadh",
    "Asia/Tehran",
    "Asia/Karachi",
    // Oceania
    "Australia/Sydney",
    "Australia/Melbourne",
    "Australia/Brisbane",
    "Australia/Perth",
    "Pacific/Auckland",
    // Africa
    "Africa/Cairo",
    "Africa/Johannesburg",
    "Africa/Lagos",
    "Africa/Nairobi",
  ];

  for (const tz of timezones) {
    try {
      // Get current time in this timezone
      const localTime = new Date(now.toLocaleString("en-US", { timeZone: tz }));
      const day = localTime.getDate();
      const hour = localTime.getHours();
      const minute = localTime.getMinutes();

      // Check if it's 00:00-00:59 on 1st or 15th (we run at minute 1 of each hour)
      if ((day === 1 || day === 15) && hour === 0) {
        payoutTimezones.push(tz);
      }
    } catch {
      // Skip invalid timezones
    }
  }

  return payoutTimezones;
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
    // Find timezones where it's currently payout time (00:01 on 1st or 15th)
    const payoutTimezones = getPayoutTimezones();

    if (payoutTimezones.length === 0) {
      return NextResponse.json({
        message: "No timezones at payout time",
        processed: 0,
      });
    }

    console.log(`Payout time in timezones: ${payoutTimezones.join(", ")}`);

    // Get all cleaners in these timezones with pending earnings
    const cleanersToPayOut = await prisma.user.findMany({
      where: {
        role: "CLEANER",
        cleanerProfile: {
          timezone: { in: payoutTimezones },
        },
        earnings: {
          some: {
            status: "PENDING",
            availableAt: { lte: new Date() },
          },
        },
      },
      include: {
        cleanerProfile: {
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
      },
    });

    if (cleanersToPayOut.length === 0) {
      return NextResponse.json({
        message: "No cleaners with pending payouts in current timezones",
        timezones: payoutTimezones,
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
      const timezone = cleaner.cleanerProfile?.timezone || "UTC";

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
            cleaner.cleanerProfile?.stripeAccountId &&
            cleaner.cleanerProfile?.stripeOnboardingComplete
          ) {
            const transfer = await createTransfer({
              amount: totalAmount,
              currency,
              destinationAccountId: cleaner.cleanerProfile.stripeAccountId,
              description: `Servantana payout - ${new Date().toISOString().split("T")[0]}`,
              metadata: {
                cleanerId: cleaner.id,
                timezone,
                earningIds: currencyEarnings.map((e) => e.id).join(","),
              },
            });
            payoutMethod = "stripe";
            externalPayoutId = transfer.id;
          } else if (cleaner.cleanerProfile?.paypalEmail) {
            const payout = await createSinglePayout(
              cleaner.cleanerProfile.paypalEmail,
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
      message: `Processed ${successCount}/${results.length} payouts`,
      timezones: payoutTimezones,
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
