/**
 * Cron Job: Worker Subscriptions
 * - Suspends workers who didn't pay within 24h window
 * - Expires active subscriptions past their expiry date
 *
 * Should run every hour via Vercel Cron
 */

import { NextResponse } from "next/server";
import {
  checkAndSuspendExpiredWorkers,
  checkAndExpireSubscriptions,
} from "@/lib/worker-subscription";

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization");
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Suspend workers with expired payment windows
    const suspendedCount = await checkAndSuspendExpiredWorkers();

    // Expire active subscriptions that passed their expiry date
    const expiredCount = await checkAndExpireSubscriptions();

    console.log(
      `[Cron] Worker subscriptions: ${suspendedCount} suspended for non-payment, ${expiredCount} subscriptions expired`
    );

    return NextResponse.json({
      success: true,
      suspended: suspendedCount,
      expired: expiredCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Worker subscriptions error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
