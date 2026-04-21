"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  UserPlus,
  UserCheck,
  Activity,
  Globe,
  MapPin,
  Smartphone,
  Monitor,
  Tablet,
  TrendingUp,
  Clock,
  BarChart3,
  RefreshCw,
  ArrowLeft,
  Shield,
  Ban,
  Chrome,
  Languages,
  MousePointer,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Link } from "@/i18n/navigation";

interface UserAnalyticsData {
  overview: {
    totalUsers: number;
    newUsersInPeriod: number;
    activeUsersInPeriod: number;
    verifiedUsers: number;
    suspendedUsers: number;
    bannedUsers: number;
    verificationRate: number;
    growthRate: number;
  };
  growthTrend: Array<{ date: string; newUsers: number; totalUsers: number }>;
  acquisitionSources: Array<{ source: string; count: number }>;
  deviceBreakdown: Array<{ device: string; count: number }>;
  browserBreakdown: Array<{ browser: string; count: number }>;
  osBreakdown: Array<{ os: string; count: number }>;
  countryBreakdown: Array<{ country: string; count: number }>;
  cityBreakdown: Array<{ city: string; country: string; count: number }>;
  languageBreakdown: Array<{ language: string; count: number }>;
  retention: Array<{ week: string; signups: number; returned: number; rate: number }>;
  topPages: Array<{ path: string; views: number }>;
  engagement: {
    avgTimeOnPage: number;
    totalTimeOnSite: number;
    avgScrollDepth: number;
  };
  recentSignups: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    verified: boolean;
    location: string | null;
    joinedAt: string;
  }>;
  workerStats: {
    total: number;
    verified: number;
    active: number;
    averageRating: number;
    verificationRate: number;
  } | null;
  customerStats: {
    total: number;
    withBookings: number;
    repeatCustomers: number;
    bookingRate: number;
    repeatRate: number;
  } | null;
}

