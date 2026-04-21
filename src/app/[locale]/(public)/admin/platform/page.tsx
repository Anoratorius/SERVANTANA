"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Star,
  CreditCard,
  MessageSquare,
  Activity,
  Database,
  BarChart3,
  RefreshCw,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Server,
  Bell,
  Filter,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Link } from "@/i18n/navigation";

interface PlatformData {
  revenue: {
    totalAllTime: number;
    inPeriod: number;
    fromBookings: number;
    platformFees: number;
    avgBookingValue: number;
  };
  revenueTrend: Array<{ date: string; revenue: number; bookings: number; fees: number }>;
  bookings: {
    total: number;
    inPeriod: number;
    completed: number;
    cancelled: number;
    pending: number;
    confirmed: number;
    completionRate: number;
    cancellationRate: number;
  };
  bookingsByStatus: Array<{ status: string; count: number }>;
  payments: {
    byMethod: Array<{ method: string; count: number; total: number }>;
    byStatus: Array<{ status: string; count: number }>;
  };
  reviews: {
    total: number;
    inPeriod: number;
    avgRating: number;
    distribution: Array<{ rating: number; count: number }>;
  };
  messaging: {
    totalMessages: number;
    inPeriod: number;
  };
  events: {
    total: number;
    inPeriod: number;
    uniqueSessions: number;
    errors: number;
    byType: Array<{ type: string; count: number }>;
  };
  performance: {
    avgTimeOnPage: number;
    avgScrollDepth: number;
  };
  services: {
    total: number;
    active: number;
    top: Array<{
      service: { id: string; name: string; emoji: string } | null;
      bookings: number;
      revenue: number;
    }>;
  };
  funnel: {
    pageViews: number;
    searches: number;
    workerViews: number;
    bookingStarts: number;
    bookingCompletes: number;
    paymentSuccesses: number;
    searchToBookingRate: number;
    bookingCompletionRate: number;
    paymentSuccessRate: number;
  };
  notifications: {
    total: number;
    unread: number;
  };
  database: {
    tables: Array<{ table: string; count: number }>;
    totalRecords: number;
  };
}

