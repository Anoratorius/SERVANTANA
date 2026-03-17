import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get customer review for a booking
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
        cleanerId: true,
        customerId: true,
        status: true,
        customerReview: true,
        customer: {
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

    // Only cleaner can view/create customer reviews
    if (booking.cleanerId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      review: booking.customerReview,
      customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
      canReview: booking.status === "COMPLETED" && !booking.customerReview,
    });
  } catch (error) {
    console.error("Error fetching customer review:", error);
    return NextResponse.json(
      { error: "Failed to fetch review" },
      { status: 500 }
    );
  }
}

// POST - Create customer review
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
    const { punctuality, cleanliness, communication, overall, comment } = body;

    // Validate ratings
    const ratings = [punctuality, cleanliness, communication, overall];
    for (const rating of ratings) {
      if (typeof rating !== "number" || rating < 1 || rating > 5) {
        return NextResponse.json(
          { error: "Ratings must be between 1 and 5" },
          { status: 400 }
        );
      }
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        cleanerId: true,
        customerId: true,
        status: true,
        customerReview: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only cleaner can review customer
    if (booking.cleanerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the cleaner can review the customer" },
        { status: 403 }
      );
    }

    // Only completed bookings
    if (booking.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Can only review after booking is completed" },
        { status: 400 }
      );
    }

    // Check if already reviewed
    if (booking.customerReview) {
      return NextResponse.json(
        { error: "Customer already reviewed for this booking" },
        { status: 400 }
      );
    }

    // Create review
    const review = await prisma.customerReview.create({
      data: {
        bookingId: id,
        cleanerId: session.user.id,
        customerId: booking.customerId,
        punctuality,
        cleanliness,
        communication,
        overall,
        comment: comment?.trim() || null,
      },
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error("Error creating customer review:", error);
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}
