"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { Header, Footer } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  MessageSquare,
  Paperclip,
  ArrowLeft,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface Dispute {
  id: string;
  type: string;
  status: string;
  subject: string;
  createdAt: string;
  booking: {
    scheduledDate: string;
    totalPrice: number;
    service: { name: string };
  };
  customer: { firstName: string; lastName: string };
  cleaner: { firstName: string; lastName: string };
  _count: { messages: number; evidence: number };
}

const DISPUTE_TYPE_LABELS: Record<string, string> = {
  SERVICE_QUALITY: "Service Quality",
  PAYMENT_ISSUE: "Payment Issue",
  NO_SHOW: "No Show",
  PROPERTY_DAMAGE: "Property Damage",
  UNPROFESSIONAL_BEHAVIOR: "Unprofessional Behavior",
  OTHER: "Other",
};

export default function DisputesPage() {
  const router = useRouter();
  const t = useTranslations();
  const { status: authStatus } = useSession();

  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus === "authenticated") {
      fetchDisputes();
    }
  }, [authStatus]);

  const fetchDisputes = async () => {
    try {
      const res = await fetch("/api/disputes");
      if (res.ok) {
        const data = await res.json();
        setDisputes(data.disputes || []);
      }
    } catch (error) {
      console.error("Error fetching disputes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Open
          </Badge>
        );
      case "IN_REVIEW":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            In Review
          </Badge>
        );
      case "RESOLVED":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Resolved
          </Badge>
        );
      case "CLOSED":
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <XCircle className="h-3 w-3 mr-1" />
            Closed
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (authStatus === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
          <div className="container mx-auto px-4 max-w-4xl">
            <Skeleton className="h-8 w-48 mb-6" />
            <Skeleton className="h-32 mb-4" />
            <Skeleton className="h-32" />
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
        <div className="container mx-auto px-4 max-w-4xl">
          <Button variant="ghost" onClick={() => router.back()} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("common.back")}
          </Button>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              My Disputes
            </h1>
            <Link href="/support/disputes/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Open Dispute
              </Button>
            </Link>
          </div>

          {disputes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  You don&apos;t have any disputes yet
                </p>
                <Link href="/support/disputes/new">
                  <Button>Open a Dispute</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {disputes.map((dispute) => (
                <Link key={dispute.id} href={`/support/disputes/${dispute.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusBadge(dispute.status)}
                            <Badge variant="outline">
                              {DISPUTE_TYPE_LABELS[dispute.type] || dispute.type}
                            </Badge>
                          </div>
                          <h3 className="font-semibold">{dispute.subject}</h3>
                          <p className="text-sm text-muted-foreground">
                            {dispute.booking.service.name} -{" "}
                            {new Date(dispute.booking.scheduledDate).toLocaleDateString()}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {dispute._count.messages} messages
                            </span>
                            <span className="flex items-center gap-1">
                              <Paperclip className="h-3 w-3" />
                              {dispute._count.evidence} files
                            </span>
                            <span>
                              Opened {new Date(dispute.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            ${dispute.booking.totalPrice.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