export default function AdminPlatformPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PlatformData | null>(null);
  const [days, setDays] = useState("30");

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user?.role !== "ADMIN") {
      router.push("/");
      return;
    }
    fetchData();
  }, [session, status, router, days]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics/platform?days=${days}`);
      if (!response.ok) throw new Error("Failed to fetch data");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching platform analytics:", error);
      toast.error("Failed to load platform analytics");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "bg-green-500";
      case "CONFIRMED": return "bg-blue-500";
      case "PENDING": return "bg-yellow-500";
      case "CANCELLED": return "bg-red-500";
      case "IN_PROGRESS": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Skeleton className="h-8 w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <p className="text-center text-muted-foreground">No data available</p>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.revenueTrend.map(d => d.revenue), 1);

  return (
    <main className="flex-1 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Platform Health</h1>
              <p className="text-muted-foreground">
                Revenue, bookings, and system performance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="60">Last 60 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-100">
                <DollarSign className="h-4 w-4" />
                Revenue (Period)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(data.revenue.inPeriod)}</div>
              <p className="text-xs text-green-100 mt-1">
                Platform fees: {formatCurrency(data.revenue.platformFees)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.bookings.inPeriod}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  {data.bookings.completionRate}% completed
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{data.reviews.avgRating.toFixed(1)}</span>
                <span className="text-muted-foreground">/ 5</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {data.reviews.inPeriod} new reviews
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatNumber(data.events.uniqueSessions)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatNumber(data.events.inPeriod)} events tracked
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue Trend
            </CardTitle>
            <CardDescription>Daily revenue and bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end gap-1">
              {data.revenueTrend.map((day, index) => (
                <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                  <div
                    className="w-full bg-green-500 rounded-t transition-all"
                    style={{ height: `${(day.revenue / maxRevenue) * 180}px`, minHeight: day.revenue > 0 ? "4px" : "0" }}
                  />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {format(new Date(day.date), "MMM d")}: {formatCurrency(day.revenue)} ({day.bookings} bookings)
                  </div>
                  {index % 7 === 0 && (
                    <span className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(day.date), "M/d")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Conversion Funnel
            </CardTitle>
            <CardDescription>User journey from page view to payment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: "Page Views", value: data.funnel.pageViews, color: "bg-blue-500" },
                { label: "Searches", value: data.funnel.searches, color: "bg-indigo-500" },
                { label: "Worker Views", value: data.funnel.workerViews, color: "bg-purple-500" },
                { label: "Booking Started", value: data.funnel.bookingStarts, color: "bg-pink-500" },
                { label: "Booking Completed", value: data.funnel.bookingCompletes, color: "bg-orange-500" },
                { label: "Payment Success", value: data.funnel.paymentSuccesses, color: "bg-green-500" },
              ].map((step, index, arr) => {
                const maxVal = arr[0].value || 1;
                const percentage = (step.value / maxVal) * 100;
                const dropoff = index > 0 && arr[index - 1].value > 0
                  ? Math.round((1 - step.value / arr[index - 1].value) * 100)
                  : 0;
                return (
                  <div key={step.label} className="flex items-center gap-4">
                    <div className="w-40 text-sm font-medium">{step.label}</div>
                    <div className="flex-1">
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${step.color} rounded-full flex items-center justify-end pr-3 transition-all`}
                          style={{ width: `${Math.max(percentage, 5)}%` }}
                        >
                          <span className="text-xs font-bold text-white">
                            {formatNumber(step.value)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="w-20 text-right">
                      {dropoff > 0 && (
                        <span className="text-xs text-red-500">-{dropoff}%</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {data.funnel.searchToBookingRate}%
                </div>
                <div className="text-sm text-muted-foreground">Search to Booking</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {data.funnel.bookingCompletionRate}%
                </div>
                <div className="text-sm text-muted-foreground">Booking Completion</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {data.funnel.paymentSuccessRate}%
                </div>
                <div className="text-sm text-muted-foreground">Payment Success</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="bookings" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="database">Database</TabsTrigger>
          </TabsList>

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Booking Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.bookingsByStatus.map((status) => (
                      <div key={status.status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(status.status)}`} />
                          <span>{status.status}</span>
                        </div>
                        <Badge variant="secondary">{status.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Booking Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold">{data.bookings.total}</div>
                      <div className="text-sm text-muted-foreground">Total All Time</div>
                    </div>
                    <div className="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold">{formatCurrency(data.revenue.avgBookingValue)}</div>
                      <div className="text-sm text-muted-foreground">Avg Value</div>
                    </div>
                    <div className="text-center p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{data.bookings.completionRate}%</div>
                      <div className="text-sm text-muted-foreground">Completion Rate</div>
                    </div>
                    <div className="text-center p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{data.bookings.cancellationRate}%</div>
                      <div className="text-sm text-muted-foreground">Cancellation Rate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CreditCard className="h-5 w-5" />
                    Payment Methods
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Method</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.payments.byMethod.map((method) => (
                        <TableRow key={method.method}>
                          <TableCell className="font-medium">{method.method}</TableCell>
                          <TableCell className="text-right">{method.count}</TableCell>
                          <TableCell className="text-right">{formatCurrency(method.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.payments.byStatus.map((status) => (
                      <div key={status.status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {status.status === "COMPLETED" ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : status.status === "FAILED" ? (
                            <XCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-500" />
                          )}
                          <span>{status.status}</span>
                        </div>
                        <Badge variant="secondary">{status.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Services by Revenue</CardTitle>
                <CardDescription>
                  {data.services.active} of {data.services.total} services active
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead className="text-right">Bookings</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.services.top.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <span className="flex items-center gap-2">
                            {item.service?.emoji && <span>{item.service.emoji}</span>}
                            {item.service?.name || "Unknown"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{item.bookings}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Rating Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const ratingData = data.reviews.distribution.find(r => r.rating === rating);
                    const count = ratingData?.count || 0;
                    const maxCount = Math.max(...data.reviews.distribution.map(r => r.count), 1);
                    const percentage = (count / maxCount) * 100;
                    return (
                      <div key={rating} className="flex items-center gap-4">
                        <div className="w-16 flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-medium">{rating}</span>
                        </div>
                        <div className="flex-1">
                          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-500 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-16 text-right text-muted-foreground">
                          {count}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 pt-6 border-t text-center">
                  <div className="text-4xl font-bold text-yellow-600">
                    {data.reviews.avgRating.toFixed(1)}
                  </div>
                  <div className="text-muted-foreground">
                    Average rating from {data.reviews.total} reviews
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="h-5 w-5" />
                    Event Types
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {data.events.byType.map((event, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{event.type.replace(/_/g, " ")}</span>
                        <Badge variant="secondary">{formatNumber(event.count)}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Event Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold">{formatNumber(data.events.total)}</div>
                      <div className="text-sm text-muted-foreground">Total Events</div>
                    </div>
                    <div className="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold">{formatNumber(data.events.uniqueSessions)}</div>
                      <div className="text-sm text-muted-foreground">Unique Sessions</div>
                    </div>
                    <div className="text-center p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{data.events.errors}</div>
                      <div className="text-sm text-muted-foreground">Error Events</div>
                    </div>
                    <div className="text-center p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.round(data.performance.avgScrollDepth)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Scroll Depth</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Database Tab */}
          <TabsContent value="database">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Database className="h-5 w-5" />
                  Database Statistics
                </CardTitle>
                <CardDescription>
                  Total records: {formatNumber(data.database.totalRecords)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table</TableHead>
                      <TableHead className="text-right">Records</TableHead>
                      <TableHead className="text-right">% of Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.database.tables
                      .sort((a, b) => b.count - a.count)
                      .map((table) => (
                        <TableRow key={table.table}>
                          <TableCell className="font-medium capitalize">
                            {table.table.replace(/_/g, " ")}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(table.count)}
                          </TableCell>
                          <TableCell className="text-right">
                            {data.database.totalRecords > 0
                              ? Math.round((table.count / data.database.totalRecords) * 100)
                              : 0}%
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
