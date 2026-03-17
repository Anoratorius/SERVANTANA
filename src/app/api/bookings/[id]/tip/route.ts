import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get tip status for a booking
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        customerId: true,
        cleanerId: true,
        status: true,
        tipAmount: true,
        tipPaidAt: true,
        cleaner: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only customer or cleaner can view tip
    if (
      booking.customerId !== session.user.id &&
      booking.cleanerId !== session.user.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      tipAmount: booking.tipAmount,
      tipPaidAt: booking.tipPaidAt,
      hasTipped: !!booking.tipAmount,
      cleanerName: `${booking.cleaner.firstName} ${booking.cleaner.lastName}`,
      canTip: booking.status === "COMPLETED" && !booking.tipAmount,
    });
  } catch (error) {
    console.error("Error fetching tip:", error);
    return NextResponse.json(
      { error: "Failed to fetch tip status" },
      { status: 500 }
    );
  }
}

// POST - Add a tip to a completed booking
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { amount } = body;

    // Validate amount
    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid tip amount" },
        { status: 400 }
      );
    }

    if (amount > 500) {
      return NextResponse.json(
        { error: "Tip amount exceeds maximum ($500)" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        customerId: true,
        cleanerId: true,
        status: true,
        tipAmount: true,
        totalPrice: true,
        teamSize: true,
        teamMembers: {
          select: { id: true, cleanerId: true },
        },
        cleaner: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only customer can tip
    if (booking.customerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the customer can add a tip" },
        { status: 403 }
      );
    }

    // Only completed bookings can be tipped
    if (booking.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Can only tip completed bookings" },
        { status: 400 }
      );
    }

    // Check if already tipped
    if (booking.tipAmount) {
      return NextResponse.json(
        { error: "This booking has already been tipped" },
        { status: 400 }
      );
    }

    // Update booking with tip
    await prisma.booking.update({
      where: { id },
      data: {
        tipAmount: amount,
        tipPaidAt: new Date(),
      },
    });

    // If team booking, split tip among team members
    if (booking.teamSize > 1 && booking.teamMembers.length > 0) {
      const tipPerMember = amount / booking.teamSize;

      // Update team member earnings with tip portion
      for (const member of booking.teamMembers) {
        await prisma.bookingTeamMember.update({
          where: { id: member.id },
          data: {
            earnings: {
              increment: tipPerMember,
            },
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Thank you for tipping $${amount.toFixed(2)} to ${booking.cleaner.firstName}!`,
      tipAmount: amount,
    });
  } catch (error) {
    console.error("Error processing tip:", error);
    return NextResponse.json(
      { error: "Failed to process tip" },
      { status: 500 }
    );
  }
}
