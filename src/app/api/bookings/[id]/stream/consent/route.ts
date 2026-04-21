import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/bookings/[id]/stream/consent
 * Check consent status for both parties
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId } = await params;

    // Get booking with stream info
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        liveStream: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        worker: {
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

    // Only customer or worker can view consent status
    const isCustomer = booking.customerId === session.user.id;
    const isWorker = booking.workerId === session.user.id;

    if (!isCustomer && !isWorker) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If no stream record exists, both consents are false
    if (!booking.liveStream) {
      return NextResponse.json({
        workerConsent: false,
        customerConsent: false,
        consentedAt: null,
        bothConsented: false,
        canStream: booking.status === "IN_PROGRESS",
        participants: {
          customer: {
            id: booking.customer.id,
            name: `${booking.customer.firstName} ${booking.customer.lastName}`,
            hasConsented: false,
          },
          worker: {
            id: booking.worker.id,
            name: `${booking.worker.firstName} ${booking.worker.lastName}`,
            hasConsented: false,
          },
        },
      });
    }

    const stream = booking.liveStream;

    return NextResponse.json({
      workerConsent: stream.workerConsent,
      customerConsent: stream.customerConsent,
      consentedAt: stream.consentedAt,
      bothConsented: stream.workerConsent && stream.customerConsent,
      canStream: booking.status === "IN_PROGRESS",
      participants: {
        customer: {
          id: booking.customer.id,
          name: `${booking.customer.firstName} ${booking.customer.lastName}`,
          hasConsented: stream.customerConsent,
        },
        worker: {
          id: booking.worker.id,
          name: `${booking.worker.firstName} ${booking.worker.lastName}`,
          hasConsented: stream.workerConsent,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching consent status:", error);
    return NextResponse.json(
      { error: "Failed to fetch consent status" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bookings/[id]/stream/consent
 * Record consent for streaming from worker or customer
 * Body: { consent: boolean }
 */
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
    const { consent } = body;

    if (typeof consent !== "boolean") {
      return NextResponse.json(
        { error: "Invalid consent value. Must be a boolean." },
        { status: 400 }
      );
    }

    // Get booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        liveStream: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Determine if user is customer or worker
    const isCustomer = booking.customerId === session.user.id;
    const isWorker = booking.workerId === session.user.id;

    if (!isCustomer && !isWorker) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build update data based on role
    const updateData: Record<string, unknown> = {};
    if (isWorker) {
      updateData.workerConsent = consent;
    } else {
      updateData.customerConsent = consent;
    }

    // Check if both will have consented after this update
    const existingWorkerConsent = isWorker
      ? consent
      : booking.liveStream?.workerConsent ?? false;
    const existingCustomerConsent = isCustomer
      ? consent
      : booking.liveStream?.customerConsent ?? false;

    if (existingWorkerConsent && existingCustomerConsent && consent) {
      updateData.consentedAt = new Date();
    }

    // Create or update stream record with consent
    const stream = await prisma.liveStream.upsert({
      where: { bookingId },
      create: {
        bookingId,
        workerId: booking.workerId,
        provider: "MUX",
        status: "INACTIVE",
        workerConsent: isWorker ? consent : false,
        customerConsent: isCustomer ? consent : false,
        consentedAt:
          isWorker && consent && existingCustomerConsent
            ? new Date()
            : isCustomer && consent && existingWorkerConsent
              ? new Date()
              : null,
      },
      update: updateData,
    });

    const bothConsented = stream.workerConsent && stream.customerConsent;

    return NextResponse.json({
      success: true,
      workerConsent: stream.workerConsent,
      customerConsent: stream.customerConsent,
      bothConsented,
      consentedAt: stream.consentedAt,
      message: consent
        ? bothConsented
          ? "Both parties have consented. Streaming can now begin."
          : "Consent recorded. Waiting for other party to consent."
        : "Consent withdrawn.",
    });
  } catch (error) {
    console.error("Error recording consent:", error);
    return NextResponse.json(
      { error: "Failed to record consent" },
      { status: 500 }
    );
  }
}
