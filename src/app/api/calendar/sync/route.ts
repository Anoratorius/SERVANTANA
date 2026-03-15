import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncBookingToCalendar } from "@/lib/calendar/sync";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId } = body;

    if (bookingId) {
      // Sync specific booking
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        return NextResponse.json(
          { error: "Booking not found" },
          { status: 404 }
        );
      }

      // Only cleaner can sync their bookings
      if (booking.cleanerId !== session.user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const results = await syncBookingToCalendar(bookingId, session.user.id);

      return NextResponse.json({
        success: results.every((r) => r.success),
        results,
      });
    } else {
      // Sync all upcoming bookings
      const bookings = await prisma.booking.findMany({
        where: {
          cleanerId: session.user.id,
          status: { in: ["PENDING", "CONFIRMED"] },
          scheduledDate: { gte: new Date() },
        },
        select: { id: true },
      });

      const allResults: Array<{ bookingId: string; results: unknown[] }> = [];

      for (const booking of bookings) {
        const results = await syncBookingToCalendar(booking.id, session.user.id);
        allResults.push({ bookingId: booking.id, results });
      }

      return NextResponse.json({
        success: true,
        syncedCount: bookings.length,
        results: allResults,
      });
    }
  } catch (error) {
    console.error("Error syncing calendar:", error);
    return NextResponse.json(
      { error: "Failed to sync calendar" },
      { status: 500 }
    );
  }
}
