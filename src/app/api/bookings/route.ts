import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookingStatus, Role } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as BookingStatus | null;

    // Get bookings for the current user (as customer or cleaner)
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

    // Verify cleaner exists
    const cleaner = await prisma.user.findUnique({
      where: { id: cleanerId, role: Role.CLEANER },
    });

    if (!cleaner) {
      return NextResponse.json(
        { error: "Cleaner not found" },
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

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
