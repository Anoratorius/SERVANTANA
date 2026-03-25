"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
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
  FolderPlus,
  FileText,
  AlertCircle,
  Eye,
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

interface Category {
  id: string;
  name: string;
  nameDE: string | null;
  description: string | null;
  emoji: string;
  gradient: string;
  status: string;
  createdAt: string;
}

interface Dispute {
  id: string;
  type: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
  booking: {
    scheduledDate: string;
    totalPrice: number;
    service: { name: string };
  };
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  cleaner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  _count: {
    messages: number;
    evidence: number;
  };
}

interface Document {
  id: string;
  type: string;
  fileUrl: string;
  status: string;
  rejectionNote: string | null;
  createdAt: string;
  verifiedAt: string | null;
  cleaner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar: string | null;
  };
  verifiedBy: {
    firstName: string;
    lastName: string;
  } | null;
}

interface AdminBooking {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
  totalPrice: number;
  address: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar: string | null;
  };
  cleaner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar: string | null;
  };
  service: {
    id: string;
    name: string;
  };
  review: {
    id: string;
    rating: number;
  } | null;
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
  const t = useTranslations();
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

  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoriesFilter, setCategoriesFilter] = useState("PENDING");
  const [processingCategoryId, setProcessingCategoryId] = useState<string | null>(null);

  // Disputes state
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [disputesPage, setDisputesPage] = useState(1);
  const [disputesTotalPages, setDisputesTotalPages] = useState(1);
  const [disputesFilter, setDisputesFilter] = useState("OPEN");
  const [loadingDisputes, setLoadingDisputes] = useState(false);
  const [disputeCounts, setDisputeCounts] = useState({ open: 0, inReview: 0, resolved: 0, closed: 0 });

  // Documents state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentsPage, setDocumentsPage] = useState(1);
  const [documentsTotalPages, setDocumentsTotalPages] = useState(1);
  const [documentsFilter, setDocumentsFilter] = useState("PENDING");
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);

  // Bookings state
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookingsTotalPages, setBookingsTotalPages] = useState(1);
  const [bookingsFilter, setBookingsFilter] = useState("all");
  const [loadingBookings, setLoadingBookings] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/admin");
      return;
    }

    if (authStatus === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
      toast.error(t("admin.accessDenied"));
      return;
    }
  }, [authStatus, session, router, t]);

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

  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const response = await fetch(`/api/admin/categories?status=${categoriesFilter}`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoadingCategories(false);
    }
  }, [categoriesFilter]);

  const fetchDisputes = useCallback(async () => {
    setLoadingDisputes(true);
    try {
      const params = new URLSearchParams({
        page: disputesPage.toString(),
        limit: "10",
        status: disputesFilter,
      });

      const response = await fetch(`/api/admin/disputes?${params}`);
      if (response.ok) {
        const data = await response.json();
        setDisputes(data.disputes);
        setDisputesTotalPages(data.pagination.totalPages);
        setDisputeCounts(data.counts);
      }
    } catch (error) {
      console.error("Error fetching disputes:", error);
    } finally {
      setLoadingDisputes(false);
    }
  }, [disputesPage, disputesFilter]);

  const fetchDocuments = useCallback(async () => {
    setLoadingDocuments(true);
    try {
      const params = new URLSearchParams({
        page: documentsPage.toString(),
        limit: "10",
        status: documentsFilter,
      });

      const response = await fetch(`/api/admin/documents?${params}`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents);
        setDocumentsTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoadingDocuments(false);
    }
  }, [documentsPage, documentsFilter]);

  const fetchBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const params = new URLSearchParams({
        page: bookingsPage.toString(),
        limit: "10",
      });
      if (bookingsFilter !== "all") {
        params.set("status", bookingsFilter);
      }

      const response = await fetch(`/api/admin/bookings?${params}`);
      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings);
        setBookingsTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoadingBookings(false);
    }
  }, [bookingsPage, bookingsFilter]);

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

  useEffect(() => {
    if (activeTab === "categories" && authStatus === "authenticated") {
      fetchCategories();
    }
  }, [activeTab, fetchCategories, authStatus]);

  useEffect(() => {
    if (activeTab === "disputes" && authStatus === "authenticated") {
      fetchDisputes();
    }
  }, [activeTab, fetchDisputes, authStatus]);

  useEffect(() => {
    if (activeTab === "documents" && authStatus === "authenticated") {
      fetchDocuments();
    }
  }, [activeTab, fetchDocuments, authStatus]);

  useEffect(() => {
    if (activeTab === "bookings" && authStatus === "authenticated") {
      fetchBookings();
    }
  }, [activeTab, fetchBookings, authStatus]);

  const handleVerifyCleaner = async (userId: string, verified: boolean) => {
    setVerifyingId(userId);
    try {
      const response = await fetch(`/api/admin/cleaners/${userId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified }),
      });

      if (response.ok) {
        toast.success(verified ? t("admin.workerVerified") : t("admin.verificationRevoked"));
        fetchCleaners();
        fetchStats();
      } else {
        toast.error(t("admin.failedVerification"));
      }
    } catch {
      toast.error(t("admin.failedVerification"));
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm(t("admin.confirmDeleteReview"))) return;

    setDeletingReviewId(reviewId);
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(t("admin.reviewDeleted"));
        fetchReviews();
        fetchStats();
      } else {
        toast.error(t("admin.failedDeleteReview"));
      }
    } catch {
      toast.error(t("admin.failedDeleteReview"));
    } finally {
      setDeletingReviewId(null);
    }
  };

  const handleCategoryAction = async (categoryId: string, status: "APPROVED" | "REJECTED") => {
    setProcessingCategoryId(categoryId);
    try {
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast.success(status === "APPROVED" ? t("admin.categoryApproved") : t("admin.categoryRejected"));
        fetchCategories();
      } else {
        toast.error(t("admin.failedCategoryAction"));
      }
    } catch {
      toast.error(t("admin.failedCategoryAction"));
    } finally {
      setProcessingCategoryId(null);
    }
  };

  const handleDocumentAction = async (docId: string, action: "verify" | "reject") => {
    setProcessingDocId(docId);
    try {
      const response = await fetch(`/api/admin/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        toast.success(action === "verify" ? t("admin.documentVerified") : t("admin.documentRejected"));
        fetchDocuments();
      } else {
        toast.error(t("admin.failedDocumentAction"));
      }
    } catch {
      toast.error(t("admin.failedDocumentAction"));
    } finally {
      setProcessingDocId(null);
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
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-8">
            <Shield className="h-12 w-12 mx-auto text-purple-500 mb-4" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              {t("admin.title")}
            </h1>
            <p className="text-muted-foreground">{t("admin.subtitle")}</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 w-full justify-center flex-wrap gap-1">
              <TabsTrigger value="overview" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                {t("admin.overview")}
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                {t("admin.users")}
              </TabsTrigger>
              <TabsTrigger value="bookings" className="gap-2">
                <Calendar className="h-4 w-4" />
                {t("admin.bookings")}
              </TabsTrigger>
              <TabsTrigger value="cleaners" className="gap-2">
                <UserCheck className="h-4 w-4" />
                {t("admin.verification")}
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-2">
                <FileText className="h-4 w-4" />
                {t("admin.documentsTab")}
              </TabsTrigger>
              <TabsTrigger value="disputes" className="gap-2">
                <AlertCircle className="h-4 w-4" />
                {t("admin.disputesTab")}
                {disputeCounts.open > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 justify-center">
                    {disputeCounts.open}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="reviews" className="gap-2">
                <Star className="h-4 w-4" />
                {t("admin.reviews")}
              </TabsTrigger>
              <TabsTrigger value="categories" className="gap-2">
                <FolderPlus className="h-4 w-4" />
                {t("admin.categories")}
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
                      label="Total Workers"
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
                                {user.role === "CLEANER" ? "WORKER" : user.role}
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
                        <option value="CLEANER">Workers</option>
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
                                {user.role === "CLEANER" ? "WORKER" : user.role}
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

            {/* Workers Verification Tab */}
            <TabsContent value="cleaners">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Worker Verification</CardTitle>
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
                        ? "No workers pending verification"
                        : "No verified workers"}
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

            {/* Categories Tab */}
            <TabsContent value="categories">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{t("admin.categoryManagement")}</CardTitle>
                    <select
                      value={categoriesFilter}
                      onChange={(e) => setCategoriesFilter(e.target.value)}
                      className="border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="PENDING">{t("admin.pendingCategories")}</option>
                      <option value="APPROVED">{t("admin.approvedCategories")}</option>
                      <option value="REJECTED">{t("admin.rejectedCategories")}</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingCategories ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : categories.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {t("admin.noCategories")}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {categories.map((category) => (
                        <div
                          key={category.id}
                          className="p-4 border rounded-lg"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${category.gradient} flex items-center justify-center shadow-md`}>
                                <span className="text-2xl">{category.emoji}</span>
                              </div>
                              <div>
                                <p className="font-semibold text-lg">{category.name}</p>
                                {category.nameDE && (
                                  <p className="text-sm text-muted-foreground">DE: {category.nameDE}</p>
                                )}
                                {category.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                  {new Date(category.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            {category.status === "PENDING" && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-green-500 hover:bg-green-600"
                                  onClick={() => handleCategoryAction(category.id, "APPROVED")}
                                  disabled={processingCategoryId === category.id}
                                >
                                  {processingCategoryId === category.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                  )}
                                  {t("admin.approve")}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600"
                                  onClick={() => handleCategoryAction(category.id, "REJECTED")}
                                  disabled={processingCategoryId === category.id}
                                >
                                  {processingCategoryId === category.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <XCircle className="h-4 w-4 mr-1" />
                                  )}
                                  {t("admin.reject")}
                                </Button>
                              </div>
                            )}
                            {category.status !== "PENDING" && (
                              <Badge variant={category.status === "APPROVED" ? "default" : "destructive"}>
                                {category.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bookings Tab */}
            <TabsContent value="bookings">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{t("admin.bookingsManagement")}</CardTitle>
                    <select
                      value={bookingsFilter}
                      onChange={(e) => setBookingsFilter(e.target.value)}
                      className="border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="all">{t("admin.allBookings")}</option>
                      <option value="PENDING">{t("booking.status.pending")}</option>
                      <option value="CONFIRMED">{t("booking.status.confirmed")}</option>
                      <option value="IN_PROGRESS">{t("booking.status.inProgress")}</option>
                      <option value="COMPLETED">{t("booking.status.completed")}</option>
                      <option value="CANCELLED">{t("booking.status.cancelled")}</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingBookings ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : bookings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {t("admin.noBookings")}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {bookings.map((booking) => (
                          <div
                            key={booking.id}
                            className="p-4 border rounded-lg"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex -space-x-2">
                                  <Avatar className="border-2 border-white">
                                    <AvatarImage src={booking.customer.avatar || undefined} />
                                    <AvatarFallback className="text-xs">
                                      {booking.customer.firstName[0]}{booking.customer.lastName[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <Avatar className="border-2 border-white">
                                    <AvatarImage src={booking.cleaner.avatar || undefined} />
                                    <AvatarFallback className="text-xs">
                                      {booking.cleaner.firstName[0]}{booking.cleaner.lastName[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                                <div>
                                  <p className="font-medium">
                                    {SERVICE_NAMES[booking.service.name] || booking.service.name}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {booking.customer.firstName} → {booking.cleaner.firstName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(booking.scheduledDate).toLocaleDateString()} at {booking.scheduledTime}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-green-600">${booking.totalPrice}</p>
                                <Badge
                                  variant="outline"
                                  className={
                                    booking.status === "COMPLETED"
                                      ? "text-green-600 border-green-600"
                                      : booking.status === "CANCELLED"
                                      ? "text-red-600 border-red-600"
                                      : booking.status === "IN_PROGRESS"
                                      ? "text-purple-600 border-purple-600"
                                      : "text-blue-600 border-blue-600"
                                  }
                                >
                                  {booking.status}
                                </Badge>
                                {booking.review && (
                                  <div className="flex items-center gap-1 mt-1 justify-end">
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    <span className="text-sm">{booking.review.rating}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                          {t("admin.page")} {bookingsPage} {t("admin.of")} {bookingsTotalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setBookingsPage((p) => Math.max(1, p - 1))}
                            disabled={bookingsPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setBookingsPage((p) => Math.min(bookingsTotalPages, p + 1))}
                            disabled={bookingsPage === bookingsTotalPages}
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

            {/* Documents Tab */}
            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{t("admin.documentVerification")}</CardTitle>
                    <select
                      value={documentsFilter}
                      onChange={(e) => setDocumentsFilter(e.target.value)}
                      className="border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="PENDING">{t("documents.status.pending")}</option>
                      <option value="VERIFIED">{t("documents.status.approved")}</option>
                      <option value="REJECTED">{t("documents.status.rejected")}</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingDocuments ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {t("admin.noDocuments")}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        {documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="p-4 border rounded-lg"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage src={doc.cleaner.avatar || undefined} />
                                  <AvatarFallback>
                                    {doc.cleaner.firstName[0]}{doc.cleaner.lastName[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {doc.cleaner.firstName} {doc.cleaner.lastName}
                                  </p>
                                  <p className="text-sm text-muted-foreground">{doc.cleaner.email}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary">{doc.type}</Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(doc.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(doc.fileUrl, "_blank")}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  {t("admin.viewDocument")}
                                </Button>
                                {doc.status === "PENDING" && (
                                  <>
                                    <Button
                                      size="sm"
                                      className="bg-green-500 hover:bg-green-600"
                                      onClick={() => handleDocumentAction(doc.id, "verify")}
                                      disabled={processingDocId === doc.id}
                                    >
                                      {processingDocId === doc.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                      )}
                                      {t("admin.verify")}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600"
                                      onClick={() => handleDocumentAction(doc.id, "reject")}
                                      disabled={processingDocId === doc.id}
                                    >
                                      {processingDocId === doc.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <XCircle className="h-4 w-4 mr-1" />
                                      )}
                                      {t("admin.reject")}
                                    </Button>
                                  </>
                                )}
                                {doc.status !== "PENDING" && (
                                  <Badge variant={doc.status === "VERIFIED" ? "default" : "destructive"}>
                                    {doc.status}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {doc.rejectionNote && (
                              <p className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                                {doc.rejectionNote}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                          {t("admin.page")} {documentsPage} {t("admin.of")} {documentsTotalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDocumentsPage((p) => Math.max(1, p - 1))}
                            disabled={documentsPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDocumentsPage((p) => Math.min(documentsTotalPages, p + 1))}
                            disabled={documentsPage === documentsTotalPages}
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

            {/* Disputes Tab */}
            <TabsContent value="disputes">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{t("admin.disputeManagement")}</CardTitle>
                    <div className="flex items-center gap-4">
                      <div className="flex gap-2 text-sm">
                        <Badge variant="destructive">{disputeCounts.open} Open</Badge>
                        <Badge variant="secondary">{disputeCounts.inReview} In Review</Badge>
                        <Badge variant="default">{disputeCounts.resolved} Resolved</Badge>
                      </div>
                      <select
                        value={disputesFilter}
                        onChange={(e) => setDisputesFilter(e.target.value)}
                        className="border rounded-md px-3 py-2 text-sm"
                      >
                        <option value="OPEN">{t("support.dispute.status.open")}</option>
                        <option value="IN_REVIEW">{t("support.dispute.status.inProgress")}</option>
                        <option value="RESOLVED">{t("support.dispute.status.resolved")}</option>
                        <option value="CLOSED">{t("support.dispute.status.closed")}</option>
                      </select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingDisputes ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : disputes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {t("admin.noDisputes")}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        {disputes.map((dispute) => (
                          <div
                            key={dispute.id}
                            className="p-4 border rounded-lg"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline">{dispute.type}</Badge>
                                  <Badge
                                    variant={
                                      dispute.status === "OPEN"
                                        ? "destructive"
                                        : dispute.status === "IN_REVIEW"
                                        ? "secondary"
                                        : "default"
                                    }
                                  >
                                    {dispute.status}
                                  </Badge>
                                </div>
                                <p className="font-medium">{dispute.subject}</p>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {dispute.description}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                  <span>
                                    {dispute.customer.firstName} vs {dispute.cleaner.firstName}
                                  </span>
                                  <span>•</span>
                                  <span>${dispute.booking.totalPrice}</span>
                                  <span>•</span>
                                  <span>{dispute._count.messages} messages</span>
                                  <span>•</span>
                                  <span>{dispute._count.evidence} evidence</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">
                                  {new Date(dispute.createdAt).toLocaleDateString()}
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mt-2"
                                  onClick={() => window.open(`/support/disputes/${dispute.id}`, "_blank")}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  {t("admin.viewDetails")}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                          {t("admin.page")} {disputesPage} {t("admin.of")} {disputesTotalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDisputesPage((p) => Math.max(1, p - 1))}
                            disabled={disputesPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDisputesPage((p) => Math.min(disputesTotalPages, p + 1))}
                            disabled={disputesPage === disputesTotalPages}
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
