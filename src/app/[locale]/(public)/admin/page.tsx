"use client";
// Admin Dashboard v2 - with bulk user selection

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
import { BackButton } from "@/components/ui/back-button";
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
  MoreHorizontal,
  UserCog,
  Ban,
  Clock,
  RefreshCw,
  History,
  Download,
  Plus,
  Pencil,
  Mail,
  Send,
  MapPin,
  Globe,
  Phone,
  Smartphone,
  Monitor,
  Laptop,
  Tablet,
  Wifi,
  CreditCard,
  Building2,
  Heart,
  MessageSquare,
  Activity,
  Wallet,
  Bitcoin,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  status: "ACTIVE" | "SUSPENDED" | "BANNED";
  suspendedUntil: string | null;
  suspendedReason: string | null;
  createdAt: string;
  workerProfile?: {
    verified: boolean;
    averageRating: number;
    totalBookings: number;
  } | null;
}

interface UserDetails extends User {
  latitude: number | null;
  longitude: number | null;
  locationCity: string | null;
  locationCountry: string | null;
  locationVerifiedAt: string | null;
  lastKnownIp: string | null;
  preferredLanguage: string;
  emailVerified: string | null;
  phoneVerified: string | null;
  updatedAt: string;
  workerProfile: {
    id: string;
    bio: string | null;
    hourlyRate: number;
    currency: string;
    experienceYears: number;
    verified: boolean;
    isActive: boolean;
    onboardingComplete: boolean;
    availableNow: boolean;
    ecoFriendly: boolean;
    petFriendly: boolean;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    serviceRadius: number;
    timezone: string;
    paypalEmail: string | null;
    iban: string | null;
    accountHolder: string | null;
    stripeAccountId: string | null;
    stripeOnboardingComplete: boolean;
    totalBookings: number;
    averageRating: number;
    responseTime: number | null;
    services: Array<{ service: { id: string; name: string } }>;
    cryptoWallets: Array<{ id: string; currency: string; address: string }>;
  } | null;
  bookingsAsCustomer: Array<{
    id: string;
    scheduledDate: string;
    status: string;
    totalPrice: number;
    cleaner: { firstName: string; lastName: string };
    service: { name: string };
  }>;
  bookingsAsCleaner: Array<{
    id: string;
    scheduledDate: string;
    status: string;
    totalPrice: number;
    customer: { firstName: string; lastName: string };
    service: { name: string };
  }>;
  reviewsReceived: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    reviewer: { firstName: string; lastName: string };
  }>;
  reviewsGiven: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    reviewee: { firstName: string; lastName: string };
  }>;
  userSessions: Array<{
    id: string;
    ip: string | null;
    userAgent: string | null;
    country: string | null;
    city: string | null;
    lastActiveAt: string;
    createdAt: string;
    isValid: boolean;
  }>;
  userDevices: Array<{
    id: string;
    name: string | null;
    browser: string | null;
    os: string | null;
    deviceType: string | null;
    isTrusted: boolean;
    lastSeenAt: string;
    lastIp: string | null;
    lastCountry: string | null;
    createdAt: string;
  }>;
  properties: Array<{
    id: string;
    name: string;
    address: string;
    city: string | null;
    isDefault: boolean;
  }>;
  disputesAsCustomer: Array<{
    id: string;
    status: string;
    subject: string;
    createdAt: string;
  }>;
  disputesAsCleaner: Array<{
    id: string;
    status: string;
    subject: string;
    createdAt: string;
  }>;
  cleanerDocuments: Array<{
    id: string;
    type: string;
    status: string;
    createdAt: string;
    verifiedAt: string | null;
  }>;
  _count: {
    bookingsAsCustomer: number;
    bookingsAsCleaner: number;
    reviewsReceived: number;
    reviewsGiven: number;
    messagesSent: number;
    messagesReceived: number;
    properties: number;
    favoriteCleaners: number;
    favoritedBy: number;
  };
}

interface AuditLog {
  id: string;
  action: string;
  actorId: string;
  actorEmail: string;
  targetId: string | null;
  targetType: string | null;
  details: Record<string, unknown>;
  ip: string | null;
  userAgent: string | null;
  severity: "low" | "medium" | "high" | "critical";
  createdAt: string;
}

