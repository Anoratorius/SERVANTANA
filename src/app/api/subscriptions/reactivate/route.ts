/**
 * Reactivate Subscription API
 * POST: Reactivate a canceled subscription (before period ends)
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { reactivateSubscription } from "@/lib/subscriptions";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await reactivateSubscription(session.user.id);

    return NextResponse.json({
      success: true,
      message: "Subscription reactivated successfully",
    });
  } catch (error) {
    console.error("Error reactivating subscription:", error);
    return NextResponse.json(
      { error: "Failed to reactivate subscription" },
      { status: 500 }
    );
  }
}
