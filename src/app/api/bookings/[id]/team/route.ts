import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get team members for a booking
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
        teamSize: true,
        teamMembers: {
          include: {
            cleaner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
                phone: true,
                workerProfile: {
                  select: {
                    averageRating: true,
                    verified: true,
                  },
                },
              },
            },
          },
          orderBy: { isLead: "desc" },
        },
        cleaner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            phone: true,
            workerProfile: {
              select: {
                averageRating: true,
                verified: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only customer or team members can view
    const isTeamMember = booking.teamMembers.some(
      (m) => m.cleanerId === session.user.id
    );
    if (
      booking.customerId !== session.user.id &&
      booking.cleanerId !== session.user.id &&
      !isTeamMember
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      teamSize: booking.teamSize,
      leadCleaner: booking.cleaner,
      teamMembers: booking.teamMembers,
    });
  } catch (error) {
    console.error("Error fetching team:", error);
    return NextResponse.json(
      { error: "Failed to fetch team" },
      { status: 500 }
    );
  }
}

// POST - Add team member or confirm participation
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
    const { action, cleanerId } = body;

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        cleanerId: true,
        customerId: true,
        teamSize: true,
        status: true,
        totalPrice: true,
        teamMembers: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Handle confirmation by team member
    if (action === "confirm") {
      const member = booking.teamMembers.find(
        (m) => m.cleanerId === session.user.id
      );
      if (!member) {
        return NextResponse.json(
          { error: "You are not a team member" },
          { status: 403 }
        );
      }

      await prisma.bookingTeamMember.update({
        where: { id: member.id },
        data: { confirmed: true },
      });

      return NextResponse.json({ message: "Participation confirmed" });
    }

    // Handle decline by team member
    if (action === "decline") {
      const member = booking.teamMembers.find(
        (m) => m.cleanerId === session.user.id
      );
      if (!member) {
        return NextResponse.json(
          { error: "You are not a team member" },
          { status: 403 }
        );
      }

      await prisma.bookingTeamMember.delete({
        where: { id: member.id },
      });

      return NextResponse.json({ message: "Declined participation" });
    }

    // Only lead cleaner can add team members
    if (booking.cleanerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only lead cleaner can manage team" },
        { status: 403 }
      );
    }

    // Check if team is already full
    if (booking.teamMembers.length >= booking.teamSize - 1) {
      return NextResponse.json({ error: "Team is already full" }, { status: 400 });
    }

    // Add team member
    if (action === "add" && cleanerId) {
      // Check if cleaner exists and is a cleaner
      const cleaner = await prisma.user.findFirst({
        where: { id: cleanerId, role: "CLEANER" },
      });

      if (!cleaner) {
        return NextResponse.json(
          { error: "Worker not found" },
          { status: 404 }
        );
      }

      // Check if already a member
      const existing = booking.teamMembers.find((m) => m.cleanerId === cleanerId);
      if (existing || cleanerId === booking.cleanerId) {
        return NextResponse.json(
          { error: "Worker is already on the team" },
          { status: 400 }
        );
      }

      // Calculate earnings split
      const earningsPerMember = booking.totalPrice / booking.teamSize;

      const teamMember = await prisma.bookingTeamMember.create({
        data: {
          bookingId: id,
          cleanerId,
          isLead: false,
          earnings: earningsPerMember,
        },
        include: {
          cleaner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      });

      return NextResponse.json({ teamMember }, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error managing team:", error);
    return NextResponse.json(
      { error: "Failed to manage team" },
      { status: 500 }
    );
  }
}

// DELETE - Remove team member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID required" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { cleanerId: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only lead cleaner can remove members
    if (booking.cleanerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only lead cleaner can remove team members" },
        { status: 403 }
      );
    }

    await prisma.bookingTeamMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing team member:", error);
    return NextResponse.json(
      { error: "Failed to remove team member" },
      { status: 500 }
    );
  }
}
