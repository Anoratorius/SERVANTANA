import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SuggestionStatus, BookingStatus, Role } from "@prisma/client";
import { sendNotification } from "@/lib/notifications";

/**
 * GET /api/bookings/suggestions
 * Get pending booking suggestions for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as SuggestionStatus | null;
    const includeExpired = searchParams.get("includeExpired") === "true";

    const now = new Date();

    const suggestions = await prisma.bookingSuggestion.findMany({
      where: {
        customerId: session.user.id,
        ...(status ? { status } : {}),
        ...(includeExpired ? {} : { expiresAt: { gt: now } }),
      },
      include: {
        pattern: {
          include: {
            worker: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
            profession: {
              select: {
                id: true,
                name: true,
                emoji: true,
              },
            },
            service: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { suggestedDate: "asc" },
    });

    // Mark expired suggestions
    const expiredIds = suggestions
      .filter((s) => s.status === "PENDING" && s.expiresAt < now)
      .map((s) => s.id);

    if (expiredIds.length > 0) {
      await prisma.bookingSuggestion.updateMany({
        where: { id: { in: expiredIds } },
        data: { status: "EXPIRED" },
      });
    }

    return NextResponse.json({
      suggestions: suggestions.map((s) => ({
        ...s,
        status: expiredIds.includes(s.id) ? "EXPIRED" : s.status,
        isExpired: s.expiresAt < now,
      })),
    });
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bookings/suggestions
 * Create a booking suggestion manually (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can create suggestions manually
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      customerId,
      patternId,
      suggestedDate,
      suggestedTime,
      workerId,
      professionId,
      serviceId,
      expiresInDays = 3,
    } = body;

    // Validate required fields
    if (!customerId || !suggestedDate || !suggestedTime) {
      return NextResponse.json(
        { error: "Missing required fields: customerId, suggestedDate, suggestedTime" },
        { status: 400 }
      );
    }

    // Verify customer exists
    const customer = await prisma.user.findUnique({
      where: { id: customerId, role: Role.CUSTOMER },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create suggestion
    const suggestion = await prisma.bookingSuggestion.create({
      data: {
        customerId,
        patternId: patternId || null,
        suggestedDate: new Date(suggestedDate),
        suggestedTime,
        workerId: workerId || null,
        professionId: professionId || null,
        serviceId: serviceId || null,
        status: "PENDING",
        expiresAt,
      },
      include: {
        pattern: true,
        customer: {
          select: {
            firstName: true,
            email: true,
          },
        },
      },
    });

    // Send notification to customer
    const formattedDate = new Date(suggestedDate).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    sendNotification(
      customerId,
      "BOOKING_REMINDER",
      {
        scheduledDate: formattedDate,
        scheduledTime: suggestedTime,
      },
      {
        actionUrl: `/dashboard/suggestions/${suggestion.id}`,
      }
    ).catch(console.error);

    return NextResponse.json({ suggestion }, { status: 201 });
  } catch (error) {
    console.error("Error creating suggestion:", error);
    return NextResponse.json(
      { error: "Failed to create suggestion" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/bookings/suggestions
 * Accept or decline a suggestion
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { suggestionId, action, bookingDetails } = body;

    if (!suggestionId || !action) {
      return NextResponse.json(
        { error: "Missing required fields: suggestionId, action" },
        { status: 400 }
      );
    }

    if (!["accept", "decline"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'accept' or 'decline'" },
        { status: 400 }
      );
    }

    // Get the suggestion
    const suggestion = await prisma.bookingSuggestion.findFirst({
      where: {
        id: suggestionId,
        customerId: session.user.id,
      },
      include: {
        pattern: true,
      },
    });

    if (!suggestion) {
      return NextResponse.json(
        { error: "Suggestion not found" },
        { status: 404 }
      );
    }

    if (suggestion.status !== "PENDING") {
      return NextResponse.json(
        { error: `Suggestion already ${suggestion.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    if (suggestion.expiresAt < new Date()) {
      await prisma.bookingSuggestion.update({
        where: { id: suggestionId },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "Suggestion has expired" },
        { status: 400 }
      );
    }

    // Handle decline
    if (action === "decline") {
      const updatedSuggestion = await prisma.bookingSuggestion.update({
        where: { id: suggestionId },
        data: {
          status: "DECLINED",
          respondedAt: new Date(),
        },
      });

      // Update pattern stats if linked
      if (suggestion.patternId) {
        await prisma.bookingPattern.update({
          where: { id: suggestion.patternId },
          data: {
            timesDeclined: { increment: 1 },
          },
        });
      }

      return NextResponse.json({
        message: "Suggestion declined",
        suggestion: updatedSuggestion,
      });
    }

    // Handle accept - create a booking
    const {
      workerId,
      serviceId,
      address,
      city,
      postalCode,
      notes,
      totalPrice,
      duration = 60,
    } = bookingDetails || {};

    // Determine worker ID
    const finalWorkerId = workerId || suggestion.workerId;
    if (!finalWorkerId) {
      return NextResponse.json(
        { error: "Worker ID is required to accept the suggestion" },
        { status: 400 }
      );
    }

    // Verify worker exists
    const worker = await prisma.user.findUnique({
      where: { id: finalWorkerId, role: Role.WORKER },
      include: {
        workerProfile: {
          select: { hourlyRate: true },
        },
      },
    });

    if (!worker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        customerId: session.user.id,
        workerId: finalWorkerId,
        serviceId: serviceId || suggestion.serviceId || null,
        scheduledDate: suggestion.suggestedDate,
        scheduledTime: suggestion.suggestedTime,
        duration,
        address: address || null,
        city: city || null,
        postalCode: postalCode || null,
        notes: notes || `Booked from AI suggestion`,
        totalPrice: totalPrice || (worker.workerProfile?.hourlyRate || 25) * (duration / 60),
        status: BookingStatus.PENDING,
      },
      include: {
        customer: {
          select: { firstName: true, lastName: true, email: true },
        },
        worker: {
          select: { firstName: true, lastName: true, email: true },
        },
        service: {
          select: { name: true },
        },
      },
    });

    // Update suggestion
    const updatedSuggestion = await prisma.bookingSuggestion.update({
      where: { id: suggestionId },
      data: {
        status: "ACCEPTED",
        respondedAt: new Date(),
        bookingId: booking.id,
      },
    });

    // Update pattern stats if linked
    if (suggestion.patternId) {
      await prisma.bookingPattern.update({
        where: { id: suggestion.patternId },
        data: {
          timesAccepted: { increment: 1 },
          lastBooked: new Date(),
        },
      });
    }

    // Notify worker about new booking
    const formattedDate = suggestion.suggestedDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    sendNotification(
      finalWorkerId,
      "BOOKING_CREATED",
      {
        bookingId: booking.id,
        customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
        serviceName: booking.service?.name || "Service",
        scheduledDate: formattedDate,
        scheduledTime: suggestion.suggestedTime,
      },
      {
        actionUrl: `/bookings/${booking.id}`,
      }
    ).catch(console.error);

    return NextResponse.json({
      message: "Suggestion accepted and booking created",
      suggestion: updatedSuggestion,
      booking,
    });
  } catch (error) {
    console.error("Error processing suggestion:", error);
    return NextResponse.json(
      { error: "Failed to process suggestion" },
      { status: 500 }
    );
  }
}
