"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
  TrendingUp,
  TrendingDown,
  Search,
  MapPin,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  BarChart3,
  Bell,
  Filter,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Link } from "@/i18n/navigation";

interface DemandOverview {
  totalSignals: number;
  matchedSignals: number;
  unmatchedSignals: number;
  waitlistCount: number;
  bookingsCreated: number;
  matchRate: number;
  conversionRate: number;
}

interface DemandByType {
  type: string;
  count: number;
}

interface DemandByCity {
  city: string;
  count: number;
}

interface DemandByProfession {
  profession: {
    id: string;
    name: string;
    nameDE: string;
    emoji: string;
  } | null;
  count: number;
}

interface DemandTrend {
  date: string;
  count: number;
  matched: number;
}

interface SupplyGap {
  city: string;
  country: string;
  demandCount: number;
  workerCount: number;
  gap: number;
  severity: "critical" | "high" | "moderate" | "low";
}

interface UnmatchedSearch {
  id: string;
  profession: string | null;
  emoji: string | null;
  city: string | null;
  country: string | null;
  searchQuery: string | null;
  requestedDate: string | null;
  createdAt: string;
}

interface WaitlistEntry {
  id: string;
  profession: string | null;
  emoji: string | null;
  city: string | null;
  country: string | null;
  customer: string;
  email: string | null;
  joinedAt: string;
}

interface DemandData {
  overview: DemandOverview;
  demandByType: DemandByType[];
  demandByCity: DemandByCity[];
  demandByProfession: DemandByProfession[];
  demandTrend: DemandTrend[];
  supplyGaps: SupplyGap[];
  recentUnmatched: UnmatchedSearch[];
  activeWaitlist: WaitlistEntry[];
}

