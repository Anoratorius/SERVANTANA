"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Users,
  DollarSign,
  Star,
  Clock,
  TrendingUp,
  BarChart3,
  RefreshCw,
  ArrowLeft,
  CheckCircle,
  MapPin,
  Briefcase,
  Award,
  Zap,
  UserPlus,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Link } from "@/i18n/navigation";

interface WorkerAnalyticsData {
  overview: {
    totalWorkers: number;
    activeWorkers: number;
    verifiedWorkers: number;
    newWorkersInPeriod: number;
    workersWithBookings: number;
    avgRating: number;
    avgHourlyRate: number;
    avgExperience: number;
    avgResponseTime: number;
    totalBookingsAllTime: number;
  };
  earnings: {
    totalInPeriod: number;
    platformFeesInPeriod: number;
    avgPerBooking: number;
  };
  earningsTrend: Array<{ date: string; earnings: number; bookings: number; avgPerBooking: number }>;
  topEarners: Array<{
    worker: {
      id: string;
      user: { firstName: string; lastName: string; avatar: string | null };
      profession: { name: string; emoji: string } | null;
    } | null;
    totalEarnings: number;
    bookings: number;
  }>;
  topRated: Array<{
    id: string;
    name: string;
    avatar: string | null;
    profession: { name: string; emoji: string } | null;
    rating: number;
    totalBookings: number;
  }>;
  fastestResponders: Array<{
    id: string;
    name: string;
    profession: { name: string; emoji: string } | null;
    responseTimeMinutes: number;
  }>;
  completionRates: Array<{
    worker: {
      id: string;
      user: { firstName: string; lastName: string };
      profession: { name: string; emoji: string } | null;
    } | null;
    total: number;
    completed: number;
    rate: number;
  }>;
  byProfession: Array<{
    profession: { id: string; name: string; emoji: string } | null;
    count: number;
    avgRating: number;
    avgHourlyRate: number;
  }>;
  byCity: Array<{ city: string; country: string; count: number }>;
  availability: { availableNow: number; notAvailable: number };
  serviceOfferings: Array<{
    service: { id: string; name: string } | null;
    workerCount: number;
    avgPrice: number;
  }>;
  recentSignups: Array<{
    id: string;
    name: string;
    email: string;
    profession: { name: string; emoji: string } | null;
    hourlyRate: number;
    verified: boolean;
    onboardingComplete: boolean;
    joinedAt: string;
  }>;
  rateDistribution: {
    min: number;
    max: number;
    avg: number;
    brackets: Array<{ range: string; count: number }>;
  };
  verification: {
    total: number;
    verified: number;
    pending: number;
    rate: number;
  };
  onboardingFunnel: {
    registered: number;
    profileCreated: number;
    onboardingComplete: number;
    verified: number;
    hasBookings: number;
  };
}

