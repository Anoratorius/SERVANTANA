"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Users,
  Briefcase,
  Calendar,
  Star,
  DollarSign,
  TrendingUp,
  CheckCircle,
  XCircle,
  Shield,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserCheck,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

interface Stats {
  overview: {
    totalUsers: number;
    totalCustomers: number;
    totalCleaners: number;
    verifiedCleaners: number;
    pendingVerification: number;
    totalBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    totalRevenue: number;
    newUsersThisMonth: number;
    newBookingsThisWeek: number;
    totalReviews: number;
    averageRating: number;
  };
  recentBookings: Array<{
    id: string;
    scheduledDate: string;
    status: string;
    totalPrice: number;
    customer: { firstName: string; lastName: string };
    cleaner: { firstName: string; lastName: string };
    service: { name: string };
  }>;
  recentUsers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    createdAt: string;
  }>;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatar: string | null;
  role: string;
  createdAt: string;
  cleanerProfile?: {
    verified: boolean;
    averageRating: number;
    totalBookings: number;
  } | null;
}

interface Cleaner {
  id: string;
  verified: boolean;
  hourlyRate: number;
  averageRating: number;
  totalBookings: number;
  city: string | null;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    avatar: string | null;
    createdAt: string;
  };
  services: Array<{ service: { name: string } }>;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
  reviewee: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
  booking: {
    id: string;
    service: { name: string };
  };
}

