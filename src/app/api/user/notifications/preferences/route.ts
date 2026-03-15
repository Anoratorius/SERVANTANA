import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NotificationType, NotificationChannel } from "@prisma/client";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preferences = await prisma.notificationPreference.findMany({
      where: { userId: session.user.id },
      orderBy: [{ type: "asc" }, { channel: "asc" }],
    });

    // Get user's phone to check if SMS is available
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { phone: true, phoneVerified: true },
    });

    // Group preferences by type
    const groupedPreferences: Record<
      string,
      Record<string, boolean>
    > = {};

    for (const pref of preferences) {
      if (!groupedPreferences[pref.type]) {
        groupedPreferences[pref.type] = {};
      }
      groupedPreferences[pref.type][pref.channel] = pref.enabled;
    }

    return NextResponse.json({
      preferences,
      groupedPreferences,
      hasPhone: !!user?.phone,
      phoneVerified: !!user?.phoneVerified,
    });
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, channel, enabled } = body;

    // Validate type
    if (!Object.values(NotificationType).includes(type)) {
      return NextResponse.json(
        { error: "Invalid notification type" },
        { status: 400 }
      );
    }

    // Validate channel
    if (!Object.values(NotificationChannel).includes(channel)) {
      return NextResponse.json(
        { error: "Invalid notification channel" },
        { status: 400 }
      );
    }

    // Upsert preference
    const preference = await prisma.notificationPreference.upsert({
      where: {
        userId_type_channel: {
          userId: session.user.id,
          type,
          channel,
        },
      },
      update: { enabled },
      create: {
        userId: session.user.id,
        type,
        channel,
        enabled,
      },
    });

    return NextResponse.json({ preference });
  } catch (error) {
    console.error("Error updating preference:", error);
    return NextResponse.json(
      { error: "Failed to update preference" },
      { status: 500 }
    );
  }
}

// Bulk update preferences
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { preferences } = body;

    if (!Array.isArray(preferences)) {
      return NextResponse.json(
        { error: "preferences must be an array" },
        { status: 400 }
      );
    }

    // Validate and prepare upserts
    const operations = preferences.map((pref: { type: NotificationType; channel: NotificationChannel; enabled: boolean }) => {
      if (
        !Object.values(NotificationType).includes(pref.type) ||
        !Object.values(NotificationChannel).includes(pref.channel)
      ) {
        throw new Error(`Invalid preference: ${pref.type} / ${pref.channel}`);
      }

      return prisma.notificationPreference.upsert({
        where: {
          userId_type_channel: {
            userId: session.user.id,
            type: pref.type,
            channel: pref.channel,
          },
        },
        update: { enabled: pref.enabled },
        create: {
          userId: session.user.id,
          type: pref.type,
          channel: pref.channel,
          enabled: pref.enabled,
        },
      });
    });

    await prisma.$transaction(operations);

    return NextResponse.json({ success: true, count: preferences.length });
  } catch (error) {
    console.error("Error updating preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
