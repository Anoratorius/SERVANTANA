import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Find available workers for team booking
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
        workerId: true,
        serviceId: true,
        scheduledDate: true,
        scheduledTime: true,
        duration: true,
        latitude: true,
        longitude: true,
        teamMembers: {
          select: { workerId: true },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only lead worker can search for team members
    if (booking.workerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only lead worker can search for team members" },
        { status: 403 }
      );
    }

    if (!booking.serviceId) {
      return NextResponse.json({ error: "Booking has no service" }, { status: 400 });
    }

    // Get existing team member IDs
    const existingMemberIds = [
      booking.workerId,
      ...booking.teamMembers.map((m) => m.workerId),
    ];

    // Find workers who:
    // 1. Offer the same service
    // 2. Are not already on the team
    // 3. Don't have conflicting bookings
    const dayOfWeek = booking.scheduledDate.getDay();

    // Get workers who offer this service
    const availableWorkers = await prisma.user.findMany({
      where: {
        role: "WORKER",
        id: { notIn: existingMemberIds },
        workerProfile: {
          services: {
            some: {
              serviceId: booking.serviceId,
              isActive: true,
            },
          },
          availability: {
            some: {
              dayOfWeek,
              isActive: true,
            },
          },
        },
        // Exclude workers with conflicting bookings
        bookingsAsWorker: {
          none: {
            scheduledDate: booking.scheduledDate,
            scheduledTime: booking.scheduledTime,
            status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        workerProfile: {
          select: {
            averageRating: true,
            totalBookings: true,
            verified: true,
            hourlyRate: true,
            latitude: true,
            longitude: true,
          },
        },
      },
      take: 20,
    });

    // Calculate distance if booking has coordinates
    const workersWithDistance = availableWorkers.map((worker) => {
      let distance = null;
      if (
        booking.latitude &&
        booking.longitude &&
        worker.workerProfile?.latitude &&
        worker.workerProfile?.longitude
      ) {
        distance = calculateDistance(
          booking.latitude,
          booking.longitude,
          worker.workerProfile.latitude,
          worker.workerProfile.longitude
        );
      }
      return { ...worker, distance };
    });

    // Sort by distance if available, otherwise by rating
    workersWithDistance.sort((a, b) => {
      if (a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }
      const ratingA = a.workerProfile?.averageRating || 0;
      const ratingB = b.workerProfile?.averageRating || 0;
      return ratingB - ratingA;
    });

    return NextResponse.json({ workers: workersWithDistance });
  } catch (error) {
    console.error("Error finding available workers:", error);
    return NextResponse.json(
      { error: "Failed to find available workers" },
      { status: 500 }
    );
  }
}

// Haversine formula to calculate distance between two points
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
  return Math.round(R * c * 10) / 10;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