export default function AdminUsersAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UserAnalyticsData | null>(null);
  const [days, setDays] = useState("30");
  const [userType, setUserType] = useState("all");

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user?.role !== "ADMIN") {
      router.push("/");
      return;
    }
    fetchData();
  }, [session, status, router, days, userType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ days });
      if (userType !== "all") params.append("userType", userType);

      const response = await fetch(`/api/admin/analytics/users?${params}`);
      if (!response.ok) throw new Error("Failed to fetch data");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching user analytics:", error);
      toast.error("Failed to load user analytics");
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (device: string) => {
    const d = device.toLowerCase();
    if (d.includes("mobile") || d.includes("phone")) return <Smartphone className="h-4 w-4" />;
    if (d.includes("tablet")) return <Tablet className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
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

  const maxGrowth = Math.max(...data.growthTrend.map(d => d.newUsers), 1);

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
              <h1 className="text-3xl font-bold">User Analytics</h1>
              <p className="text-muted-foreground">
                Track user growth, acquisition, and engagement
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={userType} onValueChange={setUserType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="CUSTOMER">Customers</SelectItem>
                <SelectItem value="WORKER">Workers</SelectItem>
              </SelectContent>
            </Select>
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
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.overview.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {data.overview.verificationRate}% verified
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-green-500" />
                New Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{data.overview.newUsersInPeriod}</span>
                {data.overview.growthRate > 0 && (
                  <Badge variant="secondary" className="text-green-600">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {data.overview.growthRate}%
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                In the last {days} days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                Active Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.overview.activeUsersInPeriod}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Had activity in period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-orange-500" />
                Account Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-lg font-bold text-orange-500">{data.overview.suspendedUsers}</div>
                  <p className="text-xs text-muted-foreground">Suspended</p>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-500">{data.overview.bannedUsers}</div>
                  <p className="text-xs text-muted-foreground">Banned</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Worker & Customer Stats */}
        {(data.workerStats || data.customerStats) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {data.workerStats && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Worker Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold">{data.workerStats.total}</div>
                      <div className="text-sm text-muted-foreground">Total Workers</div>
                    </div>
                    <div className="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{data.workerStats.verified}</div>
                      <div className="text-sm text-muted-foreground">Verified</div>
                    </div>
                    <div className="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{data.workerStats.active}</div>
                      <div className="text-sm text-muted-foreground">Active</div>
                    </div>
                    <div className="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {data.workerStats.averageRating.toFixed(1)}
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Rating</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {data.customerStats && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Customer Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold">{data.customerStats.total}</div>
                      <div className="text-sm text-muted-foreground">Total Customers</div>
                    </div>
                    <div className="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{data.customerStats.withBookings}</div>
                      <div className="text-sm text-muted-foreground">With Bookings</div>
                    </div>
                    <div className="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{data.customerStats.repeatCustomers}</div>
                      <div className="text-sm text-muted-foreground">Repeat Customers</div>
                    </div>
                    <div className="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {data.customerStats.repeatRate.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Repeat Rate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* User Growth Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              User Growth
            </CardTitle>
            <CardDescription>Daily new user signups</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end gap-1">
              {data.growthTrend.map((day, index) => (
                <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                  <div
                    className="w-full bg-green-500 rounded-t transition-all"
                    style={{ height: `${(day.newUsers / maxGrowth) * 180}px`, minHeight: day.newUsers > 0 ? "4px" : "0" }}
                  />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {format(new Date(day.date), "MMM d")}: +{day.newUsers} users (Total: {day.totalUsers})
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
        <Tabs defaultValue="acquisition" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="acquisition">Acquisition</TabsTrigger>
            <TabsTrigger value="geography">Geography</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="retention">Retention</TabsTrigger>
            <TabsTrigger value="signups">Recent Signups</TabsTrigger>
          </TabsList>

          {/* Acquisition Sources */}
          <TabsContent value="acquisition">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Acquisition Sources
                </CardTitle>
                <CardDescription>Where users are coming from (UTM tracking)</CardDescription>
              </CardHeader>
              <CardContent>
                {data.acquisitionSources.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No UTM data available. Users may be coming from direct traffic.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.acquisitionSources.map((source, index) => {
                      const maxCount = data.acquisitionSources[0]?.count || 1;
                      const percentage = (source.count / maxCount) * 100;
                      return (
                        <div key={index} className="flex items-center gap-4">
                          <span className="w-8 text-sm text-muted-foreground text-right">
                            #{index + 1}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium capitalize">{source.source}</span>
                              <span className="text-sm text-muted-foreground">
                                {source.count} users
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
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Geography */}
          <TabsContent value="geography">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Top Countries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.countryBreakdown.slice(0, 10).map((country, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span>{country.country}</span>
                        <Badge variant="secondary">{country.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Top Cities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.cityBreakdown.slice(0, 10).map((city, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span>{city.city}, {city.country}</span>
                        <Badge variant="secondary">{city.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Languages className="h-5 w-5" />
                    Languages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {data.languageBreakdown.map((lang, index) => (
                      <Badge key={index} variant="outline" className="text-sm">
                        {lang.language}: {lang.count}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Devices */}
          <TabsContent value="devices">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Device Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.deviceBreakdown.map((device, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          {getDeviceIcon(device.device)}
                          {device.device}
                        </span>
                        <Badge variant="secondary">{device.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Chrome className="h-5 w-5" />
                    Browsers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.browserBreakdown.slice(0, 8).map((browser, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span>{browser.browser}</span>
                        <Badge variant="secondary">{browser.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Operating Systems</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.osBreakdown.slice(0, 8).map((os, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span>{os.os}</span>
                        <Badge variant="secondary">{os.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Engagement */}
          <TabsContent value="engagement">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Engagement Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold">
                        {formatDuration(data.engagement.avgTimeOnPage)}
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Time on Page</div>
                    </div>
                    <div className="text-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold">
                        {Math.round(data.engagement.avgScrollDepth)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Scroll Depth</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MousePointer className="h-5 w-5" />
                    Top Pages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {data.topPages.map((page, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="truncate max-w-xs">{page.path}</span>
                        <Badge variant="secondary">{page.views}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Retention */}
          <TabsContent value="retention">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Weekly Retention
                </CardTitle>
                <CardDescription>
                  Users who signed up each week and returned after
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Week Starting</TableHead>
                      <TableHead className="text-right">Signups</TableHead>
                      <TableHead className="text-right">Returned</TableHead>
                      <TableHead className="text-right">Retention Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.retention.map((week, index) => (
                      <TableRow key={index}>
                        <TableCell>{week.week}</TableCell>
                        <TableCell className="text-right">{week.signups}</TableCell>
                        <TableCell className="text-right">{week.returned}</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={week.rate >= 30 ? "default" : week.rate >= 15 ? "secondary" : "outline"}
                            className={week.rate >= 30 ? "bg-green-500" : ""}
                          >
                            {week.rate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Signups */}
          <TabsContent value="signups">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Recent Signups
                </CardTitle>
                <CardDescription>Latest user registrations</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentSignups.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.role === "CLEANER" ? "Worker" : user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.verified ? (
                              <UserCheck className="h-4 w-4 text-green-500" />
                            ) : (
                              <Clock className="h-4 w-4 text-yellow-500" />
                            )}
                            {user.status === "BANNED" && <Ban className="h-4 w-4 text-red-500" />}
                            {user.status === "SUSPENDED" && <Shield className="h-4 w-4 text-orange-500" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.location || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(user.joinedAt), "MMM d, HH:mm")}
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
