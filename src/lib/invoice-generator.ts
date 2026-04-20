/**
 * Invoice PDF Generator
 * Creates professional PDF invoices using PDFKit
 */

import PDFDocument from "pdfkit";

export interface InvoiceData {
  invoiceNumber: string;
  createdAt: Date;
  customer: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  worker: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  service: {
    name: string;
    date: Date;
    time: string;
    duration: number; // minutes
    address: string;
  };
  subtotal: number;
  tipAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: string;
  paidAt?: Date;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  CHF: "CHF ",
};

function formatCurrency(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
  return `${symbol}${amount.toFixed(2)}`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

export function getInvoiceFilename(invoiceNumber: string): string {
  return `${invoiceNumber.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf`;
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const chunks: Buffer[] = [];

      // Create PDF document
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: `Invoice ${data.invoiceNumber}`,
          Author: "Servantana",
          Subject: `Invoice for ${data.service.name}`,
        },
      });

      // Collect chunks
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width - 100; // 50px margins on each side

      // Header - Company branding
      doc
        .fontSize(28)
        .fillColor("#2563eb")
        .text("SERVANTANA", 50, 50, { align: "left" });

      doc
        .fontSize(10)
        .fillColor("#6b7280")
        .text("Professional Services Marketplace", 50, 82);

      // Invoice badge (top right)
      doc
        .fontSize(24)
        .fillColor("#1f2937")
        .text("INVOICE", 350, 50, { align: "right", width: pageWidth - 300 });

      // Invoice number and date
      doc
        .fontSize(10)
        .fillColor("#6b7280")
        .text(`Invoice #: ${data.invoiceNumber}`, 350, 82, {
          align: "right",
          width: pageWidth - 300,
        })
        .text(`Date: ${formatDate(data.createdAt)}`, 350, 96, {
          align: "right",
          width: pageWidth - 300,
        });

      // Status badge
      const statusColors: Record<string, string> = {
        PAID: "#10b981",
        PENDING: "#f59e0b",
        CANCELLED: "#ef4444",
        REFUNDED: "#8b5cf6",
      };
      const statusColor = statusColors[data.status] || "#6b7280";

      doc
        .roundedRect(440, 115, 70, 22, 4)
        .fillColor(statusColor)
        .fill();

      doc
        .fontSize(10)
        .fillColor("#ffffff")
        .text(data.status, 440, 120, { align: "center", width: 70 });

      // Horizontal line
      doc
        .moveTo(50, 160)
        .lineTo(pageWidth + 50, 160)
        .strokeColor("#e5e7eb")
        .stroke();

      // Bill To / From sections
      let yPos = 180;

      // Bill To (Customer)
      doc
        .fontSize(10)
        .fillColor("#6b7280")
        .text("BILL TO", 50, yPos);

      doc
        .fontSize(12)
        .fillColor("#1f2937")
        .text(data.customer.name, 50, yPos + 16);

      doc
        .fontSize(10)
        .fillColor("#6b7280")
        .text(data.customer.email, 50, yPos + 32);

      if (data.customer.phone) {
        doc.text(data.customer.phone, 50, yPos + 46);
      }

      // Service Provider (Worker)
      doc
        .fontSize(10)
        .fillColor("#6b7280")
        .text("SERVICE PROVIDER", 300, yPos);

      doc
        .fontSize(12)
        .fillColor("#1f2937")
        .text(data.worker.name, 300, yPos + 16);

      doc
        .fontSize(10)
        .fillColor("#6b7280")
        .text(data.worker.email, 300, yPos + 32);

      if (data.worker.phone) {
        doc.text(data.worker.phone, 300, yPos + 46);
      }

      if (data.worker.address) {
        doc.text(data.worker.address, 300, yPos + 60, { width: 200 });
      }

      // Service Details Section
      yPos = 290;

      doc
        .fontSize(12)
        .fillColor("#1f2937")
        .text("SERVICE DETAILS", 50, yPos);

      // Service details box
      doc
        .roundedRect(50, yPos + 20, pageWidth, 80, 4)
        .fillColor("#f9fafb")
        .fill();

      doc
        .fontSize(10)
        .fillColor("#6b7280")
        .text("Service", 65, yPos + 35)
        .text("Date", 250, yPos + 35)
        .text("Time", 350, yPos + 35)
        .text("Duration", 450, yPos + 35);

      doc
        .fontSize(11)
        .fillColor("#1f2937")
        .text(data.service.name, 65, yPos + 52, { width: 170 })
        .text(formatDate(data.service.date), 250, yPos + 52)
        .text(data.service.time, 350, yPos + 52)
        .text(formatDuration(data.service.duration), 450, yPos + 52);

      // Service address
      doc
        .fontSize(10)
        .fillColor("#6b7280")
        .text("Location:", 65, yPos + 75);

      doc
        .fontSize(10)
        .fillColor("#1f2937")
        .text(data.service.address, 120, yPos + 75, { width: 380 });

      // Line Items Table
      yPos = 410;

      // Table header
      doc
        .rect(50, yPos, pageWidth, 30)
        .fillColor("#f3f4f6")
        .fill();

      doc
        .fontSize(10)
        .fillColor("#6b7280")
        .text("Description", 65, yPos + 10)
        .text("Amount", 450, yPos + 10, { align: "right", width: 80 });

      // Service line item
      yPos += 40;

      doc
        .fontSize(11)
        .fillColor("#1f2937")
        .text(`${data.service.name} - ${formatDuration(data.service.duration)}`, 65, yPos)
        .text(formatCurrency(data.subtotal, data.currency), 450, yPos, {
          align: "right",
          width: 80,
        });

      // Tip (if any)
      if (data.tipAmount > 0) {
        yPos += 25;
        doc
          .fontSize(11)
          .fillColor("#1f2937")
          .text("Tip", 65, yPos)
          .text(formatCurrency(data.tipAmount, data.currency), 450, yPos, {
            align: "right",
            width: 80,
          });
      }

      // Subtotal line
      yPos += 35;
      doc
        .moveTo(350, yPos)
        .lineTo(545, yPos)
        .strokeColor("#e5e7eb")
        .stroke();

      yPos += 10;
      doc
        .fontSize(10)
        .fillColor("#6b7280")
        .text("Subtotal", 350, yPos)
        .text(
          formatCurrency(data.subtotal + data.tipAmount, data.currency),
          450,
          yPos,
          { align: "right", width: 80 }
        );

      // Tax (if any)
      if (data.taxRate > 0) {
        yPos += 20;
        doc
          .fontSize(10)
          .fillColor("#6b7280")
          .text(`Tax (${data.taxRate}%)`, 350, yPos)
          .text(formatCurrency(data.taxAmount, data.currency), 450, yPos, {
            align: "right",
            width: 80,
          });
      }

      // Total
      yPos += 30;
      doc
        .rect(340, yPos - 5, 210, 35)
        .fillColor("#2563eb")
        .fill();

      doc
        .fontSize(12)
        .fillColor("#ffffff")
        .text("TOTAL", 360, yPos + 5)
        .fontSize(14)
        .text(formatCurrency(data.totalAmount, data.currency), 450, yPos + 3, {
          align: "right",
          width: 85,
        });

      // Payment info (if paid)
      if (data.paidAt) {
        yPos += 50;
        doc
          .fontSize(10)
          .fillColor("#10b981")
          .text(`✓ Paid on ${formatDate(data.paidAt)}`, 350, yPos, {
            align: "right",
            width: 180,
          });
      }

      // Footer
      const footerY = doc.page.height - 80;

      doc
        .moveTo(50, footerY)
        .lineTo(pageWidth + 50, footerY)
        .strokeColor("#e5e7eb")
        .stroke();

      doc
        .fontSize(9)
        .fillColor("#9ca3af")
        .text("Thank you for using Servantana!", 50, footerY + 15, {
          align: "center",
          width: pageWidth,
        })
        .text(
          "Questions? Contact support@servantana.com",
          50,
          footerY + 30,
          { align: "center", width: pageWidth }
        )
        .text("www.servantana.com", 50, footerY + 45, {
          align: "center",
          width: pageWidth,
        });

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