const SERVICE_NAMES: Record<string, string> = {
  regular: "Regular Cleaning",
  deep: "Deep Cleaning",
  moveInOut: "Move In/Out",
  office: "Office",
  window: "Window",
  carpet: "Carpet",
  laundry: "Laundry",
  organizing: "Organizing",
};

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersSearch, setUsersSearch] = useState("");
  const [usersRoleFilter, setUsersRoleFilter] = useState("all");
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Cleaners state
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [cleanersPage, setCleanersPage] = useState(1);
  const [cleanersTotalPages, setCleanersTotalPages] = useState(1);
  const [cleanersFilter, setCleanersFilter] = useState("false"); // pending verification
  const [loadingCleaners, setLoadingCleaners] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/admin");
      return;
    }

    if (authStatus === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
      toast.error("Access denied. Admin only.");
      return;
    }
  }, [authStatus, session, router]);

  useEffect(() => {
    if (authStatus === "authenticated" && session?.user?.role === "ADMIN") {
      fetchStats();
    }
  }, [authStatus, session]);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams({
        page: usersPage.toString(),
        limit: "10",
        role: usersRoleFilter,
      });
      if (usersSearch) params.set("search", usersSearch);

      const response = await fetch(`/api/admin/users?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setUsersTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoadingUsers(false);
    }
  }, [usersPage, usersRoleFilter, usersSearch]);

  const fetchCleaners = useCallback(async () => {
    setLoadingCleaners(true);
    try {
      const params = new URLSearchParams({
        page: cleanersPage.toString(),
        limit: "10",
        verified: cleanersFilter,
      });

      const response = await fetch(`/api/admin/cleaners?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCleaners(data.cleaners);
        setCleanersTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching cleaners:", error);
    } finally {
      setLoadingCleaners(false);
    }
  }, [cleanersPage, cleanersFilter]);

  const fetchReviews = useCallback(async () => {
    setLoadingReviews(true);
    try {
      const params = new URLSearchParams({
        page: reviewsPage.toString(),
        limit: "10",
      });

      const response = await fetch(`/api/admin/reviews?${params}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews);
        setReviewsTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoadingReviews(false);
    }
  }, [reviewsPage]);

  useEffect(() => {
    if (activeTab === "users" && authStatus === "authenticated") {
      fetchUsers();
    }
  }, [activeTab, fetchUsers, authStatus]);

  useEffect(() => {
    if (activeTab === "cleaners" && authStatus === "authenticated") {
      fetchCleaners();
    }
  }, [activeTab, fetchCleaners, authStatus]);

  useEffect(() => {
    if (activeTab === "reviews" && authStatus === "authenticated") {
      fetchReviews();
    }
  }, [activeTab, fetchReviews, authStatus]);

  const handleVerifyCleaner = async (userId: string, verified: boolean) => {
    setVerifyingId(userId);
    try {
      const response = await fetch(`/api/admin/cleaners/${userId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified }),
      });

      if (response.ok) {
        toast.success(verified ? "Cleaner verified!" : "Verification revoked");
        fetchCleaners();
        fetchStats();
      } else {
        toast.error("Failed to update verification");
      }
    } catch {
      toast.error("Failed to update verification");
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;

    setDeletingReviewId(reviewId);
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Review deleted");
        fetchReviews();
        fetchStats();
      } else {
        toast.error("Failed to delete review");
      }
    } catch {
      toast.error("Failed to delete review");
    } finally {
      setDeletingReviewId(null);
    }
  };

  if (authStatus === "loading" || isLoading) {
    return <AdminSkeleton />;
  }

  if (session?.user?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-b from-purple-50 to-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="h-8 w-8 text-purple-500" />
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground">Manage your marketplace</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="overview" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="cleaners" className="gap-2">
                <UserCheck className="h-4 w-4" />
                Verification
              </TabsTrigger>
              <TabsTrigger value="reviews" className="gap-2">
                <Star className="h-4 w-4" />
                Reviews
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              {stats && (
                <div className="space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                      icon={<Users className="h-5 w-5" />}
                      label="Total Users"
                      value={stats.overview.totalUsers}
                      color="blue"
                    />
                    <StatCard
                      icon={<Briefcase className="h-5 w-5" />}
                      label="Total Cleaners"
                      value={stats.overview.totalCleaners}
                      color="green"
                      subtext={`${stats.overview.verifiedCleaners} verified`}
                    />
                    <StatCard
                      icon={<Calendar className="h-5 w-5" />}
                      label="Total Bookings"
                      value={stats.overview.totalBookings}
                      color="purple"
                      subtext={`${stats.overview.completedBookings} completed`}
                    />
                    <StatCard
                      icon={<DollarSign className="h-5 w-5" />}
                      label="Total Revenue"
                      value={`$${stats.overview.totalRevenue.toLocaleString()}`}
                      color="emerald"
                    />
                  </div>

                  {/* Secondary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                      icon={<AlertTriangle className="h-5 w-5" />}
                      label="Pending Verification"
                      value={stats.overview.pendingVerification}
                      color="yellow"
                    />
                    <StatCard
                      icon={<TrendingUp className="h-5 w-5" />}
                      label="New Users (30d)"
                      value={stats.overview.newUsersThisMonth}
                      color="blue"
                    />
                    <StatCard
                      icon={<Star className="h-5 w-5" />}
                      label="Total Reviews"
                      value={stats.overview.totalReviews}
                      color="yellow"
                      subtext={`Avg: ${stats.overview.averageRating.toFixed(1)}`}
                    />
                    <StatCard
                      icon={<XCircle className="h-5 w-5" />}
                      label="Cancelled"
                      value={stats.overview.cancelledBookings}
                      color="red"
                    />
                  </div>

                  {/* Recent Activity */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Users</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {stats.recentUsers.map((user) => (
                            <div key={user.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs">
                                    {user.firstName[0]}{user.lastName[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">
                                    {user.firstName} {user.lastName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{user.email}</p>
                                </div>
                              </div>
                              <Badge variant={user.role === "CLEANER" ? "default" : "secondary"}>
                                {user.role}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Bookings</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {stats.recentBookings.map((booking) => (
                            <div key={booking.id} className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">
                                  {SERVICE_NAMES[booking.service.name] || booking.service.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {booking.customer.firstName} → {booking.cleaner.firstName}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-green-600">
                                  ${booking.totalPrice}
                                </p>
                                <Badge
                                  variant="outline"
                                  className={
                                    booking.status === "COMPLETED"
                                      ? "text-green-600"
                                      : booking.status === "CANCELLED"
                                      ? "text-red-600"
                                      : "text-blue-600"
                                  }
                                >
                                  {booking.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle>User Management</CardTitle>
                    <div className="flex gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search users..."
                          value={usersSearch}
                          onChange={(e) => setUsersSearch(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && fetchUsers()}
                          className="pl-9 w-48"
                        />
                      </div>
                      <select
                        value={usersRoleFilter}
                        onChange={(e) => setUsersRoleFilter(e.target.value)}
                        className="border rounded-md px-3 py-2 text-sm"
                      >
                        <option value="all">All Roles</option>
                        <option value="CUSTOMER">Customers</option>
                        <option value="CLEANER">Cleaners</option>
                        <option value="ADMIN">Admins</option>
                      </select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingUsers ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {users.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={user.avatar || undefined} />
                                <AvatarFallback>
                                  {user.firstName[0]}{user.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {user.firstName} {user.lastName}
                                </p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {user.role === "CLEANER" && user.cleanerProfile && (
                                <div className="text-right text-sm">
                                  <div className="flex items-center gap-1">
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    {user.cleanerProfile.averageRating.toFixed(1)}
                                  </div>
                                  <span className="text-muted-foreground">
                                    {user.cleanerProfile.totalBookings} bookings
                                  </span>
                                </div>
                              )}
                              <Badge
                                variant={
                                  user.role === "ADMIN"
                                    ? "destructive"
                                    : user.role === "CLEANER"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {user.role}
                              </Badge>
                              {user.role === "CLEANER" && user.cleanerProfile?.verified && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                          Page {usersPage} of {usersTotalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                            disabled={usersPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUsersPage((p) => Math.min(usersTotalPages, p + 1))}
                            disabled={usersPage === usersTotalPages}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Cleaners Verification Tab */}
            <TabsContent value="cleaners">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Cleaner Verification</CardTitle>
                    <select
                      value={cleanersFilter}
                      onChange={(e) => setCleanersFilter(e.target.value)}
                      className="border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="false">Pending Verification</option>
                      <option value="true">Verified</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingCleaners ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : cleaners.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {cleanersFilter === "false"
                        ? "No cleaners pending verification"
                        : "No verified cleaners"}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        {cleaners.map((cleaner) => (
                          <div
                            key={cleaner.id}
                            className="p-4 border rounded-lg space-y-3"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage src={cleaner.user.avatar || undefined} />
                                  <AvatarFallback>
                                    {cleaner.user.firstName[0]}{cleaner.user.lastName[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {cleaner.user.firstName} {cleaner.user.lastName}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {cleaner.user.email}
                                  </p>
                                  {cleaner.city && (
                                    <p className="text-sm text-muted-foreground">
                                      {cleaner.city}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-green-600">
                                  ${cleaner.hourlyRate}/hr
                                </p>
                                <div className="flex items-center gap-1 text-sm">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  {cleaner.averageRating.toFixed(1)}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {cleaner.services.map((s, i) => (
                                <Badge key={i} variant="secondary">
                                  {SERVICE_NAMES[s.service.name] || s.service.name}
                                </Badge>
                              ))}
                            </div>

                            <div className="flex justify-end gap-2">
                              {cleaner.verified ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600"
                                  onClick={() => handleVerifyCleaner(cleaner.user.id, false)}
                                  disabled={verifyingId === cleaner.user.id}
                                >
                                  {verifyingId === cleaner.user.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <XCircle className="h-4 w-4 mr-1" />
                                  )}
                                  Revoke
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  className="bg-green-500 hover:bg-green-600"
                                  onClick={() => handleVerifyCleaner(cleaner.user.id, true)}
                                  disabled={verifyingId === cleaner.user.id}
                                >
                                  {verifyingId === cleaner.user.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                  )}
                                  Verify
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                          Page {cleanersPage} of {cleanersTotalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCleanersPage((p) => Math.max(1, p - 1))}
                            disabled={cleanersPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCleanersPage((p) => Math.min(cleanersTotalPages, p + 1))}
                            disabled={cleanersPage === cleanersTotalPages}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews">
              <Card>
                <CardHeader>
                  <CardTitle>Review Moderation</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingReviews ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No reviews to moderate
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        {reviews.map((review) => (
                          <div
                            key={review.id}
                            className="p-4 border rounded-lg space-y-3"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage src={review.reviewer.avatar || undefined} />
                                  <AvatarFallback>
                                    {review.reviewer.firstName[0]}{review.reviewer.lastName[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {review.reviewer.firstName} {review.reviewer.lastName}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    reviewed {review.reviewee.firstName} {review.reviewee.lastName}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < review.rating
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>

                            {review.comment && (
                              <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded">
                                {review.comment}
                              </p>
                            )}

                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteReview(review.id)}
                                disabled={deletingReviewId === review.id}
                              >
                                {deletingReviewId === review.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 mr-1" />
                                )}
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                          Page {reviewsPage} of {reviewsTotalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReviewsPage((p) => Math.max(1, p - 1))}
                            disabled={reviewsPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReviewsPage((p) => Math.min(reviewsTotalPages, p + 1))}
                            disabled={reviewsPage === reviewsTotalPages}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  subtext?: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    emerald: "bg-emerald-100 text-emerald-600",
    yellow: "bg-yellow-100 text-yellow-600",
    red: "bg-red-100 text-red-600",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-b from-purple-50 to-white py-8">
        <div className="container mx-auto px-4">
          <Skeleton className="h-10 w-64 mb-8" />
          <Skeleton className="h-12 w-full mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
