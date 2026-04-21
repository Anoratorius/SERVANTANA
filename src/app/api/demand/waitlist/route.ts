import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { DemandSignalType } from "@prisma/client";

// Join the waitlist for a service in a location
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      professionId,
      city,
      state,
      country,
      requestedDate,
      requestedTime,
    } = body;

    if (!professionId || !country) {
      return NextResponse.json(
        { error: "Profession and country are required" },
        { status: 400 }
      );
    }

    // Check if user is already on waitlist for this
    const existing = await prisma.demandSignal.findFirst({
      where: {
        customerId: session.user.id,
        professionId,
        city: city || null,
        joinedWaitlist: true,
        waitlistNotified: false,
      },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "You're already on the waitlist",
        id: existing.id,
      });
    }

    // Create waitlist entry
    const waitlistEntry = await prisma.demandSignal.create({
      data: {
        signalType: DemandSignalType.WAITLIST,
        professionId,
        city: city || null,
        state: state || null,
        country,
        customerId: session.user.id,
        requestedDate: requestedDate ? new Date(requestedDate) : null,
        requestedTime: requestedTime || null,
        joinedWaitlist: true,
        wasMatched: false,
      },
      include: {
        profession: {
          select: { name: true, nameDE: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "You've been added to the waitlist. We'll notify you when a provider is available.",
      id: waitlistEntry.id,
      profession: waitlistEntry.profession?.name,
      city: waitlistEntry.city,
    });
  } catch (error) {
    console.error("Error joining waitlist:", error);
    return NextResponse.json(
      { error: "Failed to join waitlist" },
      { status: 500 }
    );
  }
}

// Get user's waitlist entries
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const waitlistEntries = await prisma.demandSignal.findMany({
      where: {
        customerId: session.user.id,
        joinedWaitlist: true,
      },
      orderBy: { createdAt: "desc" },
      include: {
        profession: {
          select: { name: true, nameDE: true, emoji: true },
        },
      },
    });

    return NextResponse.json({
      entries: waitlistEntries.map((entry) => ({
        id: entry.id,
        profession: entry.profession,
        city: entry.city,
        country: entry.country,
        requestedDate: entry.requestedDate,
        requestedTime: entry.requestedTime,
        joinedAt: entry.createdAt,
        notified: entry.waitlistNotified,
        notifiedAt: entry.waitlistNotifiedAt,
        matched: entry.wasMatched,
      })),
    });
  } catch (error) {
    console.error("Error getting waitlist:", error);
    return NextResponse.json(
      { error: "Failed to get waitlist" },
      { status: 500 }
    );
  }
}

// Leave the waitlist
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Entry ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const entry = await prisma.demandSignal.findFirst({
      where: {
        id,
        customerId: session.user.id,
      },
    });

    if (!entry) {
      return NextResponse.json(
        { error: "Waitlist entry not found" },
        { status: 404 }
      );
    }

    await prisma.demandSignal.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Removed from waitlist",
    });
  } catch (error) {
    console.error("Error leaving waitlist:", error);
    return NextResponse.json(
      { error: "Failed to leave waitlist" },
      { status: 500 }
    );
  }
}
