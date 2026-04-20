import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookingStatus, Role } from "@prisma/client";
import { applyRateLimit } from "@/lib/rate-limit";
import { sendNotification } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as BookingStatus | null;

    // Get bookings for the current user (as customer or worker)
    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { customerId: session.user.id },
          { cleanerId: session.user.id },
        ],
        ...(status ? { status } : {}),
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        cleaner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
          },
        },
        review: {
          select: {
            id: true,
            rating: true,
          },
        },
        payment: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: { scheduledDate: "desc" },
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting: 10 booking creations per minute
  const rateLimited = await applyRateLimit(request, "createBooking");
  if (rateLimited) return rateLimited;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      cleanerId,
      serviceId,
      scheduledDate,
      scheduledTime,
      duration,
      address,
      city,
      postalCode,
      notes,
      totalPrice,
    } = body;

    // Validate required fields
    if (!cleanerId || !scheduledDate || !scheduledTime) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify worker exists
    const worker = await prisma.user.findUnique({
      where: { id: cleanerId, role: Role.WORKER },
    });

    if (!worker) {
      return NextResponse.json(
        { error: "Worker not found" },
        { status: 404 }
      );
    }

    // Verify service exists (if provided)
    let service = null;
    if (serviceId) {
      service = await prisma.service.findUnique({
        where: { id: serviceId },
      });

      if (!service) {
        return NextResponse.json(
          { error: "Service not found" },
          { status: 404 }
        );
      }
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        customerId: session.user.id,
        cleanerId,
        serviceId: serviceId || null,
        scheduledDate: new Date(scheduledDate),
        scheduledTime,
        duration: duration || 60,
        address: address || null,
        city: city || null,
        postalCode: postalCode || null,
        notes: notes || null,
        totalPrice: totalPrice || 0,
        status: BookingStatus.PENDING,
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        cleaner: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        service: {
          select: {
            name: true,
          },
        },
      },
    });

    // Send notification to worker about new booking request
    const bookingDate = new Date(scheduledDate);
    sendNotification(cleanerId, "BOOKING_CREATED", {
      bookingId: booking.id,
      customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
      serviceName: booking.service?.name || "Service",
      scheduledDate: bookingDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
      scheduledTime,
    }, {
      actionUrl: `/bookings/${booking.id}`,
    }).catch(console.error); // Fire and forget

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
