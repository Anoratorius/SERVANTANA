/**
 * Send Invoice Email Endpoint
 * Emails invoice PDF to the customer
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import {
  generateInvoicePDF,
  getInvoiceFilename,
  type InvoiceData,
} from "@/lib/invoice-generator";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Servantana <noreply@servantana.com>";

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

    // Parse optional email override from body
    let targetEmail: string | undefined;
    try {
      const body = await request.json();
      targetEmail = body.email;
    } catch {
      // No body or invalid JSON - use customer email
    }

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
        cleaner: {
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

    // Only worker or admin can send invoices
    const isWorker = invoice.cleanerId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isWorker && !isAdmin) {
      return NextResponse.json(
        { error: "Only the service provider or admin can send invoices" },
        { status: 403 }
      );
    }

    // Build invoice data for PDF
    const workerProfile = invoice.cleaner.workerProfile;
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
        name: `${invoice.cleaner.firstName} ${invoice.cleaner.lastName}`,
        email: invoice.cleaner.email,
        phone: invoice.cleaner.phone || undefined,
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

    // Determine recipient email
    const recipientEmail = targetEmail || invoice.customer.email;

    // Format currency for email
    const currencySymbols: Record<string, string> = {
      EUR: "\u20AC",
      USD: "$",
      GBP: "\u00A3",
    };
    const symbol = currencySymbols[invoice.currency] || invoice.currency;
    const formattedTotal = `${symbol}${invoice.totalAmount.toFixed(2)}`;

    // Send email with PDF attachment
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject: `Invoice ${invoice.invoiceNumber} from Servantana`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; font-size: 28px; margin: 0;">SERVANTANA</h1>
              <p style="color: #6b7280; margin: 5px 0 0 0;">Professional Services Marketplace</p>
            </div>

            <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h2 style="margin: 0 0 10px 0; font-size: 20px;">Invoice ${invoice.invoiceNumber}</h2>
              <p style="margin: 0; color: #6b7280;">Service: ${invoice.serviceName}</p>
              <p style="margin: 5px 0 0 0; color: #6b7280;">Date: ${new Date(invoice.serviceDate).toLocaleDateString()}</p>
            </div>

            <div style="background: #2563eb; color: white; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 14px; opacity: 0.9;">Total Amount</p>
              <p style="margin: 10px 0 0 0; font-size: 32px; font-weight: bold;">${formattedTotal}</p>
            </div>

            <p style="margin-bottom: 20px;">
              Hello ${invoice.customer.firstName},
            </p>

            <p style="margin-bottom: 20px;">
              Please find attached your invoice for the service provided by
              <strong>${invoice.cleaner.firstName} ${invoice.cleaner.lastName}</strong>.
            </p>

            <p style="margin-bottom: 20px;">
              The PDF invoice is attached to this email for your records.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="color: #6b7280; font-size: 12px; text-align: center;">
              Thank you for using Servantana!<br>
              If you have any questions, please contact support@servantana.com
            </p>
          </body>
        </html>
      `,
      attachments: [
        {
          filename,
          content: pdfBuffer.toString("base64"),
        },
      ],
    });

    if (error) {
      console.error("Error sending invoice email:", error);
      return NextResponse.json(
        { error: "Failed to send invoice email" },
        { status: 500 }
      );
    }

    // Update invoice with sent info
    await prisma.invoice.update({
      where: { id },
      data: {
        sentAt: new Date(),
        sentTo: recipientEmail,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Invoice sent to ${recipientEmail}`,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error sending invoice:", error);
    return NextResponse.json(
      { error: "Failed to send invoice" },
      { status: 500 }
    );
  }
}
