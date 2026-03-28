import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// GET - Find available substitute cleaners for a cancelled/cancelling booking
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
      include: {
        service: true,
        cleaner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only customer can view substitutes
    if (booking.customerId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!booking.serviceId) {
      return NextResponse.json({ error: "Booking has no service" }, { status: 400 });
    }

    // Find cleaners who:
    // 1. Offer the same service
    // 2. Are not the original cleaner
    // 3. Are verified
    // 4. Are within service radius of the booking location

    const availableCleaners = await prisma.workerProfile.findMany({
      where: {
        userId: { not: booking.cleanerId },
        verified: true,
        services: {
          some: {
            serviceId: booking.serviceId,
            isActive: true,
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        services: {
          where: {
            serviceId: booking.serviceId,
          },
          include: {
            service: true,
          },
        },
      },
    });

    // Filter by distance and check availability
    const bookingDate = new Date(booking.scheduledDate);
    const dayOfWeek = bookingDate.getDay();

    const substitutes = [];

    for (const cleaner of availableCleaners) {
      // Check distance if coordinates available
      if (booking.latitude && booking.longitude && cleaner.latitude && cleaner.longitude) {
        const distance = calculateDistance(
          booking.latitude,
          booking.longitude,
          cleaner.latitude,
          cleaner.longitude
        );

        // Skip if outside service radius
        if (distance > cleaner.serviceRadius) {
          continue;
        }
      }

      // Check if cleaner has availability on this day
      const availability = await prisma.availability.findFirst({
        where: {
          cleanerId: cleaner.id,
          dayOfWeek,
          isActive: true,
        },
      });

      if (!availability) {
        continue;
      }

      // Check if booking time falls within availability
      const [bookingHour, bookingMinute] = booking.scheduledTime.split(":").map(Number);
      const bookingTimeMinutes = bookingHour * 60 + bookingMinute;

      const [startHour, startMinute] = availability.startTime.split(":").map(Number);
      const [endHour, endMinute] = availability.endTime.split(":").map(Number);
      const startTimeMinutes = startHour * 60 + startMinute;
      const endTimeMinutes = endHour * 60 + endMinute;

      if (bookingTimeMinutes < startTimeMinutes || bookingTimeMinutes >= endTimeMinutes) {
        continue;
      }

      // Check for conflicting bookings
      const conflictingBooking = await prisma.booking.findFirst({
        where: {
          cleanerId: cleaner.userId,
          scheduledDate: booking.scheduledDate,
          status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
          id: { not: booking.id },
        },
      });

      if (conflictingBooking) {
        // Check for time overlap
        const [conflictHour, conflictMinute] = conflictingBooking.scheduledTime.split(":").map(Number);
        const conflictStart = conflictHour * 60 + conflictMinute;
        const conflictEnd = conflictStart + conflictingBooking.duration;
        const bookingEnd = bookingTimeMinutes + booking.duration;

        // If times overlap, skip this cleaner
        if (
          (bookingTimeMinutes >= conflictStart && bookingTimeMinutes < conflictEnd) ||
          (bookingEnd > conflictStart && bookingEnd <= conflictEnd) ||
          (bookingTimeMinutes <= conflictStart && bookingEnd >= conflictEnd)
        ) {
          continue;
        }
      }

      // Get cleaner's price for this service
      const workerService = cleaner.services[0];
      const price = workerService?.customPrice ?? workerService?.service.basePrice ?? booking.totalPrice;

      substitutes.push({
        id: cleaner.userId,
        firstName: cleaner.user.firstName,
        lastName: cleaner.user.lastName,
        avatar: cleaner.user.avatar,
        rating: cleaner.averageRating,
        totalBookings: cleaner.totalBookings,
        price,
        bio: cleaner.bio,
      });
    }

    // Sort by rating (highest first)
    substitutes.sort((a, b) => b.rating - a.rating);

    return NextResponse.json({
      booking: {
        id: booking.id,
        scheduledDate: booking.scheduledDate,
        scheduledTime: booking.scheduledTime,
        service: booking.service?.name || "Cleaning Service",
        originalCleaner: booking.cleaner ? {
          firstName: booking.cleaner.firstName,
          lastName: booking.cleaner.lastName,
        } : null,
      },
      substitutes: substitutes.slice(0, 10), // Return top 10
    });
  } catch (error) {
    console.error("Error finding substitutes:", error);
    return NextResponse.json(
      { error: "Failed to find substitutes" },
      { status: 500 }
    );
  }
}

// POST - Accept a substitute cleaner
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
    const { substituteCleanerId } = body;

    if (!substituteCleanerId) {
      return NextResponse.json(
        { error: "Substitute cleaner ID required" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        service: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only customer can accept substitutes
    if (booking.customerId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Booking must be cancelled to accept substitute
    if (booking.status !== "CANCELLED") {
      return NextResponse.json(
        { error: "Booking is not cancelled" },
        { status: 400 }
      );
    }

    if (!booking.serviceId) {
      return NextResponse.json({ error: "Booking has no service" }, { status: 400 });
    }

    // Verify the substitute cleaner exists and offers this service
    const substituteProfile = await prisma.workerProfile.findUnique({
      where: { userId: substituteCleanerId },
      include: {
        services: {
          where: { serviceId: booking.serviceId },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!substituteProfile) {
      return NextResponse.json(
        { error: "Substitute cleaner not found" },
        { status: 404 }
      );
    }

    // Calculate new price
    const workerService = substituteProfile.services[0];
    const newPrice = workerService?.customPrice ?? booking.service?.basePrice ?? booking.totalPrice;

    // Create a new booking with the substitute cleaner
    const newBooking = await prisma.booking.create({
      data: {
        customerId: booking.customerId,
        cleanerId: substituteCleanerId,
        serviceId: booking.serviceId,
        scheduledDate: booking.scheduledDate,
        scheduledTime: booking.scheduledTime,
        duration: booking.duration,
        address: booking.address,
        city: booking.city,
        state: booking.state,
        postalCode: booking.postalCode,
        latitude: booking.latitude,
        longitude: booking.longitude,
        notes: booking.notes,
        totalPrice: newPrice,
        status: "PENDING",
        substitutedFromId: booking.id,
      },
    });

    // Update original booking to reference the substitution
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        substitutedToId: newBooking.id,
      },
    });

    return NextResponse.json({
      message: "Substitute accepted successfully",
      newBooking: {
        id: newBooking.id,
        cleanerName: `${substituteProfile.user.firstName} ${substituteProfile.user.lastName}`,
        price: newPrice,
      },
    });
  } catch (error) {
    console.error("Error accepting substitute:", error);
    return NextResponse.json(
      { error: "Failed to accept substitute" },
      { status: 500 }
    );
  }
}