export default function AdminDemandPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DemandData | null>(null);
  const [days, setDays] = useState("30");
  const [cityFilter, setCityFilter] = useState("");
  const [professionFilter, setProfessionFilter] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user?.role !== "ADMIN") {
      router.push("/");
      return;
    }
    fetchDemandData();
  }, [session, status, router, days]);

  const fetchDemandData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ days });
      if (cityFilter) params.append("city", cityFilter);
      if (professionFilter) params.append("professionId", professionFilter);

      const response = await fetch(`/api/admin/demand?${params}`);
      if (!response.ok) throw new Error("Failed to fetch demand data");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching demand data:", error);
      toast.error("Failed to load demand analytics");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-500 text-white";
      case "high": return "bg-orange-500 text-white";
      case "moderate": return "bg-yellow-500 text-black";
      case "low": return "bg-green-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getSignalTypeLabel = (type: string) => {
    switch (type) {
      case "SEARCH": return "Search";
      case "FILTER": return "Filter Applied";
      case "NO_RESULTS": return "No Results";
      case "BOOKING_ATTEMPT": return "Booking Attempt";
      case "WAITLIST_JOIN": return "Waitlist Join";
      default: return type;
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

  const maxTrendCount = Math.max(...data.demandTrend.map(d => d.count), 1);

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
              <h1 className="text-3xl font-bold">Demand Analytics</h1>
              <p className="text-muted-foreground">
                Track search demand, supply gaps, and conversion rates
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
            <Button variant="outline" size="icon" onClick={fetchDemandData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Search className="h-4 w-4" />
                Total Searches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.overview.totalSignals.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                In the last {days} days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Match Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{data.overview.matchRate}%</span>
                {data.overview.matchRate >= 70 ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {data.overview.matchedSignals.toLocaleString()} matched / {data.overview.unmatchedSignals.toLocaleString()} unmatched
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                Conversion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{data.overview.conversionRate}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {data.overview.bookingsCreated.toLocaleString()} bookings created
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Bell className="h-4 w-4 text-orange-500" />
                Active Waitlist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.overview.waitlistCount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Waiting for workers
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Demand Trend Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Demand Trend
            </CardTitle>
            <CardDescription>Daily search volume and match rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end gap-1">
              {data.demandTrend.map((day, index) => (
                <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                  <div className="w-full flex flex-col gap-0.5">
                    <div
                      className="w-full bg-blue-500 rounded-t transition-all"
                      style={{ height: `${(day.count / maxTrendCount) * 200}px` }}
                    />
                    <div
                      className="w-full bg-green-500 rounded-b transition-all"
                      style={{ height: `${(day.matched / maxTrendCount) * 200}px` }}
                    />
                  </div>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {format(new Date(day.date), "MMM d")}: {day.count} searches, {day.matched} matched
                  </div>
                  {index % 7 === 0 && (
                    <span className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(day.date), "M/d")}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-sm text-muted-foreground">Total Searches</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span className="text-sm text-muted-foreground">Matched</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different views */}
        <Tabs defaultValue="gaps" className="space-y-4">
          <TabsList>
            <TabsTrigger value="gaps">Supply Gaps</TabsTrigger>
            <TabsTrigger value="cities">By City</TabsTrigger>
            <TabsTrigger value="professions">By Profession</TabsTrigger>
            <TabsTrigger value="unmatched">Unmatched Searches</TabsTrigger>
            <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
          </TabsList>

          {/* Supply Gaps */}
          <TabsContent value="gaps">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Supply Gaps
                </CardTitle>
                <CardDescription>
                  Areas with high demand but insufficient worker coverage
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.supplyGaps.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No significant supply gaps detected
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Demand</TableHead>
                        <TableHead className="text-right">Workers</TableHead>
                        <TableHead className="text-right">Gap</TableHead>
                        <TableHead>Severity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.supplyGaps.map((gap, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              {gap.city}, {gap.country}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{gap.demandCount}</TableCell>
                          <TableCell className="text-right">{gap.workerCount}</TableCell>
                          <TableCell className="text-right font-bold text-red-500">
                            +{gap.gap}
                          </TableCell>
                          <TableCell>
                            <Badge className={getSeverityColor(gap.severity)}>
                              {gap.severity}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* By City */}
          <TabsContent value="cities">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Demand by City
                </CardTitle>
                <CardDescription>Top 20 cities by search volume</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.demandByCity.map((city, index) => {
                    const maxCount = data.demandByCity[0]?.count || 1;
                    const percentage = (city.count / maxCount) * 100;
                    return (
                      <div key={index} className="flex items-center gap-4">
                        <span className="w-8 text-sm text-muted-foreground text-right">
                          #{index + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{city.city || "Unknown"}</span>
                            <span className="text-sm text-muted-foreground">
                              {city.count} searches
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* By Profession */}
          <TabsContent value="professions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Demand by Profession
                </CardTitle>
                <CardDescription>Top 20 professions by search volume</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.demandByProfession.map((item, index) => {
                    const maxCount = data.demandByProfession[0]?.count || 1;
                    const percentage = (item.count / maxCount) * 100;
                    return (
                      <div key={index} className="flex items-center gap-4">
                        <span className="w-8 text-sm text-muted-foreground text-right">
                          #{index + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">
                              {item.profession?.emoji} {item.profession?.name || "Unknown"}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {item.count} searches
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Unmatched Searches */}
          <TabsContent value="unmatched">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  Recent Unmatched Searches
                </CardTitle>
                <CardDescription>
                  Searches that did not find any available workers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Search Query</TableHead>
                      <TableHead>Requested Date</TableHead>
                      <TableHead>Searched At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentUnmatched.map((search) => (
                      <TableRow key={search.id}>
                        <TableCell>
                          <span className="flex items-center gap-2">
                            {search.emoji && <span>{search.emoji}</span>}
                            {search.profession || "Any"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {search.city ? `${search.city}, ${search.country}` : "Not specified"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {search.searchQuery || "-"}
                        </TableCell>
                        <TableCell>
                          {search.requestedDate
                            ? format(new Date(search.requestedDate), "MMM d, yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(search.createdAt), "MMM d, HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Waitlist */}
          <TabsContent value="waitlist">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  Active Waitlist
                </CardTitle>
                <CardDescription>
                  Customers waiting to be notified when workers become available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.activeWaitlist.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <span className="flex items-center gap-2">
                            {entry.emoji && <span>{entry.emoji}</span>}
                            {entry.profession || "Any"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {entry.city ? `${entry.city}, ${entry.country}` : "Not specified"}
                        </TableCell>
                        <TableCell className="font-medium">{entry.customer}</TableCell>
                        <TableCell className="text-muted-foreground">{entry.email || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(entry.joinedAt), "MMM d, HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Signal Types Distribution */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Signal Types
            </CardTitle>
            <CardDescription>Breakdown of demand signal types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {data.demandByType.map((type) => (
                <div
                  key={type.type}
                  className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 text-center"
                >
                  <div className="text-2xl font-bold">{type.count}</div>
                  <div className="text-sm text-muted-foreground">
                    {getSignalTypeLabel(type.type)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
