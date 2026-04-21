import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { GuaranteeClaimReason } from "@prisma/client";

// Schema for creating a claim
const createClaimSchema = z.object({
  bookingId: z.string().min(1),
  reason: z.enum([
    "NO_SHOW",
    "INCOMPLETE_SERVICE",
    "POOR_QUALITY",
    "PROPERTY_DAMAGE",
    "LATE_ARRIVAL",
    "UNPROFESSIONAL",
    "OTHER",
  ]),
  description: z.string().min(20, "Please provide at least 20 characters describing the issue"),
  evidence: z.array(z.string()).optional(),
});

// GET - List claims for current user
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {
      OR: [
        { customerId: session.user.id },
        { workerId: session.user.id },
      ],
    };

    if (status) {
      where.status = status;
    }

    const claims = await prisma.guaranteeClaim.findMany({
      where,
      include: {
        booking: {
          select: {
            id: true,
            scheduledDate: true,
            scheduledTime: true,
            totalPrice: true,
            service: {
              select: { name: true },
            },
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        worker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(claims);
  } catch (error) {
    console.error("Error fetching claims:", error);
    return NextResponse.json({ error: "Failed to fetch claims" }, { status: 500 });
  }
}

// POST - Create a new claim
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = createClaimSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { bookingId, reason, description, evidence } = validation.data;

    // Verify the booking exists and belongs to this customer
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        customerId: session.user.id,
        status: "COMPLETED", // Can only claim on completed bookings
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found or not eligible for a claim" },
        { status: 404 }
      );
    }

    // Check if a claim already exists for this booking
    const existingClaim = await prisma.guaranteeClaim.findFirst({
      where: { bookingId },
    });

    if (existingClaim) {
      return NextResponse.json(
        { error: "A claim already exists for this booking" },
        { status: 400 }
      );
    }

    // Check if booking is within claim window (7 days)
    const bookingDate = new Date(booking.completedAt || booking.scheduledDate);
    const daysSinceBooking = Math.floor(
      (Date.now() - bookingDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceBooking > 7) {
      return NextResponse.json(
        { error: "Claims must be filed within 7 days of service completion" },
        { status: 400 }
      );
    }

    // Create the claim
    const claim = await prisma.guaranteeClaim.create({
      data: {
        bookingId,
        customerId: session.user.id,
        workerId: booking.workerId,
        reason: reason as GuaranteeClaimReason,
        description,
        evidence: evidence || [],
        status: "PENDING",
      },
      include: {
        booking: {
          select: {
            id: true,
            scheduledDate: true,
            totalPrice: true,
          },
        },
      },
    });

    return NextResponse.json(claim, { status: 201 });
  } catch (error) {
    console.error("Error creating claim:", error);
    return NextResponse.json({ error: "Failed to create claim" }, { status: 500 });
  }
}
