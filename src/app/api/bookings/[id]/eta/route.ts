import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendNotification } from "@/lib/notifications";
import { EtaStatus } from "@prisma/client";

const updateEtaSchema = z.object({
  status: z.enum(["ON_THE_WAY", "ARRIVED", "STARTED", "COMPLETED"]),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  estimatedArrival: z.string().datetime().optional(), // ISO datetime
});

// POST: Worker updates their ETA/travel status for a booking
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId } = await params;

    const body = await request.json();
    const validationResult = updateEtaSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { status, latitude, longitude, estimatedArrival } =
      validationResult.data;

    // Get the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: {
          select: { id: true, firstName: true, email: true },
        },
        cleaner: {
          select: { id: true, firstName: true },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Verify the user is the worker for this booking
    if (booking.cleanerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the assigned worker can update ETA" },
        { status: 403 }
      );
    }

    // Verify booking is in a valid state
    if (!["CONFIRMED", "IN_PROGRESS"].includes(booking.status)) {
      return NextResponse.json(
        { error: "Booking is not in a valid state for ETA updates" },
        { status: 400 }
      );
    }

    // Calculate ETA if location provided but no estimatedArrival
    let eta = estimatedArrival;
    if (
      latitude &&
      longitude &&
      !estimatedArrival &&
      booking.latitude &&
      booking.longitude
    ) {
      // Simple distance-based ETA calculation (very rough)
      const distance = calculateDistance(
        latitude,
        longitude,
        booking.latitude,
        booking.longitude
      );
      // Assume average speed of 30 km/h in city
      const travelTimeMinutes = Math.ceil((distance / 30) * 60);
      const etaDate = new Date(Date.now() + travelTimeMinutes * 60 * 1000);
      eta = etaDate.toISOString();
    }

    // Update booking status if needed
    let newBookingStatus = booking.status;
    if (status === "STARTED" && booking.status === "CONFIRMED") {
      newBookingStatus = "IN_PROGRESS";
    } else if (status === "COMPLETED") {
      newBookingStatus = "COMPLETED";
    }

    // Update booking with ETA info using proper database fields
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: newBookingStatus,
        etaStatus: status as EtaStatus,
        estimatedArrival: eta ? new Date(eta) : undefined,
        cleanerLatitude: latitude,
        cleanerLongitude: longitude,
        lastLocationUpdate: latitude && longitude ? new Date() : undefined,
        trackingActive: status === "ON_THE_WAY" || status === "ARRIVED",
      },
    });

    // Calculate ETA minutes for notification
    let etaMinutes: number | undefined;
    if (eta) {
      etaMinutes = Math.ceil((new Date(eta).getTime() - Date.now()) / 60000);
      if (etaMinutes < 0) etaMinutes = undefined;
    }

    // Send push notification to customer about ETA update
    const workerName = `${booking.cleaner?.firstName || "Your worker"}`;
    sendNotification(booking.customerId, "BOOKING_ETA_UPDATE", {
      bookingId,
      workerName,
      etaStatus: status,
      etaMinutes,
    }, {
      actionUrl: `/bookings/${bookingId}`,
      forceChannels: ["PUSH"],
    }).catch(console.error);

    return NextResponse.json({
      message: "ETA updated",
      booking: {
        id: updatedBooking.id,
        status: updatedBooking.status,
        etaStatus: status,
        estimatedArrival: eta,
        workerLocation:
          latitude && longitude ? { latitude, longitude } : null,
      },
    });
  } catch (error) {
    console.error("Error updating booking ETA:", error);
    return NextResponse.json(
      { error: "Failed to update ETA" },
      { status: 500 }
    );
  }
}

// GET: Customer checks worker's ETA for a booking
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        cleaner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            latitude: true,
            longitude: true,
            locationVerifiedAt: true,
            workerProfile: {
              select: {
                latitude: true,
                longitude: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Verify the user is the customer or worker for this booking
    if (
      booking.customerId !== session.user.id &&
      booking.cleanerId !== session.user.id
    ) {
      return NextResponse.json(
        { error: "Not authorized to view this booking" },
        { status: 403 }
      );
    }

    // Use real-time cleaner location from booking if available, otherwise fall back to profile
    const workerLat =
      booking.cleanerLatitude ||
      booking.cleaner?.workerProfile?.latitude ||
      booking.cleaner?.latitude;
    const workerLng =
      booking.cleanerLongitude ||
      booking.cleaner?.workerProfile?.longitude ||
      booking.cleaner?.longitude;
    const locationLastUpdated =
      booking.lastLocationUpdate || booking.cleaner?.locationVerifiedAt;

    // Calculate distance if both locations available
    let distance = null;
    let estimatedMinutes = null;

    if (workerLat && workerLng && booking.latitude && booking.longitude) {
      distance = calculateDistance(
        workerLat,
        workerLng,
        booking.latitude,
        booking.longitude
      );
      // Assume 30 km/h average speed
      estimatedMinutes = Math.ceil((distance / 30) * 60);
    }

    // Use estimatedArrival if set, otherwise calculate from distance
    if (booking.estimatedArrival) {
      const minutesUntil = Math.ceil(
        (booking.estimatedArrival.getTime() - Date.now()) / 60000
      );
      if (minutesUntil > 0) {
        estimatedMinutes = minutesUntil;
      }
    }

    return NextResponse.json({
      booking: {
        id: booking.id,
        status: booking.status,
        scheduledDate: booking.scheduledDate,
        scheduledTime: booking.scheduledTime,
        trackingActive: booking.trackingActive,
      },
      worker: booking.cleaner
        ? {
            id: booking.cleaner.id,
            firstName: booking.cleaner.firstName,
            lastName: booking.cleaner.lastName,
            avatar: booking.cleaner.avatar,
            location:
              workerLat && workerLng
                ? {
                    latitude: workerLat,
                    longitude: workerLng,
                    lastUpdated: locationLastUpdated?.toISOString(),
                  }
                : null,
          }
        : null,
      eta: {
        status: booking.etaStatus,
        estimatedArrival: booking.estimatedArrival?.toISOString(),
        distanceKm: distance ? Math.round(distance * 10) / 10 : null,
        estimatedMinutes,
      },
      customerLocation:
        booking.latitude && booking.longitude
          ? {
              latitude: booking.latitude,
              longitude: booking.longitude,
              address: booking.address,
            }
          : null,
    });
  } catch (error) {
    console.error("Error getting booking ETA:", error);
    return NextResponse.json({ error: "Failed to get ETA" }, { status: 500 });
  }
}

// Haversine formula to calculate distance between two points in km
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
