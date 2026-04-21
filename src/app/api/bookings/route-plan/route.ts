import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface BookingWithCoords {
  id: string;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  scheduledDate: Date;
  scheduledTime: string;
  duration: number;
  status: string;
  customer: {
    firstName: string;
    lastName: string;
    phone: string | null;
  };
  service: {
    name: string;
  } | null;
}

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

// Estimate travel time (assuming average speed of 30 km/h in urban areas)
function estimateTravelTime(distanceKm: number): number {
  const avgSpeedKmH = 30;
  return Math.round((distanceKm / avgSpeedKmH) * 60); // minutes
}

// Nearest neighbor algorithm for route optimization
function optimizeRoute(
  bookings: BookingWithCoords[],
  startLat?: number,
  startLon?: number
): BookingWithCoords[] {
  if (bookings.length <= 1) return bookings;

  // Filter bookings with valid coordinates
  const withCoords = bookings.filter(
    (b) => b.latitude !== null && b.longitude !== null
  );
  const withoutCoords = bookings.filter(
    (b) => b.latitude === null || b.longitude === null
  );

  if (withCoords.length === 0) return bookings;

  const optimized: BookingWithCoords[] = [];
  const remaining = [...withCoords];

  // Start from provided location or first booking
  let currentLat = startLat ?? withCoords[0].latitude!;
  let currentLon = startLon ?? withCoords[0].longitude!;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const distance = calculateDistance(
        currentLat,
        currentLon,
        remaining[i].latitude!,
        remaining[i].longitude!
      );
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    const nearest = remaining.splice(nearestIndex, 1)[0];
    optimized.push(nearest);
    currentLat = nearest.latitude!;
    currentLon = nearest.longitude!;
  }

  // Add bookings without coordinates at the end
  return [...optimized, ...withoutCoords];
}

// GET - Fetch today's bookings optimized for route
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only workers can access route planning
    if (session.user.role !== "WORKER") {
      return NextResponse.json(
        { error: "Only workers can access route planning" },
        { status: 403 }
      );
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch today's confirmed/pending bookings for this worker
    const bookings = await prisma.booking.findMany({
      where: {
        workerId: session.user.id,
        scheduledDate: {
          gte: today,
          lt: tomorrow,
        },
        status: {
          in: ["CONFIRMED", "PENDING", "IN_PROGRESS"],
        },
      },
      select: {
        id: true,
        address: true,
        city: true,
        latitude: true,
        longitude: true,
        scheduledDate: true,
        scheduledTime: true,
        duration: true,
        status: true,
        customer: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        service: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        scheduledTime: "asc",
      },
    });

    // Get worker's location as starting point
    const workerProfile = await prisma.workerProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        latitude: true,
        longitude: true,
      },
    });

    // Optimize route
    const optimizedBookings = optimizeRoute(
      bookings,
      workerProfile?.latitude ?? undefined,
      workerProfile?.longitude ?? undefined
    );

    // Calculate distances and travel times between stops
    const routeWithDistances = optimizedBookings.map((booking, index) => {
      let distanceFromPrevious = 0;
      let travelTimeMinutes = 0;

      if (index === 0 && workerProfile?.latitude && workerProfile?.longitude) {
        // Distance from worker's home to first stop
        if (booking.latitude && booking.longitude) {
          distanceFromPrevious = calculateDistance(
            workerProfile.latitude,
            workerProfile.longitude,
            booking.latitude,
            booking.longitude
          );
          travelTimeMinutes = estimateTravelTime(distanceFromPrevious);
        }
      } else if (index > 0) {
        const prevBooking = optimizedBookings[index - 1];
        if (
          prevBooking.latitude &&
          prevBooking.longitude &&
          booking.latitude &&
          booking.longitude
        ) {
          distanceFromPrevious = calculateDistance(
            prevBooking.latitude,
            prevBooking.longitude,
            booking.latitude,
            booking.longitude
          );
          travelTimeMinutes = estimateTravelTime(distanceFromPrevious);
        }
      }

      return {
        ...booking,
        distanceFromPrevious: Math.round(distanceFromPrevious * 10) / 10,
        travelTimeMinutes,
      };
    });

    // Calculate totals
    const totalDistance = routeWithDistances.reduce(
      (sum, b) => sum + b.distanceFromPrevious,
      0
    );
    const totalTravelTime = routeWithDistances.reduce(
      (sum, b) => sum + b.travelTimeMinutes,
      0
    );
    const totalServiceTime = routeWithDistances.reduce(
      (sum, b) => sum + b.duration,
      0
    );

    return NextResponse.json({
      bookings: routeWithDistances,
      summary: {
        totalStops: routeWithDistances.length,
        totalDistance: Math.round(totalDistance * 10) / 10,
        totalTravelTime,
        totalServiceTime,
        estimatedEndTime: calculateEndTime(routeWithDistances),
      },
      startLocation: workerProfile?.latitude
        ? {
            latitude: workerProfile.latitude,
            longitude: workerProfile.longitude,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching route plan:", error);
    return NextResponse.json(
      { error: "Failed to fetch route plan" },
      { status: 500 }
    );
  }
}

function calculateEndTime(
  bookings: Array<{
    scheduledTime: string;
    duration: number;
    travelTimeMinutes: number;
  }>
): string | null {
  if (bookings.length === 0) return null;

  const lastBooking = bookings[bookings.length - 1];
  const [hours, minutes] = lastBooking.scheduledTime.split(":").map(Number);

  const endDate = new Date();
  endDate.setHours(hours, minutes + lastBooking.duration, 0, 0);

  return endDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
