import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateReminderSchema = z.object({
  enabled: z.boolean().optional(),
  reminderTimes: z.array(z.number().min(5).max(10080)).optional(), // 5 min to 7 days
});

// GET - Fetch user's reminder preferences
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preference = await prisma.reminderPreference.findUnique({
      where: { userId: session.user.id },
    });

    // Return default values if no preference exists
    const defaultPreference = {
      enabled: true,
      reminderTimes: [1440, 60], // 24hr and 1hr before
    };

    return NextResponse.json({
      preference: preference || defaultPreference,
      presets: [
        { label: "1 hour before", minutes: 60 },
        { label: "2 hours before", minutes: 120 },
        { label: "4 hours before", minutes: 240 },
        { label: "12 hours before", minutes: 720 },
        { label: "24 hours before", minutes: 1440 },
        { label: "48 hours before", minutes: 2880 },
      ],
    });
  } catch (error) {
    console.error("Error fetching reminder preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

// PUT - Update user's reminder preferences
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = updateReminderSchema.parse(body);

    const preference = await prisma.reminderPreference.upsert({
      where: { userId: session.user.id },
      update: {
        ...(data.enabled !== undefined && { enabled: data.enabled }),
        ...(data.reminderTimes && { reminderTimes: data.reminderTimes }),
      },
      create: {
        userId: session.user.id,
        enabled: data.enabled ?? true,
        reminderTimes: data.reminderTimes ?? [1440, 60],
      },
    });

    return NextResponse.json({ preference });
  } catch (error) {
    console.error("Error updating reminder preferences:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
