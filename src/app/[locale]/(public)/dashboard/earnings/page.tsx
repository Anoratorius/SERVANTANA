"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/ui/back-button";
import {
  DollarSign,
  Clock,
  CheckCircle,
  ArrowUpRight,
  TrendingUp,
  Calendar,
  Loader2,
  Banknote,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface Earning {
  id: string;
  amount: number;
  platformFee: number;
  grossAmount: number;
  currency: string;
  status: string;
  availableAt: string;
  createdAt: string;
  booking: {
    id: string;
    scheduledDate: string;
    scheduledTime: string;
    customer: {
      firstName: string;
      lastName: string;
    };
    service: {
      name: string;
    };
  };
}

interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payoutMethod: string | null;
  processedAt: string | null;
  createdAt: string;
  earnings: {
    id: string;
    amount: number;
  }[];
}

interface Summary {
  totalEarned: number;
  totalPending: number;
  totalAvailable: number;
  totalPaidOut: number;
  totalPlatformFees: number;
  totalGross: number;
  count: number;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  AVAILABLE: "bg-green-100 text-green-800",
  PAID_OUT: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
};

export default function EarningsPage() {
  const router = useRouter();
  const t = useTranslations();
  const { status: authStatus } = useSession();

  const [activeTab, setActiveTab] = useState("overview");
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);
  const [period, setPeriod] = useState("all");

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/dashboard/earnings");
    }
  }, [authStatus, router]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [earningsRes, payoutsRes] = await Promise.all([
          fetch(`/api/worker/earnings?period=${period}`),
          fetch("/api/worker/payouts"),
        ]);

        if (earningsRes.ok) {
          const data = await earningsRes.json();
          setEarnings(data.earnings);
          setSummary(data.summary);
        }

        if (payoutsRes.ok) {
          const data = await payoutsRes.json();
          setPayouts(data.payouts);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (authStatus === "authenticated") {
      fetchData();
    }
  }, [authStatus, period]);

  const handleRequestPayout = async () => {
    setIsRequestingPayout(true);
    try {
      const response = await fetch("/api/worker/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutMethod: "bank_transfer" }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Payout requested successfully!");
        // Refresh data
        const [earningsRes, payoutsRes] = await Promise.all([
          fetch(`/api/worker/earnings?period=${period}`),
          fetch("/api/worker/payouts"),
        ]);
        if (earningsRes.ok) {
          const eData = await earningsRes.json();
          setEarnings(eData.earnings);
          setSummary(eData.summary);
        }
        if (payoutsRes.ok) {
          const pData = await payoutsRes.json();
          setPayouts(pData.payouts);
        }
      } else {
        toast.error(data.error || "Failed to request payout");
      }
    } catch {
      toast.error("Failed to request payout");
    } finally {
      setIsRequestingPayout(false);
    }
  };

  if (authStatus === "loading" || isLoading) {
    return <EarningsPageSkeleton />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-b from-green-50 to-white py-8">
        <div className="container mx-auto px-4">
          <BackButton />
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Earnings Dashboard
            </h1>
            {summary && summary.totalAvailable >= 10 && (
              <Button
                onClick={handleRequestPayout}
                disabled={isRequestingPayout}
                className="bg-gradient-to-r from-green-500 to-green-600"
              >
                {isRequestingPayout ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Banknote className="h-4 w-4 mr-2" />
                )}
                Request Payout (${summary.totalAvailable.toFixed(2)})
              </Button>
            )}
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Earned</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${summary.totalEarned.toFixed(2)}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    From {summary.count} bookings
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        ${summary.totalPending.toFixed(2)}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Releasing within 7 days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Available</p>
                      <p className="text-2xl font-bold text-blue-600">
                        ${summary.totalAvailable.toFixed(2)}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <ArrowUpRight className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ready for payout
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Paid Out</p>
                      <p className="text-2xl font-bold text-purple-600">
                        ${summary.totalPaidOut.toFixed(2)}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Total withdrawn
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <TabsList>
                <TabsTrigger value="overview">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Earnings
                </TabsTrigger>
                <TabsTrigger value="payouts">
                  <Banknote className="h-4 w-4 mr-2" />
                  Payouts
                </TabsTrigger>
              </TabsList>

              <div className="flex gap-2">
                {["all", "week", "month", "year"].map((p) => (
                  <Button
                    key={p}
                    variant={period === p ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPeriod(p)}
                  >
                    {p === "all" ? "All Time" : p.charAt(0).toUpperCase() + p.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <TabsContent value="overview">
              {earnings.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No earnings yet</h3>
                    <p className="text-muted-foreground">
                      Complete bookings to start earning!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Earnings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {earnings.map((earning) => (
                        <div
                          key={earning.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <Calendar className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {earning.booking.service.name} - {earning.booking.customer.firstName}{" "}
                                {earning.booking.customer.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(earning.booking.scheduledDate).toLocaleDateString()} at{" "}
                                {earning.booking.scheduledTime}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">
                              +${earning.amount.toFixed(2)}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                (Fee: ${earning.platformFee.toFixed(2)})
                              </span>
                              <Badge className={statusColors[earning.status]}>
                                {earning.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="payouts">
              {payouts.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Banknote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No payouts yet</h3>
                    <p className="text-muted-foreground">
                      Request a payout when you have available earnings.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Payout History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {payouts.map((payout) => (
                        <div
                          key={payout.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                              <Banknote className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium">
                                Payout via {payout.payoutMethod || "Bank Transfer"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(payout.createdAt).toLocaleDateString()} -{" "}
                                {payout.earnings.length} earnings
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">
                              ${payout.amount.toFixed(2)}
                            </p>
                            <Badge className={statusColors[payout.status]}>
                              {payout.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function EarningsPageSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-b from-green-50 to-white py-8">
        <div className="container mx-auto px-4">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-10 w-48 mb-6" />
          <Skeleton className="h-64" />
        </div>
      </main>
      <Footer />
    </div>
  );
}
