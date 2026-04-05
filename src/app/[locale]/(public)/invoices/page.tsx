"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Eye, Calendar, ArrowLeft } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";

interface Invoice {
  id: string;
  invoiceNumber: string;
  bookingId: string;
  totalAmount: number;
  currency: string;
  serviceName: string;
  serviceDate: string;
  status: string;
  createdAt: string;
  customer: {
    firstName: string;
    lastName: string;
  };
  cleaner: {
    firstName: string;
    lastName: string;
  };
}

const statusColors: Record<string, string> = {
  ISSUED: "bg-blue-100 text-blue-800",
  PAID: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function InvoicesPage() {
  const t = useTranslations("invoice");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isCustomer = session?.user?.role === "CUSTOMER";

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const response = await fetch("/api/invoices");
        if (response.ok) {
          const data = await response.json();
          setInvoices(data.invoices);
        }
      } catch (error) {
        console.error("Error fetching invoices:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (authStatus === "authenticated") {
      fetchInvoices();
    }
  }, [authStatus]);

  if (authStatus === "loading" || isLoading) {
    return <InvoicesSkeleton />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Button variant="ghost" onClick={() => router.back()} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {tCommon("back")}
          </Button>
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <FileText className="h-8 w-8 text-blue-500" />
            <div>
              <h1 className="text-3xl font-bold">{t("title")}</h1>
              <p className="text-muted-foreground">{t("subtitle")}</p>
            </div>
          </div>

          {/* Invoices List */}
          {invoices.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold mb-2">{t("noInvoices")}</h2>
              <p className="text-muted-foreground">{t("noInvoicesDesc")}</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">
                            {invoice.invoiceNumber}
                          </h3>
                          <Badge className={statusColors[invoice.status]}>
                            {t(`status.${invoice.status.toLowerCase()}`)}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">
                          {invoice.serviceName}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(invoice.serviceDate).toLocaleDateString()}
                          </span>
                          <span>
                            {isCustomer
                              ? `${invoice.cleaner.firstName} ${invoice.cleaner.lastName}`
                              : `${invoice.customer.firstName} ${invoice.customer.lastName}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">
                            ${invoice.totalAmount.toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {invoice.currency}
                          </p>
                        </div>
                        <Link href={`/invoices/${invoice.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            {t("view")}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function InvoicesSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
