import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  emitLocationUpdate,
  emitTrackingStarted,
  emitTrackingStopped,
} from "@/lib/tracking-events";

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

// Estimate arrival time based on distance (avg 30 km/h in urban areas)
function estimateArrival(distanceKm: number): Date {
  const avgSpeedKmH = 30;
  const minutesToArrive = (distanceKm / avgSpeedKmH) * 60;
  return new Date(Date.now() + minutesToArrive * 60 * 1000);
}

// GET - Get worker's current location (for customer)
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
        customerId: true,
        workerId: true,
        trackingActive: true,
        workerLatitude: true,
        workerLongitude: true,
        lastLocationUpdate: true,
        estimatedArrival: true,
        latitude: true,
        longitude: true,
        address: true,
        status: true,
        worker: {
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

    // Only customer or worker can view tracking
    if (
      booking.customerId !== session.user.id &&
      booking.workerId !== session.user.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Calculate distance if tracking is active
    let distanceKm: number | null = null;
    if (
      booking.trackingActive &&
      booking.workerLatitude &&
      booking.workerLongitude &&
      booking.latitude &&
      booking.longitude
    ) {
      distanceKm = Math.round(
        calculateDistance(
          booking.workerLatitude,
          booking.workerLongitude,
          booking.latitude,
          booking.longitude
        ) * 10
      ) / 10;
    }

    return NextResponse.json({
      trackingActive: booking.trackingActive,
      workerLocation: booking.trackingActive
        ? {
            latitude: booking.workerLatitude,
            longitude: booking.workerLongitude,
            lastUpdate: booking.lastLocationUpdate,
          }
        : null,
      destination: {
        latitude: booking.latitude,
        longitude: booking.longitude,
        address: booking.address,
      },
      estimatedArrival: booking.estimatedArrival,
      distanceKm,
      workerName: `${booking.worker.firstName} ${booking.worker.lastName}`,
      status: booking.status,
    });
  } catch (error) {
    console.error("Error fetching tracking:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracking" },
      { status: 500 }
    );
  }
}

// POST - Update worker's location or toggle tracking
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
    const { latitude, longitude, action } = body;

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        workerId: true,
        latitude: true,
        longitude: true,
        status: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only worker can update tracking
    if (booking.workerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only worker can update tracking" },
        { status: 403 }
      );
    }

    // Only allow tracking for confirmed bookings
    if (!["CONFIRMED", "IN_PROGRESS"].includes(booking.status)) {
      return NextResponse.json(
        { error: "Tracking only available for confirmed bookings" },
        { status: 400 }
      );
    }

    // Handle start/stop tracking
    if (action === "start") {
      const estimatedArrival =
        latitude && longitude && booking.latitude && booking.longitude
          ? estimateArrival(
              calculateDistance(latitude, longitude, booking.latitude, booking.longitude)
            )
          : null;

      await prisma.booking.update({
        where: { id },
        data: {
          trackingActive: true,
          workerLatitude: latitude,
          workerLongitude: longitude,
          lastLocationUpdate: new Date(),
          estimatedArrival,
        },
      });

      // Emit real-time event
      await emitTrackingStarted(id);
      if (latitude && longitude) {
        const distanceKm =
          booking.latitude && booking.longitude
            ? calculateDistance(latitude, longitude, booking.latitude, booking.longitude)
            : null;
        await emitLocationUpdate(
          id,
          { latitude, longitude },
          estimatedArrival,
          distanceKm
        );
      }

      return NextResponse.json({
        message: "Tracking started",
        trackingActive: true,
      });
    }

    if (action === "stop") {
      await prisma.booking.update({
        where: { id },
        data: {
          trackingActive: false,
          workerLatitude: null,
          workerLongitude: null,
          lastLocationUpdate: null,
          estimatedArrival: null,
        },
      });

      // Emit real-time event
      await emitTrackingStopped(id);

      return NextResponse.json({
        message: "Tracking stopped",
        trackingActive: false,
      });
    }

    // Update location
    if (latitude !== undefined && longitude !== undefined) {
      const distanceKm =
        booking.latitude && booking.longitude
          ? calculateDistance(latitude, longitude, booking.latitude, booking.longitude)
          : null;

      const estimatedArrival =
        booking.latitude && booking.longitude
          ? estimateArrival(
              calculateDistance(latitude, longitude, booking.latitude, booking.longitude)
            )
          : null;

      await prisma.booking.update({
        where: { id },
        data: {
          workerLatitude: latitude,
          workerLongitude: longitude,
          lastLocationUpdate: new Date(),
          estimatedArrival,
        },
      });

      // Emit real-time location update
      await emitLocationUpdate(id, { latitude, longitude }, estimatedArrival, distanceKm);

      return NextResponse.json({
        message: "Location updated",
        estimatedArrival,
      });
    }

    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating tracking:", error);
    return NextResponse.json(
      { error: "Failed to update tracking" },
      { status: 500 }
    );
  }
}
