"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Calendar,
  DollarSign,
  Star,
  TrendingUp,
  Users,
  CheckCircle,
  ArrowRight,
  Search,
  Shield,
} from "lucide-react";
import { Link } from "@/i18n/navigation";

interface DashboardStats {
  totalBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  totalEarnings?: number;
  averageRating?: number;
}

interface RecentBooking {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
  totalPrice: number;
  customer?: { firstName: string; lastName: string };
  cleaner?: { firstName: string; lastName: string };
  service: { name: string };
}

export default function DashboardPage() {
  const t = useTranslations();
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isCleaner = session?.user?.role === "WORKER";

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/dashboard");
    }
  }, [authStatus, router]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [statsRes, bookingsRes] = await Promise.all([
          fetch("/api/dashboard/stats"),
          fetch("/api/bookings?limit=5"),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json();
          setRecentBookings(bookingsData.bookings?.slice(0, 5) || []);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (authStatus === "authenticated") {
      fetchDashboardData();
    }
  }, [authStatus]);

  if (authStatus === "loading" || isLoading) {
    return <DashboardSkeleton />;
  }

  const userInitials = session?.user?.firstName && session?.user?.lastName
    ? `${session.user.firstName[0]}${session.user.lastName[0]}`
    : "U";

  return (
    <div className="bg-gradient-to-b from-blue-50 to-white py-8">
      <div className="container mx-auto px-4 max-w-5xl">

          {/* Welcome Section */}
          <div className="flex flex-col items-center text-center mb-8">
            <Avatar className="h-20 w-20 ring-4 ring-blue-100 mb-4">
              <AvatarImage src={session?.user?.image || undefined} />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-green-500 text-white">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-2xl font-bold">
              Welcome back, {session?.user?.firstName || session?.user?.name}!
            </h1>
            <p className="text-muted-foreground mb-4">
              {isCleaner ? t("worker.dashboard.title") : t("customer.dashboard.title")}
            </p>
            <div className="flex gap-3">
              <Link href={isCleaner ? "/dashboard/settings" : "/search"}>
                <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                  {isCleaner ? (
                    <>Edit Profile</>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      {t("customer.dashboard.quickBook")}
                    </>
                  )}
                </Button>
              </Link>
              <Link href="/dashboard/security">
                <Button variant="outline">
                  <Shield className="mr-2 h-4 w-4" />
                  Security
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={<Calendar className="h-6 w-6" />}
              label={isCleaner ? t("worker.dashboard.todayBookings") : "Upcoming Bookings"}
              value={stats?.upcomingBookings || 0}
              color="blue"
            />
            <StatCard
              icon={<CheckCircle className="h-6 w-6" />}
              label={isCleaner ? t("worker.dashboard.completedJobs") : "Completed"}
              value={stats?.completedBookings || 0}
              color="green"
            />
            {isCleaner ? (
              <>
                <Link href="/dashboard/earnings" className="block">
                  <StatCard
                    icon={<DollarSign className="h-6 w-6" />}
                    label={t("worker.dashboard.earnings")}
                    value={`$${stats?.totalEarnings || 0}`}
                    color="emerald"
                    clickable
                  />
                </Link>
                <StatCard
                  icon={<Star className="h-6 w-6" />}
                  label="Average Rating"
                  value={stats?.averageRating?.toFixed(1) || "0.0"}
                  color="yellow"
                />
              </>
            ) : (
              <>
                <StatCard
                  icon={<Users className="h-6 w-6" />}
                  label={t("customer.dashboard.favoriteWorkers")}
                  value={0}
                  color="purple"
                />
                <StatCard
                  icon={<TrendingUp className="h-6 w-6" />}
                  label="Total Bookings"
                  value={stats?.totalBookings || 0}
                  color="orange"
                />
              </>
            )}
          </div>

          {/* Recent Bookings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {isCleaner ? t("worker.dashboard.upcomingBookings") : t("customer.dashboard.upcomingBookings")}
              </CardTitle>
              <Link href="/bookings">
                <Button variant="ghost" size="sm">
                  {t("common.viewAll")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentBookings.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No bookings yet</p>
                  {!isCleaner && (
                    <Link href="/search">
                      <Button className="mt-4 bg-gradient-to-r from-blue-500 to-blue-600">
                        {t("booking.findWorker")}
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {recentBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">
                            {t(`cleaner.services.${booking.service.name}` as Parameters<typeof t>[0])}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(booking.scheduledDate).toLocaleDateString()} at {booking.scheduledTime}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-green-600">${booking.totalPrice}</span>
                        <Badge
                          className={
                            booking.status === "COMPLETED"
                              ? "bg-green-100 text-green-800"
                              : booking.status === "PENDING"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-blue-100 text-blue-800"
                          }
                        >
                          {booking.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  clickable = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: "blue" | "green" | "emerald" | "yellow" | "purple" | "orange";
  clickable?: boolean;
}) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    emerald: "from-emerald-500 to-emerald-600",
    yellow: "from-yellow-500 to-yellow-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
  };

  return (
    <Card className={clickable ? "hover:shadow-md transition-shadow cursor-pointer" : ""}>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses[color]} text-white`}>
            {icon}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          {clickable && (
            <ArrowRight className="h-5 w-5 text-muted-foreground ml-auto" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="bg-gradient-to-b from-blue-50 to-white py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}
