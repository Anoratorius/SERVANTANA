import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVapidPublicKey } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { subscription } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: "Invalid subscription data" },
        { status: 400 }
      );
    }

    const { endpoint, keys } = subscription;
    const { p256dh, auth: authKey } = keys;

    if (!p256dh || !authKey) {
      return NextResponse.json(
        { error: "Missing subscription keys" },
        { status: 400 }
      );
    }

    // Get user agent from request
    const userAgent = request.headers.get("user-agent") || undefined;

    // Upsert subscription (endpoint is unique)
    const pushSubscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: session.user.id,
        p256dh,
        auth: authKey,
        userAgent,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        endpoint,
        p256dh,
        auth: authKey,
        userAgent,
      },
    });

    return NextResponse.json({
      success: true,
      subscriptionId: pushSubscription.id,
    });
  } catch (error) {
    console.error("Error subscribing to push:", error);
    return NextResponse.json(
      { error: "Failed to subscribe to push notifications" },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve VAPID public key for client
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const vapidPublicKey = getVapidPublicKey();

    if (!vapidPublicKey) {
      return NextResponse.json(
        { error: "Push notifications not configured" },
        { status: 503 }
      );
    }

    // Check if user has any existing subscriptions
    const subscriptionCount = await prisma.pushSubscription.count({
      where: { userId: session.user.id },
    });

    return NextResponse.json({
      vapidPublicKey,
      hasSubscription: subscriptionCount > 0,
    });
  } catch (error) {
    console.error("Error getting push config:", error);
    return NextResponse.json(
      { error: "Failed to get push configuration" },
      { status: 500 }
    );
  }
}
