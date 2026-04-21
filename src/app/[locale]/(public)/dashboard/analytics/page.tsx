"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/analytics/DateRangePicker";
import { RevenueChart } from "@/components/analytics/RevenueChart";
import { BookingTrends } from "@/components/analytics/BookingTrends";
import { ServiceBreakdown } from "@/components/analytics/ServiceBreakdown";

import { DollarSign, Calendar, Star, TrendingUp } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface AnalyticsData {
  summary: {
    totalEarnings: number;
    totalBookings: number;
    completedBookings: number;
    averageRating: number;
    completionRate: number;
  };
  earningsTrend: Array<{ date: string; value: number }>;
  bookingsTrend: Array<{ date: string; value: number }>;
  byService: Array<{ name: string; amount: number; count: number }>;
}

interface EarningsData {
  summary: {
    totalGross: number;
    totalFees: number;
    totalNet: number;
    pending: number;
    available: number;
    paidOut: number;
  };
  dailyTrend: Array<{ date: string; value: number }>;
  byService: Array<{ name: string; amount: number; count: number }>;
}

export default function CleanerAnalyticsPage() {
  const router = useRouter();
  const t = useTranslations();
  const [period, setPeriod] = useState("month");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [analyticsRes, earningsRes] = await Promise.all([
          fetch(`/api/analytics/worker?period=${period}`),
          fetch(`/api/analytics/worker/earnings?period=${period}`),
        ]);

        if (analyticsRes.ok) {
          setAnalytics(await analyticsRes.json());
        }
        if (earningsRes.ok) {
          setEarnings(await earningsRes.json());
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [period]);

  if (loading) {
    return (
      <main className="flex-1 bg-gray-50 dark:bg-gray-900 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  const summary = analytics?.summary;
  const earningsSummary = earnings?.summary;

  return (
    <main className="flex-1 bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-6xl">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analytics Dashboard
          </h1>
          <DateRangePicker value={period} onChange={setPeriod} />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Earnings</p>
                  <p className="text-2xl font-bold">
                    ${earningsSummary?.totalNet.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Bookings</p>
                  <p className="text-2xl font-bold">
                    {summary?.totalBookings || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                  <Star className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average Rating</p>
                  <p className="text-2xl font-bold">
                    {summary?.averageRating.toFixed(1) || "0.0"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                  <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold">
                    {summary?.completionRate || 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Earnings Status */}
        {earningsSummary && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Earnings Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-xl font-semibold text-yellow-600 dark:text-yellow-400">
                    ${earningsSummary.pending.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Available</p>
                  <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                    ${earningsSummary.available.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Paid Out</p>
                  <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                    ${earningsSummary.paidOut.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Earnings Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {earnings?.dailyTrend && (
                <RevenueChart
                  data={earnings.dailyTrend.map((d) => ({
                    date: d.date,
                    revenue: d.value,
                  }))}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Booking Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.bookingsTrend && (
                <BookingTrends
                  data={analytics.bookingsTrend.map((d) => ({
                    date: d.date,
                    bookings: d.value,
                  }))}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Service Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Earnings by Service</CardTitle>
          </CardHeader>
          <CardContent>
            {earnings?.byService && earnings.byService.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ServiceBreakdown
                  data={earnings.byService.map((s) => ({
                    name: s.name,
                    value: s.amount,
                    count: s.count,
                  }))}
                />
                <div className="space-y-3">
                  {earnings.byService.map((service, index) => (
                    <div
                      key={service.name}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: [
                              "#3b82f6",
                              "#10b981",
                              "#f59e0b",
                              "#ef4444",
                              "#8b5cf6",
                            ][index % 5],
                          }}
                        />
                        <span className="font-medium">{service.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          ${service.amount.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {service.count} bookings
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No service data available for this period.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
