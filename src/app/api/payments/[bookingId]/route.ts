import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Get payment details for a booking
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookingId } = await params;

    // Get the booking with payment
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payment: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Verify the user is the customer or cleaner
    if (booking.customerId !== session.user.id && booking.cleanerId !== session.user.id) {
      return NextResponse.json(
        { error: "You don't have access to this payment" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      payment: booking.payment,
      booking: {
        id: booking.id,
        totalPrice: booking.totalPrice,
        currency: booking.currency,
        status: booking.status,
      },
    });
  } catch (error) {
    console.error("Error fetching payment:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment details" },
      { status: 500 }
    );
  }
}
