"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/analytics/DateRangePicker";
import { BackButton } from "@/components/ui/back-button";
import {
  CreditCard,
  DollarSign,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { formatPrice } from "@/lib/fees";

interface PaymentAnalytics {
  period: string;
  dateRange: {
    start: string;
    end: string;
  };
  summary: {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    refundedTransactions: number;
    successRate: string;
    totalRevenue: number;
    platformRevenue: number;
    refundedAmount: number;
    netRevenue: number;
    averageTransactionValue: number;
  };
  charts: {
    revenueByDay: Array<{
      date: string;
      revenue: number;
      transactions: number;
    }>;
  };
  breakdowns: {
    byProvider: Array<{
      provider: string;
      count: number;
      amount: number;
      percentage: string;
    }>;
    byStatus: Array<{
      status: string;
      count: number;
      percentage: string;
    }>;
    byCurrency: Array<{
      currency: string;
      count: number;
      amount: number;
    }>;
  };
  topWorkers: Array<{
    workerId: string;
    workerName: string;
    totalPayout: number;
  }>;
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status.toUpperCase()) {
    case "SUCCEEDED":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "FAILED":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "REFUNDED":
      return <RefreshCw className="h-4 w-4 text-orange-500" />;
    case "PENDING":
      return <Clock className="h-4 w-4 text-yellow-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-500" />;
  }
};

const ProviderLogo = ({ provider }: { provider: string }) => {
  const colors: Record<string, string> = {
    stripe: "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400",
    paypal: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400",
    crypto: "bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400",
  };

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium uppercase ${
        colors[provider.toLowerCase()] || "bg-gray-100 text-gray-600"
      }`}
    >
      {provider}
    </span>
  );
};

export default function PaymentsAnalyticsPage() {
  const [period, setPeriod] = useState("month");
  const [analytics, setAnalytics] = useState<PaymentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/payments/analytics?period=${period}`);
        if (!res.ok) {
          throw new Error("Failed to fetch payment analytics");
        }
        setAnalytics(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [period]);

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

  if (error) {
    return (
      <main className="flex-1 bg-gray-50 dark:bg-gray-900 py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const summary = analytics?.summary;

  return (
    <main className="flex-1 bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <BackButton href="/admin" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Payment Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor payment performance across all providers
            </p>
          </div>
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
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">
                    {formatPrice(summary?.totalRevenue || 0, "EUR")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transactions</p>
                  <p className="text-2xl font-bold">
                    {summary?.totalTransactions || 0}
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
                  <p className="text-sm text-muted-foreground">Platform Revenue</p>
                  <p className="text-2xl font-bold">
                    {formatPrice(summary?.platformRevenue || 0, "EUR")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                  <CheckCircle2 className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">{summary?.successRate || "0%"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Breakdown */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Revenue Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowUpRight className="h-4 w-4 text-green-600" />
                  <p className="text-sm text-muted-foreground">Gross</p>
                </div>
                <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                  {formatPrice(summary?.totalRevenue || 0, "EUR")}
                </p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowDownRight className="h-4 w-4 text-red-600" />
                  <p className="text-sm text-muted-foreground">Refunds</p>
                </div>
                <p className="text-xl font-semibold text-red-600 dark:text-red-400">
                  {formatPrice(summary?.refundedAmount || 0, "EUR")}
                </p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Net Revenue</p>
                <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                  {formatPrice(summary?.netRevenue || 0, "EUR")}
                </p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Platform Fees</p>
                <p className="text-xl font-semibold text-purple-600 dark:text-purple-400">
                  {formatPrice(summary?.platformRevenue || 0, "EUR")}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Avg Transaction</p>
                <p className="text-xl font-semibold">
                  {formatPrice(summary?.averageTransactionValue || 0, "EUR")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Provider & Status Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>By Payment Provider</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.breakdowns.byProvider &&
              analytics.breakdowns.byProvider.length > 0 ? (
                <div className="space-y-3">
                  {analytics.breakdowns.byProvider.map((provider) => (
                    <div
                      key={provider.provider}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <ProviderLogo provider={provider.provider} />
                        <span className="text-muted-foreground">
                          {provider.count} transactions
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatPrice(provider.amount, "EUR")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {provider.percentage}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No payment data available.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>By Status</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.breakdowns.byStatus &&
              analytics.breakdowns.byStatus.length > 0 ? (
                <div className="space-y-3">
                  {analytics.breakdowns.byStatus.map((status) => (
                    <div
                      key={status.status}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <StatusIcon status={status.status} />
                        <span className="font-medium capitalize">
                          {status.status.toLowerCase().replace("_", " ")}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{status.count}</p>
                        <p className="text-sm text-muted-foreground">
                          {status.percentage}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No status data available.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Currency Breakdown & Top Workers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>By Currency</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.breakdowns.byCurrency &&
              analytics.breakdowns.byCurrency.length > 0 ? (
                <div className="space-y-3">
                  {analytics.breakdowns.byCurrency.map((currency) => (
                    <div
                      key={currency.currency}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">
                          {currency.currency}
                        </span>
                        <span className="text-muted-foreground">
                          {currency.count} transactions
                        </span>
                      </div>
                      <p className="font-semibold">
                        {formatPrice(currency.amount, currency.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No currency data available.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Earning Workers</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.topWorkers && analytics.topWorkers.length > 0 ? (
                <div className="space-y-3">
                  {analytics.topWorkers.slice(0, 5).map((worker, index) => (
                    <div
                      key={worker.workerId}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 flex items-center justify-center bg-primary/10 text-primary rounded-full text-sm font-bold">
                          {index + 1}
                        </span>
                        <span className="font-medium">{worker.workerName}</span>
                      </div>
                      <p className="font-semibold text-green-600 dark:text-green-400">
                        {formatPrice(worker.totalPayout, "EUR")}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No worker data available.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Daily Revenue Chart */}
        {analytics?.charts.revenueByDay && analytics.charts.revenueByDay.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Daily Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end gap-1">
                {analytics.charts.revenueByDay.map((day, index) => {
                  const maxRevenue = Math.max(
                    ...analytics.charts.revenueByDay.map((d) => d.revenue)
                  );
                  const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;

                  return (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col items-center group"
                    >
                      <div className="relative w-full">
                        <div
                          className="w-full bg-primary/80 hover:bg-primary rounded-t transition-colors"
                          style={{ height: `${Math.max(height, 2)}%`, minHeight: "4px" }}
                        />
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                          {formatPrice(day.revenue, "EUR")}
                          <br />
                          {day.transactions} txns
                        </div>
                      </div>
                      {index % Math.ceil(analytics.charts.revenueByDay.length / 7) === 0 && (
                        <span className="text-xs text-muted-foreground mt-1">
                          {new Date(day.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
