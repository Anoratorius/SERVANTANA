/**
 * Invoice PDF Download Endpoint
 * Generates and returns PDF for a specific invoice
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateInvoicePDF,
  getInvoiceFilename,
  type InvoiceData,
} from "@/lib/invoice-generator";

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

    // Fetch invoice with related data
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        worker: {
          select: {
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
        booking: {
          select: {
            address: true,
            city: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Only customer, worker, or admin can download
    const isCustomer = invoice.customerId === session.user.id;
    const isWorker = invoice.workerId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isCustomer && !isWorker && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build invoice data for PDF
    const workerProfile = invoice.worker.workerProfile;
    const workerAddress = workerProfile
      ? [workerProfile.address, workerProfile.city, workerProfile.state]
          .filter(Boolean)
          .join(", ")
      : undefined;

    const invoiceData: InvoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      createdAt: invoice.createdAt,
      customer: {
        name: `${invoice.customer.firstName} ${invoice.customer.lastName}`,
        email: invoice.customer.email,
        phone: invoice.customer.phone || undefined,
      },
      worker: {
        name: `${invoice.worker.firstName} ${invoice.worker.lastName}`,
        email: invoice.worker.email,
        phone: invoice.worker.phone || undefined,
        address: workerAddress,
      },
      service: {
        name: invoice.serviceName,
        date: invoice.serviceDate,
        time: invoice.serviceTime,
        duration: invoice.duration,
        address: invoice.address,
      },
      subtotal: invoice.subtotal,
      tipAmount: invoice.tipAmount,
      taxRate: invoice.taxRate,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      currency: invoice.currency,
      status: invoice.status,
      paidAt: invoice.paidAt || undefined,
    };

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoiceData);
    const filename = getInvoiceFilename(invoice.invoiceNumber);

    // Return PDF as download (convert Buffer to Uint8Array for NextResponse)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate invoice PDF" },
      { status: 500 }
    );
  }
}
