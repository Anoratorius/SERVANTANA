/**
 * Cancel Subscription API
 * POST: Cancel subscription at period end
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cancelSubscription } from "@/lib/subscriptions";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const cancelSchema = z.object({
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const validation = cancelSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { reason } = validation.data;

    // Cancel the subscription
    await cancelSubscription(session.user.id);

    // Store cancellation reason if provided
    if (reason) {
      await prisma.subscription.update({
        where: { userId: session.user.id },
        data: { cancellationReason: reason },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Subscription will be canceled at the end of the billing period",
    });
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