interface EmailLog {
  id: string;
  type: string;
  channel: string;
  title: string;
  body: string;
  sent: boolean;
  sentAt: string | null;
  error: string | null;
  data: {
    recipientType?: string;
    sentBy?: string;
    sentByName?: string;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
}

interface Worker {
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

interface Profession {
  id: string;
  name: string;
  nameDE: string | null;
  emoji: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  categoryId: string | null;
  category: {
    id: string;
    name: string;
    nameDE: string | null;
  } | null;
  submittedBy: string | null;
  submittedByUser?: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  _count?: {
    workers: number;
  };
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
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workersPage, setWorkersPage] = useState(1);
  const [workersTotalPages, setWorkersTotalPages] = useState(1);
  const [workersFilter, setWorkersFilter] = useState("false"); // pending verification
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
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    nameDE: "",
    description: "",
    emoji: "📁",
    gradient: "from-blue-400 to-blue-600",
    status: "APPROVED" as "PENDING" | "APPROVED" | "REJECTED",
  });
  const [savingCategory, setSavingCategory] = useState(false);

  // Professions state
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [loadingProfessions, setLoadingProfessions] = useState(false);
  const [professionsFilter, setProfessionsFilter] = useState("PENDING");
  const [processingProfessionId, setProcessingProfessionId] = useState<string | null>(null);
  const [professionModalOpen, setProfessionModalOpen] = useState(false);
  const [editingProfession, setEditingProfession] = useState<Profession | null>(null);
  const [deleteProfessionDialogOpen, setDeleteProfessionDialogOpen] = useState(false);
  const [professionToDelete, setProfessionToDelete] = useState<Profession | null>(null);
  const [professionForm, setProfessionForm] = useState({
    name: "",
    nameDE: "",
    emoji: "👤",
    categoryId: "",
    status: "APPROVED" as "PENDING" | "APPROVED" | "REJECTED",
  });
  const [savingProfession, setSavingProfession] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);

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

  // User actions state
  const [usersStatusFilter, setUsersStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkSuspendDialogOpen, setBulkSuspendDialogOpen] = useState(false);
  const [bulkBanDialogOpen, setBulkBanDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [suspendDuration, setSuspendDuration] = useState("7d");
  const [suspendReason, setSuspendReason] = useState("");
  const [banReason, setBanReason] = useState("");
  const [processingAction, setProcessingAction] = useState(false);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLogsPage, setAuditLogsPage] = useState(0);
  const [auditLogsTotal, setAuditLogsTotal] = useState(0);
  const [auditLogsFilter, setAuditLogsFilter] = useState("all");
  const [auditLogsSeverity, setAuditLogsSeverity] = useState("all");
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);

  // Email state
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [emailsPage, setEmailsPage] = useState(1);
  const [emailsTotalPages, setEmailsTotalPages] = useState(1);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailForm, setEmailForm] = useState({
    subject: "",
    body: "",
    recipientType: "individual" as "individual" | "all" | "workers" | "customers",
    recipientId: "",
  });
  const [emailUserSearch, setEmailUserSearch] = useState("");
  const [emailSearchResults, setEmailSearchResults] = useState<User[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

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
      if (usersStatusFilter !== "all") params.set("status", usersStatusFilter);

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
  }, [usersPage, usersRoleFilter, usersSearch, usersStatusFilter]);

  const fetchCleaners = useCallback(async () => {
    setLoadingCleaners(true);
    try {
      const params = new URLSearchParams({
        page: workersPage.toString(),
        limit: "10",
        verified: workersFilter,
      });

      const response = await fetch(`/api/admin/workers?${params}`);
      if (response.ok) {
        const data = await response.json();
        setWorkers(data.workers);
        setWorkersTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching workers:", error);
    } finally {
      setLoadingCleaners(false);
    }
  }, [workersPage, workersFilter]);

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

  const fetchProfessions = useCallback(async () => {
    setLoadingProfessions(true);
    try {
      const response = await fetch(`/api/admin/professions?status=${professionsFilter}`);
      if (response.ok) {
        const data = await response.json();
        setProfessions(data);
      }
    } catch (error) {
      console.error("Error fetching professions:", error);
    } finally {
      setLoadingProfessions(false);
    }
  }, [professionsFilter]);

  const fetchAvailableCategories = async () => {
    try {
      const response = await fetch("/api/admin/categories?status=APPROVED");
      if (response.ok) {
        const data = await response.json();
        setAvailableCategories(data);
      }
    } catch (error) {
      console.error("Error fetching available categories:", error);
    }
  };

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

  const fetchUserDetails = async (userId: string) => {
    setLoadingUserDetails(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUserDetails(data.user);
        setUserDetailsOpen(true);
      } else {
        toast.error(t("admin.failedFetchUser"));
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
      toast.error(t("admin.failedFetchUser"));
    } finally {
      setLoadingUserDetails(false);
    }
  };

  const fetchAuditLogs = useCallback(async () => {
    setLoadingAuditLogs(true);
    try {
      const params = new URLSearchParams({
        limit: "20",
        offset: (auditLogsPage * 20).toString(),
      });
      if (auditLogsFilter !== "all") params.set("action", auditLogsFilter);
      if (auditLogsSeverity !== "all") params.set("severity", auditLogsSeverity);

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.logs);
        setAuditLogsTotal(data.total);
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoadingAuditLogs(false);
    }
  }, [auditLogsPage, auditLogsFilter, auditLogsSeverity]);

  const fetchEmails = useCallback(async () => {
    setLoadingEmails(true);
    try {
      const params = new URLSearchParams({
        page: emailsPage.toString(),
        limit: "20",
      });

      const response = await fetch(`/api/admin/emails?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEmails(data.emails);
        setEmailsTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching emails:", error);
    } finally {
      setLoadingEmails(false);
    }
  }, [emailsPage]);

  const searchUsersForEmail = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setEmailSearchResults([]);
      return;
    }
    setSearchingUsers(true);
    try {
      const params = new URLSearchParams({
        search: query,
        limit: "10",
      });
      const response = await fetch(`/api/admin/users?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEmailSearchResults(data.users);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setSearchingUsers(false);
    }
  }, []);

  const sendEmail = async () => {
    if (!emailForm.subject || !emailForm.body) {
      toast.error(t("admin.emailSubjectBodyRequired"));
      return;
    }

    if (emailForm.recipientType === "individual" && !emailForm.recipientId) {
      toast.error(t("admin.selectRecipient"));
      return;
    }

    setSendingEmail(true);
    try {
      const response = await fetch("/api/admin/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailForm),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        setEmailForm({
          subject: "",
          body: "",
          recipientType: "individual",
          recipientId: "",
        });
        setEmailUserSearch("");
        setEmailSearchResults([]);
        fetchEmails();
      } else {
        const error = await response.json();
        toast.error(error.error || t("admin.emailSendFailed"));
      }
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error(t("admin.emailSendFailed"));
    } finally {
      setSendingEmail(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users" && authStatus === "authenticated") {
      fetchUsers();
    }
  }, [activeTab, fetchUsers, authStatus]);

  useEffect(() => {
    if (activeTab === "workers" && authStatus === "authenticated") {
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
    if (activeTab === "professions" && authStatus === "authenticated") {
      fetchProfessions();
      fetchAvailableCategories();
    }
  }, [activeTab, fetchProfessions, authStatus]);

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

  useEffect(() => {
    if (activeTab === "auditLogs" && authStatus === "authenticated") {
      fetchAuditLogs();
    }
  }, [activeTab, fetchAuditLogs, authStatus]);

  useEffect(() => {
    if (activeTab === "emails" && authStatus === "authenticated") {
      fetchEmails();
    }
  }, [activeTab, fetchEmails, authStatus]);

  const handleVerifyWorker = async (userId: string, verified: boolean) => {
    setVerifyingId(userId);
    try {
      const response = await fetch(`/api/admin/workers/${userId}/verify`, {
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

  const openCreateCategoryModal = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: "",
      nameDE: "",
      description: "",
      emoji: "📁",
      gradient: "from-blue-400 to-blue-600",
      status: "APPROVED",
    });
    setCategoryModalOpen(true);
  };

  const openEditCategoryModal = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      nameDE: category.nameDE || "",
      description: category.description || "",
      emoji: category.emoji,
      gradient: category.gradient,
      status: category.status as "PENDING" | "APPROVED" | "REJECTED",
    });
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    setSavingCategory(true);
    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : "/api/admin/categories";
      const method = editingCategory ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: categoryForm.name.trim(),
          nameDE: categoryForm.nameDE.trim() || null,
          description: categoryForm.description.trim() || null,
          emoji: categoryForm.emoji,
          gradient: categoryForm.gradient,
          status: categoryForm.status,
        }),
      });

      if (response.ok) {
        toast.success(editingCategory ? "Category updated" : "Category created");
        setCategoryModalOpen(false);
        fetchCategories();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to save category");
      }
    } catch {
      toast.error("Failed to save category");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    setProcessingCategoryId(categoryToDelete.id);
    try {
      const response = await fetch(`/api/admin/categories/${categoryToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Category deleted");
        setDeleteCategoryDialogOpen(false);
        setCategoryToDelete(null);
        fetchCategories();
      } else {
        toast.error("Failed to delete category");
      }
    } catch {
      toast.error("Failed to delete category");
    } finally {
      setProcessingCategoryId(null);
    }
  };

  const handleProfessionAction = async (professionId: string, status: "APPROVED" | "REJECTED") => {
    setProcessingProfessionId(professionId);
    try {
      const response = await fetch(`/api/admin/professions/${professionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast.success(status === "APPROVED" ? t("admin.professionApproved") : t("admin.professionRejected"));
        fetchProfessions();
      } else {
        toast.error(t("admin.failedProfessionAction"));
      }
    } catch {
      toast.error(t("admin.failedProfessionAction"));
    } finally {
      setProcessingProfessionId(null);
    }
  };

  const openCreateProfessionModal = () => {
    setEditingProfession(null);
    setProfessionForm({
      name: "",
      nameDE: "",
      emoji: "👤",
      categoryId: "",
      status: "APPROVED",
    });
    setProfessionModalOpen(true);
  };

  const openEditProfessionModal = (profession: Profession) => {
    setEditingProfession(profession);
    setProfessionForm({
      name: profession.name,
      nameDE: profession.nameDE || "",
      emoji: profession.emoji,
      categoryId: profession.categoryId || "",
      status: profession.status,
    });
    setProfessionModalOpen(true);
  };

  const handleSaveProfession = async () => {
    if (!professionForm.name.trim()) {
      toast.error("Profession name is required");
      return;
    }

    setSavingProfession(true);
    try {
      const url = editingProfession
        ? `/api/admin/professions/${editingProfession.id}`
        : "/api/admin/professions";
      const method = editingProfession ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: professionForm.name.trim(),
          nameDE: professionForm.nameDE.trim() || null,
          emoji: professionForm.emoji,
          categoryId: professionForm.categoryId || null,
          status: professionForm.status,
        }),
      });

      if (response.ok) {
        toast.success(editingProfession ? t("admin.professionUpdated") : t("admin.professionCreated"));
        setProfessionModalOpen(false);
        fetchProfessions();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to save profession");
      }
    } catch {
      toast.error("Failed to save profession");
    } finally {
      setSavingProfession(false);
    }
  };

  const handleDeleteProfession = async () => {
    if (!professionToDelete) return;

    setProcessingProfessionId(professionToDelete.id);
    try {
      const response = await fetch(`/api/admin/professions/${professionToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(t("admin.professionDeleted"));
        setDeleteProfessionDialogOpen(false);
        setProfessionToDelete(null);
        fetchProfessions();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to delete profession");
      }
    } catch {
      toast.error("Failed to delete profession");
    } finally {
      setProcessingProfessionId(null);
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

  const handleSuspendUser = async () => {
    if (!selectedUser) return;
    setProcessingAction(true);
    try {
      // Calculate suspension end date
      let suspendedUntil: string | null = null;
      if (suspendDuration !== "indefinite") {
        const now = new Date();
        const durationMap: Record<string, number> = {
          "1d": 1,
          "3d": 3,
          "7d": 7,
          "14d": 14,
          "30d": 30,
          "90d": 90,
        };
        now.setDate(now.getDate() + (durationMap[suspendDuration] || 7));
        suspendedUntil = now.toISOString();
      }

      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "SUSPENDED",
          suspendedReason: suspendReason || null,
          suspendedUntil,
        }),
      });

      if (response.ok) {
        toast.success(t("admin.userSuspended"));
        setSuspendDialogOpen(false);
        setSuspendReason("");
        setSuspendDuration("7d");
        setSelectedUser(null);
        fetchUsers();
      } else {
        const data = await response.json();
        toast.error(data.error || t("admin.failedUserAction"));
      }
    } catch {
      toast.error(t("admin.failedUserAction"));
    } finally {
      setProcessingAction(false);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;
    setProcessingAction(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "BANNED",
          suspendedReason: banReason || null,
        }),
      });

      if (response.ok) {
        toast.success(t("admin.userBanned"));
        setBanDialogOpen(false);
        setBanReason("");
        setSelectedUser(null);
        fetchUsers();
      } else {
        const data = await response.json();
        toast.error(data.error || t("admin.failedUserAction"));
      }
    } catch {
      toast.error(t("admin.failedUserAction"));
    } finally {
      setProcessingAction(false);
    }
  };

  const handleReactivateUser = async (user: User) => {
    setProcessingAction(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });

      if (response.ok) {
        toast.success(t("admin.userReactivated"));
        fetchUsers();
      } else {
        const data = await response.json();
        toast.error(data.error || t("admin.failedUserAction"));
      }
    } catch {
      toast.error(t("admin.failedUserAction"));
    } finally {
      setProcessingAction(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setProcessingAction(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(t("admin.userDeleted"));
        setDeleteDialogOpen(false);
        setSelectedUser(null);
        fetchUsers();
        fetchStats();
      } else {
        const data = await response.json();
        toast.error(data.error || t("admin.failedUserAction"));
      }
    } catch {
      toast.error(t("admin.failedUserAction"));
    } finally {
      setProcessingAction(false);
    }
  };

  const handleChangeRole = async (user: User, newRole: string) => {
    setProcessingAction(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        toast.success(t("admin.roleChanged"));
        fetchUsers();
      } else {
        const data = await response.json();
        toast.error(data.error || t("admin.failedUserAction"));
      }
    } catch {
      toast.error(t("admin.failedUserAction"));
    } finally {
      setProcessingAction(false);
    }
  };

  // Bulk selection helpers
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === users.filter(u => u.id !== session?.user?.id).length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.filter(u => u.id !== session?.user?.id).map(u => u.id)));
    }
  };

  const clearSelection = () => {
    setSelectedUsers(new Set());
  };

  // Bulk action handlers
  const handleBulkSuspend = async () => {
    if (selectedUsers.size === 0) return;
    setProcessingAction(true);

    let suspendedUntil: string | null = null;
    if (suspendDuration !== "indefinite") {
      const now = new Date();
      const durationMap: Record<string, number> = {
        "1d": 1, "3d": 3, "7d": 7, "14d": 14, "30d": 30, "90d": 90,
      };
      now.setDate(now.getDate() + (durationMap[suspendDuration] || 7));
      suspendedUntil = now.toISOString();
    }

    let successCount = 0;
    let failCount = 0;

    for (const userId of selectedUsers) {
      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "SUSPENDED",
            suspendedReason: suspendReason || null,
            suspendedUntil,
          }),
        });
        if (response.ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} user(s) suspended`);
    }
    if (failCount > 0) {
      toast.error(`Failed to suspend ${failCount} user(s)`);
    }

    setBulkSuspendDialogOpen(false);
    setSuspendReason("");
    setSuspendDuration("7d");
    clearSelection();
    fetchUsers();
    setProcessingAction(false);
  };

  const handleBulkBan = async () => {
    if (selectedUsers.size === 0) return;
    setProcessingAction(true);

    let successCount = 0;
    let failCount = 0;

    for (const userId of selectedUsers) {
      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "BANNED",
            suspendedReason: banReason || null,
          }),
        });
        if (response.ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} user(s) banned`);
    }
    if (failCount > 0) {
      toast.error(`Failed to ban ${failCount} user(s)`);
    }

    setBulkBanDialogOpen(false);
    setBanReason("");
    clearSelection();
    fetchUsers();
    setProcessingAction(false);
  };

  const handleBulkReactivate = async () => {
    if (selectedUsers.size === 0) return;
    setProcessingAction(true);

    let successCount = 0;
    let failCount = 0;

    for (const userId of selectedUsers) {
      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "ACTIVE" }),
        });
        if (response.ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} user(s) reactivated`);
    }
    if (failCount > 0) {
      toast.error(`Failed to reactivate ${failCount} user(s)`);
    }

    clearSelection();
    fetchUsers();
    setProcessingAction(false);
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) return;
    setProcessingAction(true);

    let successCount = 0;
    let failCount = 0;

    for (const userId of selectedUsers) {
      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: "DELETE",
        });
        if (response.ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} user(s) deleted`);
    }
    if (failCount > 0) {
      toast.error(`Failed to delete ${failCount} user(s)`);
    }

    setBulkDeleteDialogOpen(false);
    clearSelection();
    fetchUsers();
    fetchStats();
    setProcessingAction(false);
  };

  const exportAuditLogs = async () => {
    try {
      const params = new URLSearchParams({ limit: "1000", offset: "0" });
      if (auditLogsFilter !== "all") params.set("action", auditLogsFilter);
      if (auditLogsSeverity !== "all") params.set("severity", auditLogsSeverity);

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        const csv = [
          ["Date", "Action", "Actor", "Target", "Details", "Severity", "IP"].join(","),
          ...data.logs.map((log: AuditLog) =>
            [
              new Date(log.createdAt).toISOString(),
              log.action,
              log.actorEmail,
              log.targetId || "",
              JSON.stringify(log.details).replace(/,/g, ";"),
              log.severity,
              log.ip || "",
            ].join(",")
          ),
        ].join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(t("admin.exportSuccess"));
      }
    } catch {
      toast.error(t("admin.exportFailed"));
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "default";
      case "SUSPENDED":
        return "secondary";
      case "BANNED":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-600 bg-red-50";
      case "high":
        return "text-orange-600 bg-orange-50";
      case "medium":
        return "text-yellow-600 bg-yellow-50";
      case "low":
      default:
        return "text-gray-600 bg-gray-50";
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

      <main className="flex-1 bg-gradient-to-b from-purple-50 to-white py-4 sm:py-8">
        <div className="container mx-auto px-2 sm:px-4 max-w-6xl">
          <BackButton />
          <div className="text-center mb-4 sm:mb-8">
            <Shield className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-purple-500 mb-2 sm:mb-4" />
            <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              {t("admin.title")}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">{t("admin.subtitle")}</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="overflow-x-auto pb-2 mb-4 sm:mb-6 -mx-2 px-2">
              <TabsList className="w-max sm:w-full justify-start sm:justify-center flex-nowrap sm:flex-wrap gap-1 min-w-max">
                <TabsTrigger value="overview" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{t("admin.overview")}</span>
                  <span className="sm:hidden">Stats</span>
                </TabsTrigger>
                <TabsTrigger value="users" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{t("admin.users")}</span>
                  <span className="sm:hidden">Users</span>
                </TabsTrigger>
                <TabsTrigger value="bookings" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{t("admin.bookings")}</span>
                  <span className="sm:hidden">Book</span>
                </TabsTrigger>
                <TabsTrigger value="workers" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
                  <UserCheck className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{t("admin.verification")}</span>
                  <span className="sm:hidden">Verify</span>
                </TabsTrigger>
                <TabsTrigger value="documents" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{t("admin.documentsTab")}</span>
                  <span className="sm:hidden">Docs</span>
                </TabsTrigger>
                <TabsTrigger value="disputes" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
                  <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{t("admin.disputesTab")}</span>
                  <span className="sm:hidden">Disp</span>
                  {disputeCounts.open > 0 && (
                    <Badge variant="destructive" className="ml-1 h-4 w-4 sm:h-5 sm:w-5 p-0 justify-center text-xs">
                      {disputeCounts.open}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="reviews" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
                  <Star className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{t("admin.reviews")}</span>
                  <span className="sm:hidden">Rev</span>
                </TabsTrigger>
                <TabsTrigger value="categories" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
                  <FolderPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{t("admin.categories")}</span>
                  <span className="sm:hidden">Cat</span>
                </TabsTrigger>
                <TabsTrigger value="professions" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
                  <Briefcase className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{t("admin.professions")}</span>
                  <span className="sm:hidden">Prof</span>
                </TabsTrigger>
                <TabsTrigger value="auditLogs" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
                  <History className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{t("admin.auditLogs")}</span>
                  <span className="sm:hidden">Logs</span>
                </TabsTrigger>
                <TabsTrigger value="emails" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
                  <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{t("admin.emailsTab")}</span>
                  <span className="sm:hidden">Email</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
                  <UserCog className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{t("admin.settingsTab")}</span>
                  <span className="sm:hidden">Set</span>
                </TabsTrigger>
              </TabsList>
            </div>

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
                              <Badge variant={user.role === "WORKER" ? "default" : "secondary"}>
                                {user.role === "WORKER" ? "WORKER" : user.role}
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
                                  {booking.service ? (SERVICE_NAMES[booking.service.name] || booking.service.name) : "N/A"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {booking.customer?.firstName || "N/A"} → {booking.cleaner?.firstName || "N/A"}
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
                    <CardTitle>{t("admin.userManagement")}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t("admin.searchUsers")}
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
                        <option value="WORKER">Workers</option>
                        <option value="ADMIN">Admins</option>
                      </select>
                      <select
                        value={usersStatusFilter}
                        onChange={(e) => setUsersStatusFilter(e.target.value)}
                        className="border rounded-md px-3 py-2 text-sm"
                      >
                        <option value="all">{t("admin.allStatuses")}</option>
                        <option value="ACTIVE">{t("admin.statusActive")}</option>
                        <option value="SUSPENDED">{t("admin.statusSuspended")}</option>
                        <option value="BANNED">{t("admin.statusBanned")}</option>
                      </select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Bulk Actions Bar */}
                  {selectedUsers.size > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-blue-800">
                          {selectedUsers.size} user(s) selected
                        </span>
                        <Button variant="ghost" size="sm" onClick={clearSelection}>
                          Clear
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleBulkReactivate}
                          disabled={processingAction}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Reactivate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBulkSuspendDialogOpen(true)}
                          disabled={processingAction}
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Suspend
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-orange-600 border-orange-300 hover:bg-orange-50"
                          onClick={() => setBulkBanDialogOpen(true)}
                          disabled={processingAction}
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Ban
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                          onClick={() => setBulkDeleteDialogOpen(true)}
                          disabled={processingAction}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}

                  {loadingUsers ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      {/* Select All Header */}
                      <div className="flex items-center gap-3 p-3 border-b mb-3 bg-gray-50">
                        <Checkbox
                          checked={selectedUsers.size > 0 && selectedUsers.size === users.filter(u => u.id !== session?.user?.id).length}
                          onCheckedChange={toggleSelectAll}
                          className="h-5 w-5 border-2 border-gray-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                        />
                        <span className="text-sm font-medium">
                          Select all ({users.filter(u => u.id !== session?.user?.id).length} selectable users)
                        </span>
                      </div>

                      <div className="space-y-3">
                        {users.map((user) => (
                          <div
                            key={user.id}
                            className={`flex items-center justify-between p-3 border rounded-lg ${selectedUsers.has(user.id) ? 'bg-blue-50 border-blue-300' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Checkbox for selection */}
                              {user.id !== session?.user?.id && (
                                <Checkbox
                                  checked={selectedUsers.has(user.id)}
                                  onCheckedChange={() => toggleUserSelection(user.id)}
                                  className="h-5 w-5 border-2 border-gray-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                />
                              )}
                              {user.id === session?.user?.id && (
                                <div className="w-5" />
                              )}
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
                                {user.status !== "ACTIVE" && user.suspendedUntil && (
                                  <p className="text-xs text-orange-600">
                                    {t("admin.suspendedUntil")}: {new Date(user.suspendedUntil).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {user.role === "WORKER" && user.workerProfile && (
                                <div className="text-right text-sm hidden sm:block">
                                  <div className="flex items-center gap-1">
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    {user.workerProfile.averageRating.toFixed(1)}
                                  </div>
                                  <span className="text-muted-foreground">
                                    {user.workerProfile.totalBookings} {t("admin.bookings")}
                                  </span>
                                </div>
                              )}
                              <Badge variant={getStatusBadgeVariant(user.status)}>
                                {user.status === "ACTIVE" ? t("admin.statusActive") :
                                 user.status === "SUSPENDED" ? t("admin.statusSuspended") :
                                 t("admin.statusBanned")}
                              </Badge>
                              <Badge
                                variant={
                                  user.role === "ADMIN"
                                    ? "destructive"
                                    : user.role === "WORKER"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {user.role === "WORKER" ? "WORKER" : user.role}
                              </Badge>
                              {user.role === "WORKER" && user.workerProfile?.verified && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}

                              {/* Actions Dropdown */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>{t("admin.actions")}</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => fetchUserDetails(user.id)}
                                    disabled={loadingUserDetails}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    {t("admin.viewDetails")}
                                  </DropdownMenuItem>

                                  {/* Change Role Submenu */}
                                  <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                      <UserCog className="h-4 w-4 mr-2" />
                                      {t("admin.changeRole")}
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                      <DropdownMenuItem
                                        onClick={() => handleChangeRole(user, "CUSTOMER")}
                                        disabled={user.role === "CUSTOMER" || processingAction}
                                      >
                                        {t("admin.customers")}
                                        {user.role === "CUSTOMER" && <CheckCircle className="h-4 w-4 ml-2" />}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleChangeRole(user, "WORKER")}
                                        disabled={user.role === "WORKER" || processingAction}
                                      >
                                        {t("admin.workers")}
                                        {user.role === "WORKER" && <CheckCircle className="h-4 w-4 ml-2" />}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleChangeRole(user, "ADMIN")}
                                        disabled={user.role === "ADMIN" || processingAction}
                                      >
                                        {t("admin.admins")}
                                        {user.role === "ADMIN" && <CheckCircle className="h-4 w-4 ml-2" />}
                                      </DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                  </DropdownMenuSub>

                                  <DropdownMenuSeparator />

                                  {user.status === "ACTIVE" ? (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedUser(user);
                                          setSuspendDialogOpen(true);
                                        }}
                                        disabled={user.id === session?.user?.id}
                                      >
                                        <Clock className="h-4 w-4 mr-2" />
                                        {t("admin.suspend")}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedUser(user);
                                          setBanDialogOpen(true);
                                        }}
                                        disabled={user.id === session?.user?.id}
                                        className="text-red-600"
                                      >
                                        <Ban className="h-4 w-4 mr-2" />
                                        {t("admin.ban")}
                                      </DropdownMenuItem>
                                    </>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() => handleReactivateUser(user)}
                                      disabled={processingAction}
                                    >
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                      {t("admin.reactivate")}
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setDeleteDialogOpen(true);
                                    }}
                                    disabled={user.id === session?.user?.id}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t("admin.delete")}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                          {t("admin.page")} {usersPage} {t("admin.of")} {usersTotalPages}
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
            <TabsContent value="workers">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Worker Verification</CardTitle>
                    <select
                      value={workersFilter}
                      onChange={(e) => setWorkersFilter(e.target.value)}
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
                  ) : workers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {workersFilter === "false"
                        ? "No workers pending verification"
                        : "No verified workers"}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        {workers.map((worker) => (
                          <div
                            key={worker.id}
                            className="p-4 border rounded-lg space-y-3"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage src={worker.user.avatar || undefined} />
                                  <AvatarFallback>
                                    {worker.user.firstName[0]}{worker.user.lastName[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {worker.user.firstName} {worker.user.lastName}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {worker.user.email}
                                  </p>
                                  {worker.city && (
                                    <p className="text-sm text-muted-foreground">
                                      {worker.city}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-green-600">
                                  ${worker.hourlyRate}/hr
                                </p>
                                <div className="flex items-center gap-1 text-sm">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  {worker.averageRating.toFixed(1)}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {worker.services.map((s, i) => (
                                <Badge key={i} variant="secondary">
                                  {s.service ? (SERVICE_NAMES[s.service.name] || s.service.name) : "N/A"}
                                </Badge>
                              ))}
                            </div>

                            <div className="flex justify-end gap-2">
                              {worker.verified ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600"
                                  onClick={() => handleVerifyWorker(worker.user.id, false)}
                                  disabled={verifyingId === worker.user.id}
                                >
                                  {verifyingId === worker.user.id ? (
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
                                  onClick={() => handleVerifyWorker(worker.user.id, true)}
                                  disabled={verifyingId === worker.user.id}
                                >
                                  {verifyingId === worker.user.id ? (
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
                          Page {workersPage} of {workersTotalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setWorkersPage((p) => Math.max(1, p - 1))}
                            disabled={workersPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setWorkersPage((p) => Math.min(workersTotalPages, p + 1))}
                            disabled={workersPage === workersTotalPages}
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
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <CardTitle>{t("admin.categoryManagement")}</CardTitle>
                    <div className="flex items-center gap-2">
                      <select
                        value={categoriesFilter}
                        onChange={(e) => setCategoriesFilter(e.target.value)}
                        className="border rounded-md px-3 py-2 text-sm"
                      >
                        <option value="PENDING">{t("admin.pendingCategories")}</option>
                        <option value="APPROVED">{t("admin.approvedCategories")}</option>
                        <option value="REJECTED">{t("admin.rejectedCategories")}</option>
                      </select>
                      <Button onClick={openCreateCategoryModal} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-1" />
                        Create Category
                      </Button>
                    </div>
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
                            <div className="flex items-center gap-2">
                              {category.status === "PENDING" && (
                                <>
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
                                </>
                              )}
                              {category.status !== "PENDING" && (
                                <Badge variant={category.status === "APPROVED" ? "default" : "destructive"}>
                                  {category.status}
                                </Badge>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditCategoryModal(category)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => {
                                  setCategoryToDelete(category);
                                  setDeleteCategoryDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Create/Edit Category Modal */}
              <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCategory ? "Edit Category" : "Create Category"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingCategory
                        ? "Update the category details below."
                        : "Fill in the details to create a new category."}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="cat-name">Name (English) *</Label>
                      <Input
                        id="cat-name"
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                        placeholder="e.g., House Cleaning"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cat-nameDE">Name (German)</Label>
                      <Input
                        id="cat-nameDE"
                        value={categoryForm.nameDE}
                        onChange={(e) => setCategoryForm({ ...categoryForm, nameDE: e.target.value })}
                        placeholder="e.g., Hausreinigung"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cat-description">Description</Label>
                      <Textarea
                        id="cat-description"
                        value={categoryForm.description}
                        onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                        placeholder="Brief description of this category..."
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cat-emoji">Emoji</Label>
                        <Input
                          id="cat-emoji"
                          value={categoryForm.emoji}
                          onChange={(e) => setCategoryForm({ ...categoryForm, emoji: e.target.value })}
                          placeholder="📁"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cat-status">Status</Label>
                        <select
                          id="cat-status"
                          value={categoryForm.status}
                          onChange={(e) => setCategoryForm({ ...categoryForm, status: e.target.value as "PENDING" | "APPROVED" | "REJECTED" })}
                          className="w-full border rounded-md px-3 py-2 text-sm"
                        >
                          <option value="APPROVED">Approved</option>
                          <option value="PENDING">Pending</option>
                          <option value="REJECTED">Rejected</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Gradient Color</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          "from-blue-400 to-blue-600",
                          "from-green-400 to-green-600",
                          "from-purple-400 to-purple-600",
                          "from-orange-400 to-orange-600",
                          "from-pink-400 to-pink-600",
                          "from-teal-400 to-teal-600",
                          "from-red-400 to-red-600",
                          "from-yellow-400 to-yellow-600",
                        ].map((gradient) => (
                          <button
                            key={gradient}
                            type="button"
                            onClick={() => setCategoryForm({ ...categoryForm, gradient })}
                            className={`h-10 rounded-lg bg-gradient-to-br ${gradient} ${
                              categoryForm.gradient === gradient
                                ? "ring-2 ring-offset-2 ring-blue-500"
                                : ""
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 pt-2">
                      <Label>Preview:</Label>
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${categoryForm.gradient} flex items-center justify-center shadow-md`}>
                        <span className="text-2xl">{categoryForm.emoji}</span>
                      </div>
                      <span className="font-semibold">{categoryForm.name || "Category Name"}</span>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCategoryModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveCategory} disabled={savingCategory}>
                      {savingCategory ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {editingCategory ? "Save Changes" : "Create Category"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Delete Category Confirmation */}
              <AlertDialog open={deleteCategoryDialogOpen} onOpenChange={setDeleteCategoryDialogOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Category</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete &quot;{categoryToDelete?.name}&quot;? This action cannot be undone and will also delete all associated professions.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteCategory}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {processingCategoryId === categoryToDelete?.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TabsContent>

            {/* Professions Tab */}
            <TabsContent value="professions">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <CardTitle>{t("admin.professionManagement")}</CardTitle>
                    <div className="flex items-center gap-2">
                      <select
                        value={professionsFilter}
                        onChange={(e) => setProfessionsFilter(e.target.value)}
                        className="border rounded-md px-3 py-2 text-sm"
                      >
                        <option value="PENDING">{t("admin.pendingCategories")}</option>
                        <option value="APPROVED">{t("admin.approvedCategories")}</option>
                        <option value="REJECTED">{t("admin.rejectedCategories")}</option>
                      </select>
                      <Button onClick={openCreateProfessionModal} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-1" />
                        {t("admin.createProfession")}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingProfessions ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : professions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {t("admin.noProfessions")}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {professions.map((profession) => (
                        <div
                          key={profession.id}
                          className="p-4 border rounded-lg"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-md">
                                <span className="text-xl">{profession.emoji}</span>
                              </div>
                              <div>
                                <p className="font-semibold text-lg">{profession.name}</p>
                                {profession.nameDE && (
                                  <p className="text-sm text-muted-foreground">DE: {profession.nameDE}</p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  {profession.category && (
                                    <Badge variant="outline" className="text-xs">
                                      {profession.category.name}
                                    </Badge>
                                  )}
                                  {profession._count && profession._count.workers > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                      {profession._count.workers} {t("admin.workersAssigned")}
                                    </span>
                                  )}
                                </div>
                                {profession.submittedByUser && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {t("admin.suggestedBy")}: {profession.submittedByUser.firstName} {profession.submittedByUser.lastName}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(profession.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {profession.status === "PENDING" && (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-green-500 hover:bg-green-600"
                                    onClick={() => handleProfessionAction(profession.id, "APPROVED")}
                                    disabled={processingProfessionId === profession.id}
                                  >
                                    {processingProfessionId === profession.id ? (
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
                                    onClick={() => handleProfessionAction(profession.id, "REJECTED")}
                                    disabled={processingProfessionId === profession.id}
                                  >
                                    {processingProfessionId === profession.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <XCircle className="h-4 w-4 mr-1" />
                                    )}
                                    {t("admin.reject")}
                                  </Button>
                                </>
                              )}
                              {profession.status !== "PENDING" && (
                                <Badge variant={profession.status === "APPROVED" ? "default" : "destructive"}>
                                  {profession.status}
                                </Badge>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditProfessionModal(profession)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => {
                                  setProfessionToDelete(profession);
                                  setDeleteProfessionDialogOpen(true);
                                }}
                                disabled={profession._count && profession._count.workers > 0}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Create/Edit Profession Modal */}
              <Dialog open={professionModalOpen} onOpenChange={setProfessionModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProfession ? t("admin.editProfession") : t("admin.createProfession")}
                    </DialogTitle>
                    <DialogDescription>
                      {editingProfession
                        ? t("admin.editProfessionDesc")
                        : t("admin.createProfessionDesc")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="prof-name">{t("admin.professionName")} *</Label>
                      <Input
                        id="prof-name"
                        value={professionForm.name}
                        onChange={(e) => setProfessionForm({ ...professionForm, name: e.target.value })}
                        placeholder="e.g., Plumber"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prof-nameDE">{t("admin.professionNameDE")}</Label>
                      <Input
                        id="prof-nameDE"
                        value={professionForm.nameDE}
                        onChange={(e) => setProfessionForm({ ...professionForm, nameDE: e.target.value })}
                        placeholder="e.g., Klempner"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="prof-emoji">{t("admin.professionEmoji")}</Label>
                        <Input
                          id="prof-emoji"
                          value={professionForm.emoji}
                          onChange={(e) => setProfessionForm({ ...professionForm, emoji: e.target.value })}
                          placeholder="👤"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="prof-status">{t("admin.status")}</Label>
                        <select
                          id="prof-status"
                          value={professionForm.status}
                          onChange={(e) => setProfessionForm({ ...professionForm, status: e.target.value as "PENDING" | "APPROVED" | "REJECTED" })}
                          className="w-full border rounded-md px-3 py-2 text-sm"
                        >
                          <option value="APPROVED">{t("admin.approvedCategories")}</option>
                          <option value="PENDING">{t("admin.pendingCategories")}</option>
                          <option value="REJECTED">{t("admin.rejectedCategories")}</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prof-category">{t("admin.assignToCategory")}</Label>
                      <select
                        id="prof-category"
                        value={professionForm.categoryId}
                        onChange={(e) => setProfessionForm({ ...professionForm, categoryId: e.target.value })}
                        className="w-full border rounded-md px-3 py-2 text-sm"
                      >
                        <option value="">{t("admin.noCategory")}</option>
                        {availableCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.emoji} {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-4 pt-2">
                      <Label>{t("admin.preview")}:</Label>
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-md">
                        <span className="text-xl">{professionForm.emoji}</span>
                      </div>
                      <span className="font-semibold">{professionForm.name || "Profession Name"}</span>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setProfessionModalOpen(false)}>
                      {t("common.cancel")}
                    </Button>
                    <Button onClick={handleSaveProfession} disabled={savingProfession}>
                      {savingProfession ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {editingProfession ? t("common.save") : t("admin.createProfession")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Delete Profession Confirmation */}
              <AlertDialog open={deleteProfessionDialogOpen} onOpenChange={setDeleteProfessionDialogOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("admin.deleteProfession")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("admin.deleteProfessionDesc", { name: professionToDelete?.name || "" })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteProfession}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {processingProfessionId === professionToDelete?.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {t("common.delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
                                    <AvatarImage src={booking.cleaner?.avatar || undefined} />
                                    <AvatarFallback className="text-xs">
                                      {booking.cleaner?.firstName?.[0] || "?"}{booking.cleaner?.lastName?.[0] || "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                                <div>
                                  <p className="font-medium">
                                    {booking.service ? (SERVICE_NAMES[booking.service.name] || booking.service.name) : "N/A"}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {booking.customer?.firstName || "N/A"} → {booking.cleaner?.firstName || "N/A"}
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

            {/* Audit Logs Tab */}
            <TabsContent value="auditLogs">
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle>{t("admin.auditLogsTitle")}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={auditLogsFilter}
                        onChange={(e) => {
                          setAuditLogsFilter(e.target.value);
                          setAuditLogsPage(0);
                        }}
                        className="border rounded-md px-3 py-2 text-sm"
                      >
                        <option value="all">{t("admin.allActions")}</option>
                        <option value="USER_SUSPENDED">{t("admin.actionSuspend")}</option>
                        <option value="USER_BANNED">{t("admin.actionBan")}</option>
                        <option value="USER_REACTIVATED">{t("admin.actionReactivate")}</option>
                        <option value="USER_DELETED">{t("admin.actionDelete")}</option>
                        <option value="USER_ROLE_CHANGED">{t("admin.actionRoleChange")}</option>
                        <option value="CLEANER_VERIFIED">{t("admin.actionVerify")}</option>
                        <option value="DOCUMENT_VERIFIED">{t("admin.actionDocVerify")}</option>
                      </select>
                      <select
                        value={auditLogsSeverity}
                        onChange={(e) => {
                          setAuditLogsSeverity(e.target.value);
                          setAuditLogsPage(0);
                        }}
                        className="border rounded-md px-3 py-2 text-sm"
                      >
                        <option value="all">{t("admin.allSeverities")}</option>
                        <option value="low">{t("admin.severityLow")}</option>
                        <option value="medium">{t("admin.severityMedium")}</option>
                        <option value="high">{t("admin.severityHigh")}</option>
                        <option value="critical">{t("admin.severityCritical")}</option>
                      </select>
                      <Button variant="outline" size="sm" onClick={exportAuditLogs}>
                        <Download className="h-4 w-4 mr-2" />
                        {t("admin.exportCsv")}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingAuditLogs ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {t("admin.noAuditLogs")}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {auditLogs.map((log) => (
                          <div
                            key={log.id}
                            className="p-4 border rounded-lg"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline">{log.action.replace(/_/g, " ")}</Badge>
                                  <Badge className={getSeverityColor(log.severity)}>
                                    {log.severity.toUpperCase()}
                                  </Badge>
                                </div>
                                <p className="text-sm">
                                  <span className="font-medium">{log.actorEmail}</span>
                                  {log.targetId && (
                                    <span className="text-muted-foreground">
                                      {" → "}{log.targetType}: {log.targetId.slice(0, 8)}...
                                    </span>
                                  )}
                                </p>
                                {log.details && Object.keys(log.details).length > 0 && (
                                  <p className="text-xs text-muted-foreground mt-1 bg-gray-50 p-2 rounded">
                                    {JSON.stringify(log.details, null, 2)}
                                  </p>
                                )}
                              </div>
                              <div className="text-right text-sm text-muted-foreground">
                                <p>{new Date(log.createdAt).toLocaleDateString()}</p>
                                <p>{new Date(log.createdAt).toLocaleTimeString()}</p>
                                {log.ip && <p className="text-xs">{log.ip}</p>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                          {t("admin.showing")} {auditLogsPage * 20 + 1}-{Math.min((auditLogsPage + 1) * 20, auditLogsTotal)} {t("admin.of")} {auditLogsTotal}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAuditLogsPage((p) => Math.max(0, p - 1))}
                            disabled={auditLogsPage === 0}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAuditLogsPage((p) => p + 1)}
                            disabled={(auditLogsPage + 1) * 20 >= auditLogsTotal}
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

            {/* Emails Tab */}
            <TabsContent value="emails">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Compose Email */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Send className="h-5 w-5" />
                      {t("admin.composeEmail")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Recipient Type */}
                      <div>
                        <Label>{t("admin.recipientType")}</Label>
                        <Select
                          value={emailForm.recipientType}
                          onValueChange={(value: "individual" | "all" | "workers" | "customers") =>
                            setEmailForm({ ...emailForm, recipientType: value, recipientId: "" })
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="individual">{t("admin.individualUser")}</SelectItem>
                            <SelectItem value="all">{t("admin.allUsers")}</SelectItem>
                            <SelectItem value="workers">{t("admin.allWorkers")}</SelectItem>
                            <SelectItem value="customers">{t("admin.allCustomers")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Individual User Search */}
                      {emailForm.recipientType === "individual" && (
                        <div>
                          <Label>{t("admin.searchUser")}</Label>
                          <div className="relative mt-1">
                            <Input
                              placeholder={t("admin.searchUserPlaceholder")}
                              value={emailUserSearch}
                              onChange={(e) => {
                                setEmailUserSearch(e.target.value);
                                searchUsersForEmail(e.target.value);
                              }}
                            />
                            {searchingUsers && (
                              <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                          </div>
                          {emailSearchResults.length > 0 && (
                            <div className="mt-2 border rounded-md max-h-40 overflow-y-auto">
                              {emailSearchResults.map((user) => (
                                <div
                                  key={user.id}
                                  className={`p-2 cursor-pointer hover:bg-gray-50 flex items-center gap-2 ${
                                    emailForm.recipientId === user.id ? "bg-blue-50" : ""
                                  }`}
                                  onClick={() => {
                                    setEmailForm({ ...emailForm, recipientId: user.id });
                                    setEmailUserSearch(`${user.firstName} ${user.lastName} (${user.email})`);
                                    setEmailSearchResults([]);
                                  }}
                                >
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={user.avatar || undefined} />
                                    <AvatarFallback className="text-xs">
                                      {user.firstName[0]}{user.lastName[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {user.firstName} {user.lastName}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {user.role}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                          {emailForm.recipientId && (
                            <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              {t("admin.recipientSelected")}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Subject */}
                      <div>
                        <Label>{t("admin.emailSubject")}</Label>
                        <Input
                          className="mt-1"
                          placeholder={t("admin.emailSubjectPlaceholder")}
                          value={emailForm.subject}
                          onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                          maxLength={200}
                        />
                      </div>

                      {/* Body */}
                      <div>
                        <Label>{t("admin.emailBody")}</Label>
                        <Textarea
                          className="mt-1 min-h-[150px]"
                          placeholder={t("admin.emailBodyPlaceholder")}
                          value={emailForm.body}
                          onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                          maxLength={10000}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {emailForm.body.length}/10000
                        </p>
                      </div>

                      {/* Warning for bulk */}
                      {emailForm.recipientType !== "individual" && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                          <p className="text-sm text-yellow-800">
                            {t("admin.bulkEmailWarning")}
                          </p>
                        </div>
                      )}

                      {/* Send Button */}
                      <Button
                        className="w-full"
                        onClick={sendEmail}
                        disabled={sendingEmail || !emailForm.subject || !emailForm.body || (emailForm.recipientType === "individual" && !emailForm.recipientId)}
                      >
                        {sendingEmail ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t("admin.sending")}
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            {t("admin.sendEmail")}
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Email History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      {t("admin.emailHistory")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingEmails ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : emails.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {t("admin.noEmailHistory")}
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                          {emails.map((email) => (
                            <div
                              key={email.id}
                              className="p-3 border rounded-lg"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant={email.sent ? "default" : "destructive"}>
                                      {email.sent ? t("admin.sent") : t("admin.failed")}
                                    </Badge>
                                    <Badge variant="outline">
                                      {email.type === "ADMIN_EMAIL" ? t("admin.individual") : t("admin.announcement")}
                                    </Badge>
                                  </div>
                                  <p className="font-medium text-sm truncate">{email.title}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {t("admin.to")}: {email.user.firstName} {email.user.lastName} ({email.user.email})
                                  </p>
                                  {email.data.sentByName && (
                                    <p className="text-xs text-muted-foreground">
                                      {t("admin.sentBy")}: {email.data.sentByName}
                                    </p>
                                  )}
                                  {email.error && (
                                    <p className="text-xs text-red-500 mt-1">{email.error}</p>
                                  )}
                                </div>
                                <div className="text-right text-xs text-muted-foreground">
                                  <p>{email.sentAt ? new Date(email.sentAt).toLocaleDateString() : "-"}</p>
                                  <p>{email.sentAt ? new Date(email.sentAt).toLocaleTimeString() : "-"}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between mt-4">
                          <p className="text-sm text-muted-foreground">
                            {t("admin.page")} {emailsPage} / {emailsTotalPages}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEmailsPage((p) => Math.max(1, p - 1))}
                              disabled={emailsPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEmailsPage((p) => p + 1)}
                              disabled={emailsPage >= emailsTotalPages}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>{t("admin.systemSettings")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Platform Fees */}
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-3">{t("admin.platformFees")}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <span className="text-sm">{t("admin.customerFee")}</span>
                          <span className="font-medium">€2.00 + 5%</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <span className="text-sm">{t("admin.workerFee")}</span>
                          <span className="font-medium">€1.00 + 15%</span>
                        </div>
                      </div>
                    </div>

                    {/* Booking Settings */}
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-3">{t("admin.bookingSettings")}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <span className="text-sm">{t("admin.minBookingValue")}</span>
                          <span className="font-medium">€25.00</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <span className="text-sm">{t("admin.defaultCurrency")}</span>
                          <span className="font-medium">EUR</span>
                        </div>
                      </div>
                    </div>

                    {/* Cancellation Policy */}
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-3">{t("admin.cancellationPolicy")}</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <span className="text-sm">{t("admin.freeCancel24h")}</span>
                          <Badge variant="default">100%</Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <span className="text-sm">{t("admin.cancel12to24h")}</span>
                          <Badge variant="secondary">50%</Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <span className="text-sm">{t("admin.cancelUnder12h")}</span>
                          <Badge variant="destructive">0%</Badge>
                        </div>
                      </div>
                    </div>

                    {/* System Status */}
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-3">{t("admin.systemStatus")}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <span className="text-sm">{t("admin.maintenanceMode")}</span>
                          <Badge variant="default" className="bg-green-500">{t("admin.off")}</Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <span className="text-sm">{t("admin.newRegistrations")}</span>
                          <Badge variant="default" className="bg-green-500">{t("admin.enabled")}</Badge>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground text-center">
                      {t("admin.settingsReadOnly")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* User Details Modal */}
      <Dialog open={userDetailsOpen} onOpenChange={setUserDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("admin.userDetails")}</DialogTitle>
            <DialogDescription>
              {t("admin.userDetailsDesc")}
            </DialogDescription>
          </DialogHeader>
          {userDetails && (
            <div className="flex-1 overflow-hidden">
              {/* User Header */}
              <div className="flex items-center gap-4 mb-4 pb-4 border-b">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={userDetails.avatar || undefined} />
                  <AvatarFallback className="text-lg">
                    {userDetails.firstName[0]}{userDetails.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold">
                      {userDetails.firstName} {userDetails.lastName}
                    </h3>
                    <Badge variant={getStatusBadgeVariant(userDetails.status)}>
                      {userDetails.status}
                    </Badge>
                    <Badge variant={userDetails.role === "ADMIN" ? "destructive" : "default"}>
                      {userDetails.role}
                    </Badge>
                    {userDetails.role === "WORKER" && userDetails.workerProfile?.verified && (
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{userDetails.email}</p>
                  {userDetails.phone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {userDetails.phone}
                    </p>
                  )}
                </div>
                <div className="text-right text-sm">
                  <p className="text-muted-foreground">ID: <span className="font-mono text-xs">{userDetails.id}</span></p>
                  <p className="text-muted-foreground">Joined: {new Date(userDetails.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Tabbed Content */}
              <Tabs defaultValue="overview" className="flex-1">
                <TabsList className="mb-4 flex-wrap h-auto">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  {userDetails.role === "WORKER" && <TabsTrigger value="worker">Worker Profile</TabsTrigger>}
                  <TabsTrigger value="sessions">Sessions & Devices</TabsTrigger>
                  <TabsTrigger value="security">Security</TabsTrigger>
                </TabsList>

                <div className="overflow-y-auto max-h-[50vh] pr-2">
                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-4 mt-0">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 border rounded-lg text-center">
                        <Calendar className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                        <p className="text-2xl font-bold">{userDetails._count.bookingsAsCustomer + userDetails._count.bookingsAsCleaner}</p>
                        <p className="text-xs text-muted-foreground">Total Bookings</p>
                      </div>
                      <div className="p-3 border rounded-lg text-center">
                        <Star className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
                        <p className="text-2xl font-bold">{userDetails._count.reviewsReceived}</p>
                        <p className="text-xs text-muted-foreground">Reviews Received</p>
                      </div>
                      <div className="p-3 border rounded-lg text-center">
                        <MessageSquare className="h-5 w-5 mx-auto text-green-500 mb-1" />
                        <p className="text-2xl font-bold">{userDetails._count.messagesSent + userDetails._count.messagesReceived}</p>
                        <p className="text-xs text-muted-foreground">Messages</p>
                      </div>
                      <div className="p-3 border rounded-lg text-center">
                        <Building2 className="h-5 w-5 mx-auto text-purple-500 mb-1" />
                        <p className="text-2xl font-bold">{userDetails._count.properties}</p>
                        <p className="text-xs text-muted-foreground">Properties</p>
                      </div>
                    </div>

                    {/* Contact & Location */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Mail className="h-4 w-4" /> Contact Info
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p><span className="text-muted-foreground">Email:</span> {userDetails.email}</p>
                          <p><span className="text-muted-foreground">Verified:</span> {userDetails.emailVerified ? new Date(userDetails.emailVerified).toLocaleDateString() : "No"}</p>
                          {userDetails.phone && (
                            <>
                              <p><span className="text-muted-foreground">Phone:</span> {userDetails.phone}</p>
                              <p><span className="text-muted-foreground">Verified:</span> {userDetails.phoneVerified ? new Date(userDetails.phoneVerified).toLocaleDateString() : "No"}</p>
                            </>
                          )}
                          <p><span className="text-muted-foreground">Language:</span> {userDetails.preferredLanguage.toUpperCase()}</p>
                        </div>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <MapPin className="h-4 w-4" /> Location
                        </h4>
                        <div className="space-y-1 text-sm">
                          {userDetails.locationCity || userDetails.locationCountry ? (
                            <>
                              <p><span className="text-muted-foreground">City:</span> {userDetails.locationCity || "N/A"}</p>
                              <p><span className="text-muted-foreground">Country:</span> {userDetails.locationCountry || "N/A"}</p>
                              {userDetails.latitude && userDetails.longitude && (
                                <p><span className="text-muted-foreground">Coords:</span> {userDetails.latitude.toFixed(4)}, {userDetails.longitude.toFixed(4)}</p>
                              )}
                              <p><span className="text-muted-foreground">Verified:</span> {userDetails.locationVerifiedAt ? new Date(userDetails.locationVerifiedAt).toLocaleDateString() : "No"}</p>
                            </>
                          ) : (
                            <p className="text-muted-foreground">No location data</p>
                          )}
                          {userDetails.lastKnownIp && (
                            <p><span className="text-muted-foreground">Last IP:</span> <span className="font-mono text-xs">{userDetails.lastKnownIp}</span></p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Properties */}
                    {userDetails.properties.length > 0 && (
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Building2 className="h-4 w-4" /> Properties
                        </h4>
                        <div className="space-y-2">
                          {userDetails.properties.map((property) => (
                            <div key={property.id} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                              <div>
                                <span className="font-medium">{property.name}</span>
                                {property.isDefault && <Badge className="ml-2 text-xs">Default</Badge>}
                                <p className="text-xs text-muted-foreground">{property.address}{property.city ? `, ${property.city}` : ""}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Status Info */}
                    {userDetails.status !== "ACTIVE" && (
                      <div className="p-3 border border-orange-200 bg-orange-50 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2 text-orange-800">
                          <AlertTriangle className="h-4 w-4" /> Account {userDetails.status}
                        </h4>
                        <div className="space-y-1 text-sm text-orange-700">
                          {userDetails.suspendedReason && (
                            <p><span className="font-medium">Reason:</span> {userDetails.suspendedReason}</p>
                          )}
                          {userDetails.suspendedUntil && (
                            <p><span className="font-medium">Until:</span> {new Date(userDetails.suspendedUntil).toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Activity Tab */}
                  <TabsContent value="activity" className="space-y-4 mt-0">
                    {/* Recent Bookings */}
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> Recent Bookings
                      </h4>
                      {(userDetails.bookingsAsCustomer.length > 0 || userDetails.bookingsAsCleaner.length > 0) ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {[...userDetails.bookingsAsCustomer.map(b => ({...b, type: "customer" as const})),
                            ...userDetails.bookingsAsCleaner.map(b => ({...b, type: "worker" as const}))]
                            .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())
                            .slice(0, 10)
                            .map((booking) => (
                              <div key={booking.id} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                                <div>
                                  <span className="font-medium">{booking.service ? (SERVICE_NAMES[booking.service.name] || booking.service.name) : "N/A"}</span>
                                  <Badge className="ml-2 text-xs" variant="outline">{booking.type}</Badge>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(booking.scheduledDate).toLocaleDateString()} -
                                    {booking.type === "customer"
                                      ? ` with ${(booking as typeof userDetails.bookingsAsCustomer[0]).cleaner.firstName}`
                                      : ` for ${(booking as typeof userDetails.bookingsAsCleaner[0]).customer.firstName}`}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <Badge variant={booking.status === "COMPLETED" ? "default" : booking.status === "CANCELLED" ? "destructive" : "secondary"}>
                                    {booking.status}
                                  </Badge>
                                  <p className="text-sm font-medium">${booking.totalPrice}</p>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No bookings yet</p>
                      )}
                    </div>

                    {/* Reviews */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Star className="h-4 w-4" /> Reviews Received ({userDetails._count.reviewsReceived})
                        </h4>
                        {userDetails.reviewsReceived.length > 0 ? (
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {userDetails.reviewsReceived.map((review) => (
                              <div key={review.id} className="text-sm p-2 bg-gray-50 rounded">
                                <div className="flex items-center gap-2">
                                  <div className="flex">
                                    {[...Array(5)].map((_, i) => (
                                      <Star key={i} className={`h-3 w-3 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                                    ))}
                                  </div>
                                  <span className="text-muted-foreground text-xs">by {review.reviewer.firstName}</span>
                                </div>
                                {review.comment && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{review.comment}</p>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No reviews received</p>
                        )}
                      </div>
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Star className="h-4 w-4" /> Reviews Given ({userDetails._count.reviewsGiven})
                        </h4>
                        {userDetails.reviewsGiven.length > 0 ? (
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {userDetails.reviewsGiven.map((review) => (
                              <div key={review.id} className="text-sm p-2 bg-gray-50 rounded">
                                <div className="flex items-center gap-2">
                                  <div className="flex">
                                    {[...Array(5)].map((_, i) => (
                                      <Star key={i} className={`h-3 w-3 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                                    ))}
                                  </div>
                                  <span className="text-muted-foreground text-xs">to {review.reviewee.firstName}</span>
                                </div>
                                {review.comment && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{review.comment}</p>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No reviews given</p>
                        )}
                      </div>
                    </div>

                    {/* Disputes */}
                    {(userDetails.disputesAsCustomer.length > 0 || userDetails.disputesAsCleaner.length > 0) && (
                      <div className="p-3 border border-red-200 bg-red-50 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2 text-red-800">
                          <AlertTriangle className="h-4 w-4" /> Disputes
                        </h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {[...userDetails.disputesAsCustomer.map(d => ({...d, role: "customer"})),
                            ...userDetails.disputesAsCleaner.map(d => ({...d, role: "worker"}))]
                            .map((dispute) => (
                              <div key={dispute.id} className="flex justify-between text-sm p-2 bg-white rounded">
                                <div>
                                  <span className="font-medium">{dispute.subject}</span>
                                  <Badge className="ml-2 text-xs" variant="outline">{dispute.role}</Badge>
                                </div>
                                <Badge variant={dispute.status === "RESOLVED" ? "default" : "secondary"}>
                                  {dispute.status}
                                </Badge>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Worker Profile Tab */}
                  {userDetails.role === "WORKER" && userDetails.workerProfile && (
                    <TabsContent value="worker" className="space-y-4 mt-0">
                      {/* Worker Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 border rounded-lg text-center">
                          <Star className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
                          <p className="text-2xl font-bold">{userDetails.workerProfile.averageRating.toFixed(1)}</p>
                          <p className="text-xs text-muted-foreground">Rating</p>
                        </div>
                        <div className="p-3 border rounded-lg text-center">
                          <Calendar className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                          <p className="text-2xl font-bold">{userDetails.workerProfile.totalBookings}</p>
                          <p className="text-xs text-muted-foreground">Jobs Done</p>
                        </div>
                        <div className="p-3 border rounded-lg text-center">
                          <DollarSign className="h-5 w-5 mx-auto text-green-500 mb-1" />
                          <p className="text-2xl font-bold">{userDetails.workerProfile.currency} {userDetails.workerProfile.hourlyRate}</p>
                          <p className="text-xs text-muted-foreground">Hourly Rate</p>
                        </div>
                        <div className="p-3 border rounded-lg text-center">
                          <Heart className="h-5 w-5 mx-auto text-red-500 mb-1" />
                          <p className="text-2xl font-bold">{userDetails._count.favoritedBy}</p>
                          <p className="text-xs text-muted-foreground">Favorites</p>
                        </div>
                      </div>

                      {/* Profile Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 border rounded-lg">
                          <h4 className="font-medium mb-2">Profile Details</h4>
                          <div className="space-y-1 text-sm">
                            <p><span className="text-muted-foreground">Experience:</span> {userDetails.workerProfile.experienceYears} years</p>
                            <p><span className="text-muted-foreground">Timezone:</span> {userDetails.workerProfile.timezone}</p>
                            <p><span className="text-muted-foreground">Service Radius:</span> {userDetails.workerProfile.serviceRadius} km</p>
                            {userDetails.workerProfile.responseTime && (
                              <p><span className="text-muted-foreground">Response Time:</span> {userDetails.workerProfile.responseTime} min</p>
                            )}
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {userDetails.workerProfile.verified && <Badge className="bg-green-100 text-green-700">Verified</Badge>}
                              {userDetails.workerProfile.isActive && <Badge className="bg-blue-100 text-blue-700">Active</Badge>}
                              {userDetails.workerProfile.availableNow && <Badge className="bg-purple-100 text-purple-700">Available Now</Badge>}
                              {userDetails.workerProfile.ecoFriendly && <Badge className="bg-green-100 text-green-700">Eco-Friendly</Badge>}
                              {userDetails.workerProfile.petFriendly && <Badge className="bg-orange-100 text-orange-700">Pet-Friendly</Badge>}
                            </div>
                          </div>
                        </div>
                        <div className="p-3 border rounded-lg">
                          <h4 className="font-medium mb-2">Service Area</h4>
                          <div className="space-y-1 text-sm">
                            {userDetails.workerProfile.address && <p>{userDetails.workerProfile.address}</p>}
                            <p>
                              {[userDetails.workerProfile.city, userDetails.workerProfile.state, userDetails.workerProfile.country]
                                .filter(Boolean).join(", ") || "Not specified"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Services */}
                      {userDetails.workerProfile.services.length > 0 && (
                        <div className="p-3 border rounded-lg">
                          <h4 className="font-medium mb-2">Services Offered</h4>
                          <div className="flex flex-wrap gap-2">
                            {userDetails.workerProfile.services.map((s) => (
                              <Badge key={s.service.id} variant="secondary">
                                {SERVICE_NAMES[s.service.name] || s.service.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Bio */}
                      {userDetails.workerProfile.bio && (
                        <div className="p-3 border rounded-lg">
                          <h4 className="font-medium mb-2">Bio</h4>
                          <p className="text-sm text-muted-foreground">{userDetails.workerProfile.bio}</p>
                        </div>
                      )}

                      {/* Payment Info */}
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Wallet className="h-4 w-4" /> Payment Information
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p><span className="text-muted-foreground">PayPal:</span> {userDetails.workerProfile.paypalEmail || "Not set"}</p>
                          <p><span className="text-muted-foreground">IBAN:</span> {userDetails.workerProfile.iban ? `****${userDetails.workerProfile.iban.slice(-4)}` : "Not set"}</p>
                          <p><span className="text-muted-foreground">Stripe Connected:</span> {userDetails.workerProfile.stripeOnboardingComplete ? "Yes" : "No"}</p>
                          {userDetails.workerProfile.cryptoWallets.length > 0 && (
                            <div className="mt-2">
                              <p className="text-muted-foreground mb-1">Crypto Wallets:</p>
                              {userDetails.workerProfile.cryptoWallets.map((wallet) => (
                                <p key={wallet.id} className="font-mono text-xs">
                                  <Badge variant="outline" className="mr-2">{wallet.currency}</Badge>
                                  {wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Documents */}
                      {userDetails.cleanerDocuments.length > 0 && (
                        <div className="p-3 border rounded-lg">
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Documents
                          </h4>
                          <div className="space-y-2">
                            {userDetails.cleanerDocuments.map((doc) => (
                              <div key={doc.id} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                                <span>{doc.type}</span>
                                <Badge variant={doc.status === "VERIFIED" ? "default" : doc.status === "REJECTED" ? "destructive" : "secondary"}>
                                  {doc.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  )}

                  {/* Sessions & Devices Tab */}
                  <TabsContent value="sessions" className="space-y-4 mt-0">
                    {/* Active Sessions */}
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Wifi className="h-4 w-4" /> Active Sessions
                      </h4>
                      {userDetails.userSessions.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {userDetails.userSessions.map((session) => (
                            <div key={session.id} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Globe className="h-4 w-4 text-muted-foreground" />
                                  <span>{session.city || "Unknown"}, {session.country || "Unknown"}</span>
                                  {session.isValid ? (
                                    <Badge className="bg-green-100 text-green-700 text-xs">Active</Badge>
                                  ) : (
                                    <Badge className="bg-red-100 text-red-700 text-xs">Revoked</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  IP: <span className="font-mono">{session.ip || "Unknown"}</span>
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {session.userAgent || "Unknown browser"}
                                </p>
                              </div>
                              <div className="text-right text-xs text-muted-foreground">
                                <p>Last active: {new Date(session.lastActiveAt).toLocaleString()}</p>
                                <p>Created: {new Date(session.createdAt).toLocaleString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No session data</p>
                      )}
                    </div>

                    {/* Known Devices */}
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Smartphone className="h-4 w-4" /> Known Devices
                      </h4>
                      {userDetails.userDevices.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {userDetails.userDevices.map((device) => (
                            <div key={device.id} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                              <div className="flex items-center gap-2">
                                {device.deviceType === "mobile" ? <Smartphone className="h-4 w-4" /> :
                                 device.deviceType === "tablet" ? <Tablet className="h-4 w-4" /> :
                                 <Monitor className="h-4 w-4" />}
                                <div>
                                  <p className="font-medium">{device.name || `${device.browser} on ${device.os}`}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {device.lastCountry || "Unknown"} - <span className="font-mono">{device.lastIp || "Unknown IP"}</span>
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                {device.isTrusted && <Badge className="bg-green-100 text-green-700 text-xs">Trusted</Badge>}
                                <p className="text-xs text-muted-foreground">Last seen: {new Date(device.lastSeenAt).toLocaleString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No device data</p>
                      )}
                    </div>
                  </TabsContent>

                  {/* Security Tab */}
                  <TabsContent value="security" className="space-y-4 mt-0">
                    {/* Account Status */}
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Shield className="h-4 w-4" /> Account Security
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-gray-50 rounded">
                          <span>Account Status</span>
                          <Badge variant={getStatusBadgeVariant(userDetails.status)}>{userDetails.status}</Badge>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-50 rounded">
                          <span>Email Verified</span>
                          <Badge variant={userDetails.emailVerified ? "default" : "secondary"}>
                            {userDetails.emailVerified ? "Yes" : "No"}
                          </Badge>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-50 rounded">
                          <span>Phone Verified</span>
                          <Badge variant={userDetails.phoneVerified ? "default" : "secondary"}>
                            {userDetails.phoneVerified ? "Yes" : "No"}
                          </Badge>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-50 rounded">
                          <span>Location Verified</span>
                          <Badge variant={userDetails.locationVerifiedAt ? "default" : "secondary"}>
                            {userDetails.locationVerifiedAt ? "Yes" : "No"}
                          </Badge>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-50 rounded">
                          <span>Active Sessions</span>
                          <span className="font-medium">{userDetails.userSessions.filter(s => s.isValid).length}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-50 rounded">
                          <span>Known Devices</span>
                          <span className="font-medium">{userDetails.userDevices.length}</span>
                        </div>
                      </div>
                    </div>

                    {/* Timestamps */}
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4" /> Account Timeline
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-gray-50 rounded">
                          <span>Account Created</span>
                          <span>{new Date(userDetails.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-50 rounded">
                          <span>Last Updated</span>
                          <span>{new Date(userDetails.updatedAt).toLocaleString()}</span>
                        </div>
                        {userDetails.emailVerified && (
                          <div className="flex justify-between p-2 bg-gray-50 rounded">
                            <span>Email Verified</span>
                            <span>{new Date(userDetails.emailVerified).toLocaleString()}</span>
                          </div>
                        )}
                        {userDetails.locationVerifiedAt && (
                          <div className="flex justify-between p-2 bg-gray-50 rounded">
                            <span>Location Verified</span>
                            <span>{new Date(userDetails.locationVerifiedAt).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setUserDetailsOpen(false)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend User Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.suspendUser")}</DialogTitle>
            <DialogDescription>
              {t("admin.suspendUserDesc", { name: `${selectedUser?.firstName} ${selectedUser?.lastName}` })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("admin.suspendDuration")}</Label>
              <Select value={suspendDuration} onValueChange={setSuspendDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">1 {t("admin.day")}</SelectItem>
                  <SelectItem value="3d">3 {t("admin.days")}</SelectItem>
                  <SelectItem value="7d">7 {t("admin.days")}</SelectItem>
                  <SelectItem value="14d">14 {t("admin.days")}</SelectItem>
                  <SelectItem value="30d">30 {t("admin.days")}</SelectItem>
                  <SelectItem value="90d">90 {t("admin.days")}</SelectItem>
                  <SelectItem value="indefinite">{t("admin.indefinite")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("admin.reason")} ({t("admin.optional")})</Label>
              <Textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder={t("admin.reasonPlaceholder")}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspendUser}
              disabled={processingAction}
            >
              {processingAction && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("admin.suspend")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban User Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.banUser")}</DialogTitle>
            <DialogDescription>
              {t("admin.banUserDesc", { name: `${selectedUser?.firstName} ${selectedUser?.lastName}` })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {t("admin.banWarning")}
            </div>
            <div className="space-y-2">
              <Label>{t("admin.reason")} ({t("admin.optional")})</Label>
              <Textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder={t("admin.reasonPlaceholder")}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleBanUser}
              disabled={processingAction}
            >
              {processingAction && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("admin.ban")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.deleteUser")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.deleteUserDesc", { name: `${selectedUser?.firstName} ${selectedUser?.lastName}` })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {t("admin.deleteWarning")}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700"
            >
              {processingAction && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("admin.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Suspend Dialog */}
      <Dialog open={bulkSuspendDialogOpen} onOpenChange={setBulkSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend {selectedUsers.size} User(s)</DialogTitle>
            <DialogDescription>
              This will suspend all selected users. They will not be able to access the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("admin.suspendDuration")}</Label>
              <Select value={suspendDuration} onValueChange={setSuspendDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">1 {t("admin.day")}</SelectItem>
                  <SelectItem value="3d">3 {t("admin.days")}</SelectItem>
                  <SelectItem value="7d">7 {t("admin.days")}</SelectItem>
                  <SelectItem value="14d">14 {t("admin.days")}</SelectItem>
                  <SelectItem value="30d">30 {t("admin.days")}</SelectItem>
                  <SelectItem value="90d">90 {t("admin.days")}</SelectItem>
                  <SelectItem value="indefinite">{t("admin.indefinite")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("admin.reason")} ({t("admin.optional")})</Label>
              <Textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder={t("admin.reasonPlaceholder")}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkSuspendDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkSuspend}
              disabled={processingAction}
            >
              {processingAction && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Suspend {selectedUsers.size} User(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Ban Dialog */}
      <Dialog open={bulkBanDialogOpen} onOpenChange={setBulkBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban {selectedUsers.size} User(s)</DialogTitle>
            <DialogDescription>
              This will permanently ban all selected users from the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {t("admin.banWarning")}
            </div>
            <div className="space-y-2">
              <Label>{t("admin.reason")} ({t("admin.optional")})</Label>
              <Textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder={t("admin.reasonPlaceholder")}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkBanDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkBan}
              disabled={processingAction}
            >
              {processingAction && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ban {selectedUsers.size} User(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedUsers.size} User(s)</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all selected users and their data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {t("admin.deleteWarning")}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {processingAction && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete {selectedUsers.size} User(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
