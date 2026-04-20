import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { applyRateLimit } from "@/lib/rate-limit";
import { sendNotification } from "@/lib/notifications";

const createReviewSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

export async function POST(request: NextRequest) {
  // Rate limiting: 5 reviews per hour
  const rateLimited = await applyRateLimit(request, "createReview");
  if (rateLimited) return rateLimited;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = createReviewSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { bookingId, rating, comment } = validationResult.data;

    // Get the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        review: true,
        customer: {
          select: { firstName: true, lastName: true },
        },
        service: {
          select: { name: true },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only the customer can leave a review
    if (booking.customerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the customer can leave a review" },
        { status: 403 }
      );
    }

    // Booking must be completed
    if (booking.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Can only review completed bookings" },
        { status: 400 }
      );
    }

    // Check if review already exists
    if (booking.review) {
      return NextResponse.json(
        { error: "Review already exists for this booking" },
        { status: 400 }
      );
    }

    // Create the review
    const review = await prisma.review.create({
      data: {
        bookingId,
        reviewerId: session.user.id,
        revieweeId: booking.cleanerId,
        rating,
        comment: comment || null,
      },
    });

    // Update cleaner's average rating
    const cleanerReviews = await prisma.review.findMany({
      where: { revieweeId: booking.cleanerId },
      select: { rating: true },
    });

    const averageRating =
      cleanerReviews.reduce((sum, r) => sum + r.rating, 0) / cleanerReviews.length;

    await prisma.workerProfile.updateMany({
      where: { userId: booking.cleanerId },
      data: { averageRating },
    });

    // Notify the worker about the new review
    sendNotification(booking.cleanerId, "REVIEW_RECEIVED", {
      customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
      serviceName: booking.service?.name || "Service",
      bookingId,
    }, {
      actionUrl: `/reviews`,
    }).catch(console.error);

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cleanerId = searchParams.get("cleanerId");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!cleanerId) {
      return NextResponse.json(
        { error: "cleanerId is required" },
        { status: 400 }
      );
    }

    const reviews = await prisma.review.findMany({
      where: { revieweeId: cleanerId },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        booking: {
          select: {
            service: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.review.count({
      where: { revieweeId: cleanerId },
    });

    return NextResponse.json({ reviews, total });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
