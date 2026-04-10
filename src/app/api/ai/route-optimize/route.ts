import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  scheduledTime: string;
  duration: number;
  address?: string;
}

interface OptimizedRoute {
  originalOrder: Location[];
  optimizedOrder: Location[];
  savings: {
    distanceKm: number;
    estimatedMinutes: number;
    percentImprovement: number;
  };
  totalDistance: number;
  totalDuration: number;
  legs: Array<{
    from: string;
    to: string;
    distanceKm: number;
    estimatedMinutes: number;
  }>;
  schedule: Array<{
    bookingId: string;
    arrivalTime: string;
    departureTime: string;
    address: string;
  }>;
}

// Haversine formula for distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Estimate travel time based on distance (assuming average 30 km/h in urban areas)
function estimateTravelTime(distanceKm: number): number {
  return Math.round((distanceKm / 30) * 60); // minutes
}

// Calculate total route distance
function calculateTotalDistance(locations: Location[], startLat?: number, startLon?: number): number {
  let total = 0;

  // Distance from start to first location
  if (startLat !== undefined && startLon !== undefined && locations.length > 0) {
    total += calculateDistance(startLat, startLon, locations[0].latitude, locations[0].longitude);
  }

  // Distance between locations
  for (let i = 0; i < locations.length - 1; i++) {
    total += calculateDistance(
      locations[i].latitude,
      locations[i].longitude,
      locations[i + 1].latitude,
      locations[i + 1].longitude
    );
  }

  return total;
}

// Nearest neighbor algorithm for route optimization
function optimizeRouteNearestNeighbor(
  locations: Location[],
  startLat?: number,
  startLon?: number
): Location[] {
  if (locations.length <= 2) return [...locations];

  const result: Location[] = [];
  const remaining = [...locations];

  // Start from the location closest to start point, or first location
  let currentLat = startLat ?? locations[0].latitude;
  let currentLon = startLon ?? locations[0].longitude;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = calculateDistance(currentLat, currentLon, remaining[i].latitude, remaining[i].longitude);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    const nearest = remaining.splice(nearestIdx, 1)[0];
    result.push(nearest);
    currentLat = nearest.latitude;
    currentLon = nearest.longitude;
  }

  return result;
}

