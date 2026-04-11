import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Register or update a mobile device FCM token
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { token, platform, deviceName, deviceModel, appVersion } = body;

    if (!token || !platform) {
      return NextResponse.json(
        { error: "Token and platform are required" },
        { status: 400 }
      );
    }

    if (!["ios", "android"].includes(platform)) {
      return NextResponse.json(
        { error: "Platform must be 'ios' or 'android'" },
        { status: 400 }
      );
    }

    // Upsert the token (token is unique)
    const deviceToken = await prisma.mobileDeviceToken.upsert({
      where: { token },
      update: {
        userId: session.user.id,
        platform,
        deviceName,
        deviceModel,
        appVersion,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        token,
        platform,
        deviceName,
        deviceModel,
        appVersion,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      tokenId: deviceToken.id,
    });
  } catch (error) {
    console.error("Error registering mobile device token:", error);
    return NextResponse.json(
      { error: "Failed to register device token" },
      { status: 500 }
    );
  }
}

/**
 * Unregister a mobile device token
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Mark token as inactive (don't delete, for audit trail)
    await prisma.mobileDeviceToken.updateMany({
      where: {
        token,
        userId: session.user.id,
      },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unregistering mobile device token:", error);
    return NextResponse.json(
      { error: "Failed to unregister device token" },
      { status: 500 }
    );
  }
}

/**
 * Get user's registered devices
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const devices = await prisma.mobileDeviceToken.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      select: {
        id: true,
        platform: true,
        deviceName: true,
        deviceModel: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ devices });
  } catch (error) {
    console.error("Error getting mobile devices:", error);
    return NextResponse.json(
      { error: "Failed to get devices" },
      { status: 500 }
    );
  }
}
