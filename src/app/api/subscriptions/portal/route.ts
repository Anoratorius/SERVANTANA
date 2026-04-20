/**
 * Stripe Customer Portal API
 * POST: Create a portal session for managing subscription
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createCustomerPortalSession } from "@/lib/subscriptions";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const baseUrl = process.env.NEXTAUTH_URL || "https://servantana.com";

    const portalUrl = await createCustomerPortalSession(
      session.user.id,
      `${baseUrl}/dashboard/subscription`
    );

    return NextResponse.json({ portalUrl });
  } catch (error) {
    console.error("Error creating portal session:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
