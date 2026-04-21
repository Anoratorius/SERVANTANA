"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/analytics/DateRangePicker";
import { RevenueChart } from "@/components/analytics/RevenueChart";
import { BookingTrends } from "@/components/analytics/BookingTrends";
import { ServiceBreakdown } from "@/components/analytics/ServiceBreakdown";

import {
  DollarSign,
  Users,
  Calendar,
  TrendingUp,
  Download,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

interface AdminAnalytics {
  summary: {
    totalRevenue: number;
    totalBookings: number;
    totalUsers: number;
    totalCleaners: number;
    platformFees: number;
    averageBookingValue: number;
  };
  revenueChange: number;
  bookingsChange: number;
  usersChange: number;
  bookingsTrend: Array<{ date: string; value: number }>;
  revenueTrend: Array<{ date: string; value: number }>;
  topServices: Array<{ name: string; bookings: number; revenue: number }>;
  bookingsByStatus: Record<string, number>;
}

interface RevenueData {
  summary: {
    totalRevenue: number;
    totalRefunds: number;
    totalPlatformFees: number;
    netRevenue: number;
    totalBookings: number;
    averageOrderValue: number;
  };
  dailyData: Array<{
    date: string;
    revenue: number;
    refunds: number;
    platformFees: number;
    bookings: number;
    netRevenue: number;
  }>;
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const t = useTranslations();
  const [period, setPeriod] = useState("month");
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [analyticsRes, revenueRes] = await Promise.all([
          fetch(`/api/admin/analytics?period=${period}`),
          fetch(`/api/admin/analytics/revenue?period=${period}`),
        ]);

        if (analyticsRes.ok) {
          setAnalytics(await analyticsRes.json());
        }
        if (revenueRes.ok) {
          setRevenueData(await revenueRes.json());
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [period]);

  const handleExport = async (type: string) => {
    setExporting(type);
    try {
      const res = await fetch(
        `/api/admin/analytics/export?type=${type}&period=${period}`
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${type}-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setExporting(null);
    }
  };

  const ChangeIndicator = ({ value }: { value: number }) => (
    <span
      className={`flex items-center text-sm ${
        value >= 0 ? "text-green-600" : "text-red-600"
      }`}
    >
      {value >= 0 ? (
        <ArrowUp className="h-4 w-4" />
      ) : (
        <ArrowDown className="h-4 w-4" />
      )}
      {Math.abs(value)}%
    </span>
  );

  if (loading) {
    return (
      <main className="flex-1 bg-gray-50 dark:bg-gray-900 py-8">
        <div className="container mx-auto px-4 max-w-7xl">
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
  const revenueSummary = revenueData?.summary;

  return (
    <main className="flex-1 bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-7xl">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Platform Analytics
          </h1>
          <div className="flex flex-col sm:flex-row gap-4">
            <DateRangePicker value={period} onChange={setPeriod} />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("bookings")}
                disabled={!!exporting}
              >
                <Download className="h-4 w-4 mr-1" />
                {exporting === "bookings" ? "..." : "Bookings"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("revenue")}
                disabled={!!exporting}
              >
                <Download className="h-4 w-4 mr-1" />
                {exporting === "revenue" ? "..." : "Revenue"}
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                    <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">
                      ${revenueSummary?.totalRevenue.toLocaleString() || 0}
                    </p>
                  </div>
                </div>
                {analytics && <ChangeIndicator value={analytics.revenueChange} />}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
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
                {analytics && <ChangeIndicator value={analytics.bookingsChange} />}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                    <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold">
                      {summary?.totalUsers || 0}
                    </p>
                  </div>
                </div>
                {analytics && <ChangeIndicator value={analytics.usersChange} />}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                  <TrendingUp className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Platform Fees</p>
                  <p className="text-2xl font-bold">
                    ${revenueSummary?.totalPlatformFees.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Summary */}
        {revenueSummary && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Revenue Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Gross Revenue</p>
                  <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                    ${revenueSummary.totalRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Refunds</p>
                  <p className="text-xl font-semibold text-red-600 dark:text-red-400">
                    ${revenueSummary.totalRefunds.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Net Revenue</p>
                  <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                    ${revenueSummary.netRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Avg Order Value</p>
                  <p className="text-xl font-semibold text-purple-600 dark:text-purple-400">
                    ${revenueSummary.averageOrderValue.toLocaleString()}
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
              <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueData?.dailyData && (
                <RevenueChart data={revenueData.dailyData} showRefunds />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Booking Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueData?.dailyData && (
                <BookingTrends
                  data={revenueData.dailyData.map((d) => ({
                    date: d.date,
                    bookings: d.bookings,
                  }))}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Service Breakdown & Booking Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Services</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.topServices && analytics.topServices.length > 0 ? (
                <div className="space-y-3">
                  {analytics.topServices.slice(0, 5).map((service, index) => (
                    <div
                      key={service.name}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground">
                          #{index + 1}
                        </span>
                        <span className="font-medium">{service.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          ${service.revenue.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {service.bookings} bookings
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No service data available.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bookings by Status</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.bookingsByStatus ? (
                <ServiceBreakdown
                  data={Object.entries(analytics.bookingsByStatus).map(
                    ([name, value]) => ({
                      name: name.replace("_", " "),
                      value,
                    })
                  )}
                  valueLabel="Bookings"
                />
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No booking data available.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
