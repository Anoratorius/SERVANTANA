import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Generate invoice number
async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  // Find the last invoice number for this year
  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: { startsWith: prefix },
    },
    orderBy: { invoiceNumber: "desc" },
  });

  let nextNumber = 1;
  if (lastInvoice) {
    const lastNumber = parseInt(lastInvoice.invoiceNumber.split("-")[2], 10);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(5, "0")}`;
}

// GET - Get invoice for a booking
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
      include: {
        invoice: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        cleaner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            workerProfile: {
              select: {
                address: true,
                city: true,
                state: true,
              },
            },
          },
        },
        service: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only customer or worker can view invoice
    if (
      booking.customerId !== session.user.id &&
      booking.cleanerId !== session.user.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      invoice: booking.invoice,
      booking: {
        id: booking.id,
        status: booking.status,
        scheduledDate: booking.scheduledDate,
        scheduledTime: booking.scheduledTime,
        duration: booking.duration,
        address: booking.address,
        city: booking.city,
        totalPrice: booking.totalPrice,
        tipAmount: booking.tipAmount,
        currency: booking.currency,
        service: booking.service,
        customer: booking.customer,
        cleaner: booking.cleaner,
      },
    });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

// POST - Generate invoice for a booking
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

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        invoice: true,
        service: true,
        customer: true,
        cleaner: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only customer or worker can generate invoice
    if (
      booking.customerId !== session.user.id &&
      booking.cleanerId !== session.user.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only completed bookings can have invoices
    if (booking.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Can only generate invoices for completed bookings" },
        { status: 400 }
      );
    }

    // Check if invoice already exists
    if (booking.invoice) {
      return NextResponse.json({ invoice: booking.invoice });
    }

    // Generate invoice
    const invoiceNumber = await generateInvoiceNumber();
    const subtotal = booking.totalPrice;
    const tipAmount = booking.tipAmount || 0;
    const taxRate = 0; // Can be made configurable
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + tipAmount + taxAmount;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        bookingId: booking.id,
        customerId: booking.customerId,
        cleanerId: booking.cleanerId,
        subtotal,
        tipAmount,
        taxRate,
        taxAmount,
        totalAmount,
        currency: booking.currency,
        serviceName: booking.service?.name || "Cleaning Service",
        serviceDate: booking.scheduledDate,
        serviceTime: booking.scheduledTime,
        duration: booking.duration,
        address: `${booking.address}${booking.city ? `, ${booking.city}` : ""}`,
        status: "ISSUED",
      },
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error("Error generating invoice:", error);
    return NextResponse.json(
      { error: "Failed to generate invoice" },
      { status: 500 }
    );
  }
}