// 2-opt improvement algorithm
function optimizeRoute2Opt(locations: Location[]): Location[] {
  if (locations.length <= 3) return locations;

  let improved = true;
  let route = [...locations];

  while (improved) {
    improved = false;

    for (let i = 0; i < route.length - 2; i++) {
      for (let j = i + 2; j < route.length; j++) {
        // Calculate current distance
        const d1 = calculateDistance(
          route[i].latitude, route[i].longitude,
          route[i + 1].latitude, route[i + 1].longitude
        );
        const d2 = j + 1 < route.length
          ? calculateDistance(
              route[j].latitude, route[j].longitude,
              route[j + 1].latitude, route[j + 1].longitude
            )
          : 0;

        // Calculate new distance after swap
        const d3 = calculateDistance(
          route[i].latitude, route[i].longitude,
          route[j].latitude, route[j].longitude
        );
        const d4 = j + 1 < route.length
          ? calculateDistance(
              route[i + 1].latitude, route[i + 1].longitude,
              route[j + 1].latitude, route[j + 1].longitude
            )
          : 0;

        if (d1 + d2 > d3 + d4) {
          // Reverse the segment between i+1 and j
          const newRoute = [
            ...route.slice(0, i + 1),
            ...route.slice(i + 1, j + 1).reverse(),
            ...route.slice(j + 1),
          ];
          route = newRoute;
          improved = true;
        }
      }
    }
  }

  return route;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { date, bookingIds, startLocation } = await request.json();

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    // Get the worker's bookings for the specified date
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      cleanerId: session.user.id,
      scheduledDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: { in: ["CONFIRMED", "PENDING"] },
    };

    if (bookingIds && bookingIds.length > 0) {
      where.id = { in: bookingIds };
    }

    const bookings = await prisma.booking.findMany({
      where,
      select: {
        id: true,
        scheduledTime: true,
        duration: true,
        address: true,
        city: true,
        latitude: true,
        longitude: true,
        customer: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { scheduledTime: "asc" },
    });

    if (bookings.length === 0) {
      return NextResponse.json({
        message: "No bookings found for optimization",
        bookings: [],
      });
    }

    // Filter bookings with valid coordinates
    const locationsWithCoords = bookings.filter(b => b.latitude && b.longitude);

    if (locationsWithCoords.length < 2) {
      return NextResponse.json({
        message: "Need at least 2 bookings with coordinates for optimization",
        bookings: bookings.map(b => ({
          id: b.id,
          time: b.scheduledTime,
          address: b.address,
          customer: `${b.customer.firstName} ${b.customer.lastName}`,
        })),
      });
    }

    // Convert to Location format
    const locations: Location[] = locationsWithCoords.map(b => ({
      id: b.id,
      name: `${b.customer.firstName} ${b.customer.lastName}`,
      latitude: b.latitude!,
      longitude: b.longitude!,
      scheduledTime: b.scheduledTime,
      duration: b.duration,
      address: b.address || b.city || "",
    }));

    // Get worker's start location
    const worker = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        workerProfile: {
          select: { latitude: true, longitude: true },
        },
      },
    });

    const startLat = startLocation?.latitude ?? worker?.workerProfile?.latitude;
    const startLon = startLocation?.longitude ?? worker?.workerProfile?.longitude;

    // Calculate original route distance
    const originalDistance = calculateTotalDistance(locations, startLat, startLon);

    // Optimize route
    let optimizedLocations = optimizeRouteNearestNeighbor(locations, startLat, startLon);
    optimizedLocations = optimizeRoute2Opt(optimizedLocations);

    // Calculate optimized route distance
    const optimizedDistance = calculateTotalDistance(optimizedLocations, startLat, startLon);

    // Calculate savings
    const distanceSaved = originalDistance - optimizedDistance;
    const timeSaved = estimateTravelTime(distanceSaved);
    const percentImprovement = originalDistance > 0
      ? (distanceSaved / originalDistance) * 100
      : 0;

    // Build route legs
    const legs: OptimizedRoute["legs"] = [];
    let prevLat = startLat;
    let prevLon = startLon;
    let prevName = "Start";

    for (const loc of optimizedLocations) {
      if (prevLat !== undefined && prevLon !== undefined) {
        const dist = calculateDistance(prevLat, prevLon, loc.latitude, loc.longitude);
        legs.push({
          from: prevName,
          to: loc.name,
          distanceKm: Math.round(dist * 10) / 10,
          estimatedMinutes: estimateTravelTime(dist),
        });
      }
      prevLat = loc.latitude;
      prevLon = loc.longitude;
      prevName = loc.name;
    }

    // Calculate total duration including travel and work
    const totalTravelTime = legs.reduce((sum, leg) => sum + leg.estimatedMinutes, 0);
    const totalWorkTime = optimizedLocations.reduce((sum, loc) => sum + loc.duration, 0);

    // Build schedule with arrival/departure times
    const schedule: OptimizedRoute["schedule"] = [];
    let currentTime = parseTime(optimizedLocations[0].scheduledTime);

    // Adjust for travel from start
    if (legs.length > 0) {
      currentTime -= legs[0].estimatedMinutes;
    }

    for (let i = 0; i < optimizedLocations.length; i++) {
      const loc = optimizedLocations[i];

      // Add travel time to get arrival
      if (i > 0) {
        currentTime += legs[i].estimatedMinutes;
      } else if (legs.length > 0) {
        currentTime += legs[0].estimatedMinutes;
      }

      const arrivalTime = formatTime(currentTime);
      currentTime += loc.duration;
      const departureTime = formatTime(currentTime);

      schedule.push({
        bookingId: loc.id,
        arrivalTime,
        departureTime,
        address: loc.address || "",
      });
    }

    const result: OptimizedRoute = {
      originalOrder: locations,
      optimizedOrder: optimizedLocations,
      savings: {
        distanceKm: Math.round(distanceSaved * 10) / 10,
        estimatedMinutes: timeSaved,
        percentImprovement: Math.round(percentImprovement),
      },
      totalDistance: Math.round(optimizedDistance * 10) / 10,
      totalDuration: totalTravelTime + totalWorkTime,
      legs,
      schedule,
    };

    return NextResponse.json({
      route: result,
      metadata: {
        bookingsOptimized: optimizedLocations.length,
        date: date,
        startLocation: startLat && startLon ? { latitude: startLat, longitude: startLon } : null,
      },
    });
  } catch (error) {
    console.error("Route Optimization error:", error);
    return NextResponse.json(
      { error: "Failed to optimize route" },
      { status: 500 }
    );
  }
}

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}
