/**
 * Invoice PDF Generator
 * Generates professional PDF invoices using @react-pdf/renderer
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

// Invoice data structure
export interface InvoiceData {
  invoiceNumber: string;
  createdAt: Date;
  dueDate?: Date;

  // Customer info
  customer: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };

  // Worker/Company info
  worker: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };

  // Service details
  service: {
    name: string;
    date: Date;
    time: string;
    duration: number; // minutes
    address: string;
  };

  // Amounts
  subtotal: number;
  tipAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;

  // Status
  status: string;
  paidAt?: Date;
}

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
    paddingBottom: 20,
  },
  logo: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2563eb",
    fontFamily: "Helvetica-Bold",
  },
  invoiceTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1f2937",
    fontFamily: "Helvetica-Bold",
  },
  invoiceNumber: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  infoSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  infoBlock: {
    width: "45%",
  },
  infoLabel: {
    fontSize: 10,
    color: "#6b7280",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 11,
    color: "#1f2937",
    marginBottom: 2,
  },
  infoValueBold: {
    fontSize: 11,
    color: "#1f2937",
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  table: {
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableHeaderText: {
    fontSize: 10,
    color: "#6b7280",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  tableCol1: {
    width: "50%",
  },
  tableCol2: {
    width: "20%",
    textAlign: "center",
  },
  tableCol3: {
    width: "15%",
    textAlign: "right",
  },
  tableCol4: {
    width: "15%",
    textAlign: "right",
  },
  tableText: {
    fontSize: 10,
    color: "#1f2937",
  },
  tableTextBold: {
    fontSize: 10,
    color: "#1f2937",
    fontFamily: "Helvetica-Bold",
  },
  totalsSection: {
    marginLeft: "auto",
    width: "40%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  totalRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 10,
    color: "#6b7280",
  },
  totalValue: {
    fontSize: 10,
    color: "#1f2937",
    fontFamily: "Helvetica-Bold",
  },
  totalLabelFinal: {
    fontSize: 12,
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
  },
  totalValueFinal: {
    fontSize: 14,
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  statusPaid: {
    backgroundColor: "#dcfce7",
  },
  statusIssued: {
    backgroundColor: "#dbeafe",
  },
  statusText: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  statusTextPaid: {
    color: "#166534",
  },
  statusTextIssued: {
    color: "#1d4ed8",
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 20,
  },
  footerText: {
    fontSize: 9,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 4,
  },
  serviceDetails: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  serviceDetailRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  serviceDetailLabel: {
    fontSize: 9,
    color: "#6b7280",
    width: 80,
  },
  serviceDetailValue: {
    fontSize: 9,
    color: "#1f2937",
  },
});

// Format currency
function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    EUR: "\u20AC",
    USD: "$",
    GBP: "\u00A3",
  };
  const symbol = symbols[currency] || currency;
  return `${symbol}${amount.toFixed(2)}`;
}

// Format date
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Format duration
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

// Invoice PDF Document Component
function InvoiceDocument({ data }: { data: InvoiceData }) {
  const isPaid = data.status === "PAID";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>SERVANTANA</Text>
            <Text style={styles.invoiceNumber}>Professional Services Marketplace</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{data.invoiceNumber}</Text>
            <View
              style={[
                styles.statusBadge,
                isPaid ? styles.statusPaid : styles.statusIssued,
                { marginTop: 8 },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  isPaid ? styles.statusTextPaid : styles.statusTextIssued,
                ]}
              >
                {data.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Bill To / From Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Bill To</Text>
            <Text style={styles.infoValueBold}>{data.customer.name}</Text>
            <Text style={styles.infoValue}>{data.customer.email}</Text>
            {data.customer.phone && (
              <Text style={styles.infoValue}>{data.customer.phone}</Text>
            )}
            {data.customer.address && (
              <Text style={styles.infoValue}>{data.customer.address}</Text>
            )}
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Service Provider</Text>
            <Text style={styles.infoValueBold}>{data.worker.name}</Text>
            <Text style={styles.infoValue}>{data.worker.email}</Text>
            {data.worker.phone && (
              <Text style={styles.infoValue}>{data.worker.phone}</Text>
            )}
            {data.worker.address && (
              <Text style={styles.infoValue}>{data.worker.address}</Text>
            )}
          </View>
        </View>

        {/* Dates Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Invoice Date</Text>
            <Text style={styles.infoValue}>{formatDate(data.createdAt)}</Text>
          </View>
          {data.paidAt && (
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Paid Date</Text>
              <Text style={styles.infoValue}>{formatDate(data.paidAt)}</Text>
            </View>
          )}
        </View>

        {/* Service Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.tableCol1]}>Service</Text>
            <Text style={[styles.tableHeaderText, styles.tableCol2]}>Duration</Text>
            <Text style={[styles.tableHeaderText, styles.tableCol3]}>Rate</Text>
            <Text style={[styles.tableHeaderText, styles.tableCol4]}>Amount</Text>
          </View>

          <View style={styles.tableRow}>
            <View style={styles.tableCol1}>
              <Text style={styles.tableTextBold}>{data.service.name}</Text>
              <View style={styles.serviceDetails}>
                <View style={styles.serviceDetailRow}>
                  <Text style={styles.serviceDetailLabel}>Date:</Text>
                  <Text style={styles.serviceDetailValue}>
                    {formatDate(data.service.date)}
                  </Text>
                </View>
                <View style={styles.serviceDetailRow}>
                  <Text style={styles.serviceDetailLabel}>Time:</Text>
                  <Text style={styles.serviceDetailValue}>{data.service.time}</Text>
                </View>
                <View style={styles.serviceDetailRow}>
                  <Text style={styles.serviceDetailLabel}>Location:</Text>
                  <Text style={styles.serviceDetailValue}>{data.service.address}</Text>
                </View>
              </View>
            </View>
            <Text style={[styles.tableText, styles.tableCol2]}>
              {formatDuration(data.service.duration)}
            </Text>
            <Text style={[styles.tableText, styles.tableCol3]}>
              {formatCurrency(
                data.subtotal / (data.service.duration / 60),
                data.currency
              )}
              /hr
            </Text>
            <Text style={[styles.tableTextBold, styles.tableCol4]}>
              {formatCurrency(data.subtotal, data.currency)}
            </Text>
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(data.subtotal, data.currency)}
            </Text>
          </View>

          {data.tipAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tip</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(data.tipAmount, data.currency)}
              </Text>
            </View>
          )}

          {data.taxRate > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax ({data.taxRate}%)</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(data.taxAmount, data.currency)}
              </Text>
            </View>
          )}

          <View style={styles.totalRowFinal}>
            <Text style={styles.totalLabelFinal}>Total</Text>
            <Text style={styles.totalValueFinal}>
              {formatCurrency(data.totalAmount, data.currency)}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Thank you for using Servantana!
          </Text>
          <Text style={styles.footerText}>
            For questions about this invoice, please contact support@servantana.com
          </Text>
          <Text style={styles.footerText}>
            servantana.com
          </Text>
        </View>
      </Page>
    </Document>
  );
}

/**
 * Generate invoice PDF as Buffer
 */
export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  const buffer = await renderToBuffer(<InvoiceDocument data={data} />);
  return Buffer.from(buffer);
}

/**
 * Get filename for invoice PDF
 */
export function getInvoiceFilename(invoiceNumber: string): string {
  return `${invoiceNumber.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf`;
}
