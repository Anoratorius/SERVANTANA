"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Printer } from "lucide-react";
import { Link } from "@/i18n/navigation";

interface Invoice {
  id: string;
  invoiceNumber: string;
  bookingId: string;
  subtotal: number;
  tipAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  serviceName: string;
  serviceDate: string;
  serviceTime: string;
  duration: number;
  address: string;
  status: string;
  createdAt: string;
}

interface Booking {
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  cleaner: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    cleanerProfile: {
      address: string | null;
      city: string | null;
      state: string | null;
    } | null;
  };
}

const statusColors: Record<string, string> = {
  ISSUED: "bg-blue-100 text-blue-800",
  PAID: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function InvoiceDetailPage() {
  const t = useTranslations("invoice");
  const tCommon = useTranslations("common");
  const params = useParams();
  const { status: authStatus } = useSession();
  const printRef = useRef<HTMLDivElement>(null);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const invoiceId = params.id as string;

  useEffect(() => {
    async function fetchInvoice() {
      try {
        // First get the invoice to find the booking ID
        const invoicesRes = await fetch("/api/invoices");
        if (invoicesRes.ok) {
          const invoicesData = await invoicesRes.json();
          const inv = invoicesData.invoices.find(
            (i: Invoice) => i.id === invoiceId
          );
          if (inv) {
            setInvoice(inv);
            // Now fetch booking details
            const bookingRes = await fetch(
              `/api/bookings/${inv.bookingId}/invoice`
            );
            if (bookingRes.ok) {
              const bookingData = await bookingRes.json();
              setBooking(bookingData.booking);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching invoice:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (authStatus === "authenticated" && invoiceId) {
      fetchInvoice();
    }
  }, [authStatus, invoiceId]);

  const handlePrint = () => {
    window.print();
  };

  if (authStatus === "loading" || isLoading) {
    return <InvoiceDetailSkeleton />;
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">{t("notFound")}</h1>
            <Link href="/invoices">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {tCommon("back")}
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Actions - hidden in print */}
          <div className="flex items-center justify-between mb-6 print:hidden">
            <Link
              href="/invoices"
              className="inline-flex items-center text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {tCommon("back")}
            </Link>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                {t("print")}
              </Button>
            </div>
          </div>

          {/* Invoice Card */}
          <Card
            ref={printRef}
            className="p-8 print:shadow-none print:border-none"
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl font-bold text-blue-600">
                  {t("invoiceTitle")}
                </h1>
                <p className="text-xl font-mono mt-1">{invoice.invoiceNumber}</p>
              </div>
              <div className="text-right">
                <Badge className={`${statusColors[invoice.status]} print:hidden`}>
                  {t(`status.${invoice.status.toLowerCase()}`)}
                </Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("issuedOn")}:{" "}
                  {new Date(invoice.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* From / To */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-semibold text-muted-foreground mb-2">
                  {t("from")}
                </h3>
                {booking && (
                  <div>
                    <p className="font-medium">
                      {booking.cleaner.firstName} {booking.cleaner.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {booking.cleaner.email}
                    </p>
                    {booking.cleaner.phone && (
                      <p className="text-sm text-muted-foreground">
                        {booking.cleaner.phone}
                      </p>
                    )}
                    {booking.cleaner.cleanerProfile?.address && (
                      <p className="text-sm text-muted-foreground">
                        {booking.cleaner.cleanerProfile.address}
                        {booking.cleaner.cleanerProfile.city &&
                          `, ${booking.cleaner.cleanerProfile.city}`}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-muted-foreground mb-2">
                  {t("to")}
                </h3>
                {booking && (
                  <div>
                    <p className="font-medium">
                      {booking.customer.firstName} {booking.customer.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {booking.customer.email}
                    </p>
                    {booking.customer.phone && (
                      <p className="text-sm text-muted-foreground">
                        {booking.customer.phone}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Service Details */}
            <div className="border-t border-b py-6 mb-6">
              <h3 className="font-semibold mb-4">{t("serviceDetails")}</h3>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-muted-foreground text-sm">
                    <th className="pb-2">{t("description")}</th>
                    <th className="pb-2 text-right">{t("date")}</th>
                    <th className="pb-2 text-right">{t("duration")}</th>
                    <th className="pb-2 text-right">{t("amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2">
                      <p className="font-medium">{invoice.serviceName}</p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.address}
                      </p>
                    </td>
                    <td className="py-2 text-right">
                      {new Date(invoice.serviceDate).toLocaleDateString()}
                      <br />
                      <span className="text-sm text-muted-foreground">
                        {invoice.serviceTime}
                      </span>
                    </td>
                    <td className="py-2 text-right">{invoice.duration} min</td>
                    <td className="py-2 text-right font-medium">
                      ${invoice.subtotal.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64">
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">{t("subtotal")}</span>
                  <span>${invoice.subtotal.toFixed(2)}</span>
                </div>
                {invoice.tipAmount > 0 && (
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">{t("tipLabel")}</span>
                    <span>${invoice.tipAmount.toFixed(2)}</span>
                  </div>
                )}
                {invoice.taxAmount > 0 && (
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">
                      {t("tax")} ({invoice.taxRate}%)
                    </span>
                    <span>${invoice.taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-t font-bold text-lg">
                  <span>{t("total")}</span>
                  <span className="text-green-600">
                    ${invoice.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t text-center text-sm text-muted-foreground">
              <p>{t("thankYou")}</p>
              <p className="mt-2">Servantana • www.servantana.com</p>
            </div>
          </Card>
        </div>
      </main>

      <Footer />

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          [class*="print:"] {
            visibility: visible;
          }
          main {
            padding: 0 !important;
            background: white !important;
          }
          main > div > div:last-child {
            visibility: visible;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          main > div > div:last-child * {
            visibility: visible;
          }
        }
      `}</style>
    </div>
  );
}

function InvoiceDetailSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-96" />
        </div>
      </main>
      <Footer />
    </div>
  );
}