export default function AdminWorkersAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WorkerAnalyticsData | null>(null);
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
      const response = await fetch(`/api/admin/analytics/workers?days=${days}`);
      if (!response.ok) throw new Error("Failed to fetch data");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching worker analytics:", error);
      toast.error("Failed to load worker analytics");
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

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    return `${Math.round(minutes / 60)}h`;
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

  const maxEarnings = Math.max(...data.earningsTrend.map(d => d.earnings), 1);

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
              <h1 className="text-3xl font-bold">Worker Analytics</h1>
              <p className="text-muted-foreground">
                Performance, earnings, and workforce metrics
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

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Workers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.overview.totalWorkers}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-green-600">
                  {data.overview.activeWorkers} active
                </Badge>
                <Badge variant="secondary" className="text-blue-600">
                  {data.overview.verifiedWorkers} verified
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-100 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Worker Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(data.earnings.totalInPeriod)}</div>
              <p className="text-xs text-green-100 mt-1">
                Avg {formatCurrency(data.earnings.avgPerBooking)}/booking
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Average Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{data.overview.avgRating.toFixed(1)}</span>
                <span className="text-muted-foreground">/ 5</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {data.overview.totalBookingsAllTime.toLocaleString()} total bookings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                Avg Response Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatTime(data.overview.avgResponseTime)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg rate: {formatCurrency(data.overview.avgHourlyRate)}/hr
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Onboarding Funnel */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Worker Onboarding Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: "Registered as Worker", value: data.onboardingFunnel.registered, color: "bg-blue-500" },
                { label: "Created Profile", value: data.onboardingFunnel.profileCreated, color: "bg-indigo-500" },
                { label: "Completed Onboarding", value: data.onboardingFunnel.onboardingComplete, color: "bg-purple-500" },
                { label: "Verified", value: data.onboardingFunnel.verified, color: "bg-pink-500" },
                { label: "Has Bookings", value: data.onboardingFunnel.hasBookings, color: "bg-green-500" },
              ].map((step, index, arr) => {
                const maxVal = arr[0].value || 1;
                const percentage = (step.value / maxVal) * 100;
                return (
                  <div key={step.label} className="flex items-center gap-4">
                    <div className="w-48 text-sm font-medium">{step.label}</div>
                    <div className="flex-1">
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${step.color} rounded-full flex items-center justify-end pr-3 transition-all`}
                          style={{ width: `${Math.max(percentage, 5)}%` }}
                        >
                          <span className="text-xs font-bold text-white">{step.value}</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-16 text-right text-sm text-muted-foreground">
                      {Math.round(percentage)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Earnings Trend */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Earnings Trend
            </CardTitle>
            <CardDescription>Daily worker earnings and completed bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end gap-1">
              {data.earningsTrend.map((day, index) => (
                <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                  <div
                    className="w-full bg-green-500 rounded-t transition-all"
                    style={{ height: `${(day.earnings / maxEarnings) * 180}px`, minHeight: day.earnings > 0 ? "4px" : "0" }}
                  />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {format(new Date(day.date), "MMM d")}: {formatCurrency(day.earnings)} ({day.bookings} bookings)
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

        {/* Tabs */}
        <Tabs defaultValue="performers" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="performers">Top Performers</TabsTrigger>
            <TabsTrigger value="professions">By Profession</TabsTrigger>
            <TabsTrigger value="geography">Geography</TabsTrigger>
            <TabsTrigger value="rates">Rates & Services</TabsTrigger>
            <TabsTrigger value="signups">Recent Signups</TabsTrigger>
          </TabsList>

          {/* Top Performers */}
          <TabsContent value="performers">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top Earners */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    Top Earners
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.topEarners.slice(0, 10).map((item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <span className="w-6 text-sm text-muted-foreground">#{index + 1}</span>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={item.worker?.user.avatar || ""} />
                          <AvatarFallback>
                            {item.worker?.user.firstName?.[0]}{item.worker?.user.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {item.worker?.user.firstName} {item.worker?.user.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.worker?.profession?.emoji} {item.worker?.profession?.name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">{formatCurrency(item.totalEarnings)}</div>
                          <div className="text-xs text-muted-foreground">{item.bookings} bookings</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Rated */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Top Rated
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.topRated.slice(0, 10).map((worker, index) => (
                      <div key={worker.id} className="flex items-center gap-3">
                        <span className="w-6 text-sm text-muted-foreground">#{index + 1}</span>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={worker.avatar || ""} />
                          <AvatarFallback>{worker.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{worker.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {worker.profession?.emoji} {worker.profession?.name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-bold">{worker.rating.toFixed(1)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{worker.totalBookings} bookings</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Fastest Responders */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="h-5 w-5 text-blue-500" />
                    Fastest Responders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.fastestResponders.slice(0, 10).map((worker, index) => (
                      <div key={worker.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 text-sm text-muted-foreground">#{index + 1}</span>
                          <span>{worker.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {worker.profession?.emoji}
                          </span>
                        </div>
                        <Badge variant="secondary">{formatTime(worker.responseTimeMinutes)}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Best Completion Rates */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Best Completion Rates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.completionRates.slice(0, 10).map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 text-sm text-muted-foreground">#{index + 1}</span>
                          <span>
                            {item.worker?.user.firstName} {item.worker?.user.lastName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {item.completed}/{item.total}
                          </span>
                          <Badge variant={item.rate >= 90 ? "default" : "secondary"} className={item.rate >= 90 ? "bg-green-500" : ""}>
                            {item.rate}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* By Profession */}
          <TabsContent value="professions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Workers by Profession
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profession</TableHead>
                      <TableHead className="text-right">Workers</TableHead>
                      <TableHead className="text-right">Avg Rating</TableHead>
                      <TableHead className="text-right">Avg Hourly Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byProfession.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <span className="flex items-center gap-2">
                            {item.profession?.emoji && <span>{item.profession.emoji}</span>}
                            {item.profession?.name || "Unknown"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{item.count}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Star className="h-3 w-3 text-yellow-500" />
                            {item.avgRating.toFixed(1)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.avgHourlyRate)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Geography */}
          <TabsContent value="geography">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5" />
                    Workers by City
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.byCity.map((city, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span>{city.city}, {city.country}</span>
                        <Badge variant="secondary">{city.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Availability Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        Available Now
                      </span>
                      <span className="font-bold">{data.availability.availableNow}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-400" />
                        Not Available
                      </span>
                      <span className="font-bold">{data.availability.notAvailable}</span>
                    </div>
                    <div className="pt-4 border-t">
                      <div className="text-sm text-muted-foreground mb-2">Verification Status</div>
                      <Progress value={data.verification.rate} className="h-3" />
                      <div className="flex justify-between text-sm mt-1">
                        <span>{data.verification.verified} verified</span>
                        <span>{data.verification.rate}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Rates & Services */}
          <TabsContent value="rates">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Hourly Rate Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-6">
                    {data.rateDistribution.brackets.map((bracket) => {
                      const maxCount = Math.max(...data.rateDistribution.brackets.map(b => b.count), 1);
                      return (
                        <div key={bracket.range} className="flex items-center gap-4">
                          <div className="w-16 text-sm font-medium">{bracket.range}</div>
                          <div className="flex-1">
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${(bracket.count / maxCount) * 100}%` }}
                              />
                            </div>
                          </div>
                          <div className="w-12 text-right text-sm">{bracket.count}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-lg font-bold">{formatCurrency(data.rateDistribution.min)}</div>
                      <div className="text-xs text-muted-foreground">Min</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">{formatCurrency(data.rateDistribution.avg)}</div>
                      <div className="text-xs text-muted-foreground">Avg</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">{formatCurrency(data.rateDistribution.max)}</div>
                      <div className="text-xs text-muted-foreground">Max</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Service Offerings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.serviceOfferings.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span>{item.service?.name || "Unknown"}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            avg {formatCurrency(item.avgPrice)}
                          </span>
                          <Badge variant="secondary">{item.workerCount} workers</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Recent Signups */}
          <TabsContent value="signups">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Recent Worker Signups
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Worker</TableHead>
                      <TableHead>Profession</TableHead>
                      <TableHead>Hourly Rate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentSignups.map((worker) => (
                      <TableRow key={worker.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{worker.name}</div>
                            <div className="text-xs text-muted-foreground">{worker.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {worker.profession?.emoji} {worker.profession?.name || "-"}
                        </TableCell>
                        <TableCell>{formatCurrency(worker.hourlyRate)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {worker.verified ? (
                              <Badge className="bg-green-500">Verified</Badge>
                            ) : worker.onboardingComplete ? (
                              <Badge variant="secondary">Pending</Badge>
                            ) : (
                              <Badge variant="outline">Onboarding</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(worker.joinedAt), "MMM d, HH:mm")}
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
