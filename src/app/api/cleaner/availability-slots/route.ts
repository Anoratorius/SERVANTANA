import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cleanerId = searchParams.get("cleanerId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!cleanerId) {
      return NextResponse.json(
        { error: "cleanerId is required" },
        { status: 400 }
      );
    }

    // Get cleaner's availability schedule
    const cleanerProfile = await prisma.cleanerProfile.findUnique({
      where: { userId: cleanerId },
      include: {
        availability: {
          where: { isActive: true },
        },
      },
    });

    if (!cleanerProfile) {
      return NextResponse.json(
        { error: "Worker not found" },
        { status: 404 }
      );
    }

    // Get existing bookings for the date range
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate
      ? new Date(endDate)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default

    const existingBookings = await prisma.booking.findMany({
      where: {
        cleanerId,
        status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
        scheduledDate: {
          gte: start,
          lte: end,
        },
      },
      select: {
        scheduledDate: true,
        scheduledTime: true,
        duration: true,
      },
    });

    // Generate available slots
    const slots = generateAvailableSlots(
      cleanerProfile.availability,
      existingBookings,
      start,
      end
    );

    return NextResponse.json({ slots });
  } catch (error) {
    console.error("Error fetching availability slots:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability slots" },
      { status: 500 }
    );
  }
}

interface AvailabilityRecord {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface BookingRecord {
  scheduledDate: Date;
  scheduledTime: string;
  duration: number;
}

interface TimeSlot {
  date: string;
  time: string;
  available: boolean;
}

function generateAvailableSlots(
  availability: AvailabilityRecord[],
  bookings: BookingRecord[],
  startDate: Date,
  endDate: Date
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const SLOT_DURATION = 60; // 1 hour slots

  // Create a map of booked times for quick lookup
  const bookedTimes = new Map<string, Set<string>>();
  for (const booking of bookings) {
    const dateKey = booking.scheduledDate.toISOString().split("T")[0];
    if (!bookedTimes.has(dateKey)) {
      bookedTimes.set(dateKey, new Set());
    }

    // Mark the booking time and duration as booked
    const [startHour, startMin] = booking.scheduledTime.split(":").map(Number);
    const bookingEndMinutes = startHour * 60 + startMin + booking.duration;

    for (let mins = startHour * 60 + startMin; mins < bookingEndMinutes; mins += SLOT_DURATION) {
      const hour = Math.floor(mins / 60);
      const minute = mins % 60;
      bookedTimes.get(dateKey)!.add(`${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`);
    }
  }

  // Create availability map by day of week
  const availabilityMap = new Map<number, AvailabilityRecord>();
  for (const avail of availability) {
    availabilityMap.set(avail.dayOfWeek, avail);
  }

  // Iterate through each day
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    const dayAvailability = availabilityMap.get(dayOfWeek);
    const dateKey = currentDate.toISOString().split("T")[0];
    const bookedForDay = bookedTimes.get(dateKey) || new Set();

    if (dayAvailability) {
      const [startHour, startMin] = dayAvailability.startTime.split(":").map(Number);
      const [endHour, endMin] = dayAvailability.endTime.split(":").map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      for (let mins = startMinutes; mins < endMinutes; mins += SLOT_DURATION) {
        const hour = Math.floor(mins / 60);
        const minute = mins % 60;
        const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

        // Check if slot is in the future
        const slotDateTime = new Date(currentDate);
        slotDateTime.setHours(hour, minute, 0, 0);
        const isInFuture = slotDateTime > new Date();

        slots.push({
          date: dateKey,
          time: timeStr,
          available: isInFuture && !bookedForDay.has(timeStr),
        });
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return slots;
}
