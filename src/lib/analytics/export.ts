/**
 * Analytics Export Utilities
 */

interface ExportRow {
  [key: string]: string | number | boolean | null;
}

export function toCSV(data: ExportRow[], columns?: string[]): string {
  if (data.length === 0) return "";

  const headers = columns || Object.keys(data[0]);

  const rows = data.map((row) =>
    headers.map((header) => {
      const value = row[header];
      if (value === null || value === undefined) return "";
      if (typeof value === "string") {
        // Escape quotes and wrap in quotes if contains comma
        if (value.includes(",") || value.includes('"') || value.includes("\n")) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }
      return String(value);
    }).join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

export function generateBookingsExport(
  bookings: Array<{
    id: string;
    scheduledDate: Date;
    scheduledTime: string;
    status: string;
    totalPrice: number;
    serviceName: string;
    customerName: string;
    cleanerName: string;
  }>
): string {
  const data: ExportRow[] = bookings.map((b) => ({
    "Booking ID": b.id,
    Date: b.scheduledDate.toISOString().split("T")[0],
    Time: b.scheduledTime,
    Status: b.status,
    Service: b.serviceName,
    Customer: b.customerName,
    Cleaner: b.cleanerName,
    Amount: b.totalPrice,
  }));

  return toCSV(data);
}

export function generateEarningsExport(
  earnings: Array<{
    id: string;
    createdAt: Date;
    grossAmount: number;
    platformFee: number;
    amount: number;
    status: string;
    bookingId: string;
  }>
): string {
  const data: ExportRow[] = earnings.map((e) => ({
    "Earning ID": e.id,
    Date: e.createdAt.toISOString().split("T")[0],
    "Booking ID": e.bookingId,
    "Gross Amount": e.grossAmount,
    "Platform Fee": e.platformFee,
    "Net Amount": e.amount,
    Status: e.status,
  }));

  return toCSV(data);
}

export function generateRevenueExport(
  data: Array<{
    date: string;
    bookings: number;
    revenue: number;
    platformFees: number;
    refunds: number;
  }>
): string {
  const exportData: ExportRow[] = data.map((d) => ({
    Date: d.date,
    Bookings: d.bookings,
    Revenue: d.revenue,
    "Platform Fees": d.platformFees,
    Refunds: d.refunds,
    "Net Revenue": d.revenue - d.refunds,
  }));

  return toCSV(exportData);
}

export function createDownloadResponse(
  csv: string,
  filename: string
): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
