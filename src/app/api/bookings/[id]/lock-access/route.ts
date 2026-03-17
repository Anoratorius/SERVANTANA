import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Generate a random 6-digit access code
function generateAccessCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// GET - Get lock access for a booking (cleaner view)
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

    // Get booking with property info
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        cleanerId: true,
        customerId: true,
        propertyId: true,
        status: true,
        scheduledDate: true,
        scheduledTime: true,
        duration: true,
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            smartLocks: {
              where: { isActive: true },
              select: {
                id: true,
                name: true,
                provider: true,
                batteryLevel: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only cleaner assigned to booking can access
    if (booking.cleanerId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if booking has a property with smart locks
    if (!booking.property || booking.property.smartLocks.length === 0) {
      return NextResponse.json({
        hasSmartLock: false,
        message: "No smart locks configured for this property",
      });
    }

    // Get active access codes for this booking
    const accessCodes = await prisma.smartLockAccess.findMany({
      where: {
        bookingId: id,
        cleanerId: session.user.id,
        status: "ACTIVE",
      },
      include: {
        lock: {
          select: {
            id: true,
            name: true,
            provider: true,
          },
        },
      },
    });

    return NextResponse.json({
      hasSmartLock: true,
      property: booking.property,
      accessCodes,
      bookingStatus: booking.status,
    });
  } catch (error) {
    console.error("Error fetching lock access:", error);
    return NextResponse.json(
      { error: "Failed to fetch lock access" },
      { status: 500 }
    );
  }
}

// POST - Request/generate access code for a booking
// This would be called by the property owner or auto-generated when booking is confirmed
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

    // Get booking with property info
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        cleanerId: true,
        customerId: true,
        propertyId: true,
        status: true,
        scheduledDate: true,
        scheduledTime: true,
        duration: true,
        property: {
          select: {
            id: true,
            ownerId: true,
            smartLocks: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only property owner can generate access codes
    if (booking.property?.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only property owner can generate access codes" },
        { status: 403 }
      );
    }

    if (!booking.property || booking.property.smartLocks.length === 0) {
      return NextResponse.json(
        { error: "No smart locks configured for this property" },
        { status: 400 }
      );
    }

    // Calculate valid window (30 mins before to 30 mins after estimated end)
    const bookingStart = new Date(booking.scheduledDate);
    const [hours, minutes] = booking.scheduledTime.split(":").map(Number);
    bookingStart.setHours(hours, minutes, 0, 0);

    const validFrom = new Date(bookingStart.getTime() - 30 * 60 * 1000); // 30 mins before
    const validUntil = new Date(
      bookingStart.getTime() + (booking.duration + 30) * 60 * 1000
    ); // duration + 30 mins after

    // Generate access codes for all locks
    const createdCodes = [];
    for (const lock of booking.property.smartLocks) {
      // Check if code already exists
      const existing = await prisma.smartLockAccess.findFirst({
        where: {
          lockId: lock.id,
          bookingId: id,
          status: "ACTIVE",
        },
      });

      if (!existing) {
        const access = await prisma.smartLockAccess.create({
          data: {
            lockId: lock.id,
            bookingId: id,
            cleanerId: booking.cleanerId,
            accessType: "TEMPORARY",
            accessCode: generateAccessCode(),
            validFrom,
            validUntil,
            maxUsage: 2, // Entry and exit
          },
          include: {
            lock: {
              select: {
                id: true,
                name: true,
                provider: true,
              },
            },
          },
        });
        createdCodes.push(access);
      }
    }

    return NextResponse.json({
      success: true,
      accessCodes: createdCodes,
      validFrom,
      validUntil,
    });
  } catch (error) {
    console.error("Error generating lock access:", error);
    return NextResponse.json(
      { error: "Failed to generate lock access" },
      { status: 500 }
    );
  }
}
