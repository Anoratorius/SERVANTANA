import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DisputeType } from "@prisma/client";
import { applyRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Rate limiting: 3 disputes per hour
  const rateLimited = await applyRateLimit(request, "createDispute");
  if (rateLimited) return rateLimited;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, type, subject, description } = body;

    if (!bookingId || !type || !subject || !description) {
      return NextResponse.json(
        { error: "Missing required fields: bookingId, type, subject, description" },
        { status: 400 }
      );
    }

    // Validate dispute type
    if (!Object.values(DisputeType).includes(type)) {
      return NextResponse.json(
        { error: "Invalid dispute type" },
        { status: 400 }
      );
    }

    // Get the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Only customer or worker can create dispute
    const isCustomer = booking.customerId === session.user.id;
    const isCleaner = booking.cleanerId === session.user.id;

    if (!isCustomer && !isCleaner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if dispute already exists for this booking
    const existingDispute = await prisma.dispute.findFirst({
      where: {
        bookingId,
        status: { in: ["OPEN", "IN_REVIEW"] },
      },
    });

    if (existingDispute) {
      return NextResponse.json(
        { error: "An active dispute already exists for this booking" },
        { status: 400 }
      );
    }

    const dispute = await prisma.dispute.create({
      data: {
        bookingId,
        customerId: booking.customerId,
        cleanerId: booking.cleanerId,
        type,
        subject,
        description,
      },
      include: {
        booking: {
          select: {
            scheduledDate: true,
            totalPrice: true,
            service: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({ dispute }, { status: 201 });
  } catch (error) {
    console.error("Error creating dispute:", error);
    return NextResponse.json(
      { error: "Failed to create dispute" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {
      OR: [
        { customerId: session.user.id },
        { cleanerId: session.user.id },
      ],
    };

    if (status) {
      where.status = status;
    }

    const disputes = await prisma.dispute.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        booking: {
          select: {
            scheduledDate: true,
            totalPrice: true,
            service: { select: { name: true } },
          },
        },
        customer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        cleaner: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            messages: true,
            evidence: true,
          },
        },
      },
    });

    return NextResponse.json({ disputes });
  } catch (error) {
    console.error("Error fetching disputes:", error);
    return NextResponse.json(
      { error: "Failed to fetch disputes" },
      { status: 500 }
    );
  }
}
