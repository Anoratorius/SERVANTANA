import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connections = await prisma.calendarConnection.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        provider: true,
        email: true,
        calendarId: true,
        syncEnabled: true,
        lastSyncAt: true,
        createdAt: true,
        _count: {
          select: { events: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ connections });
  } catch (error) {
    console.error("Error fetching calendar connections:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar connections" },
      { status: 500 }
    );
  }
}
