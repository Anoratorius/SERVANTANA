"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Clock,
  MapPin,
  MessageCircle,
  Star,
  CheckCircle,
  XCircle,
  Play,
  Loader2,
  CreditCard,
  RotateCcw,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";

interface Booking {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
  address: string;
  city: string | null;
  totalPrice: number;
  status: string;
  duration: number;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
  cleaner: {
    id: string;
    firstName: string;
    lastName: string;
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
  payment?: {
    id: string;
    status: string;
  } | null;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function BookingsPage() {
  const t = useTranslations();
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");

  // Offline storage for bookings
  const {
    data: cachedBookings,
    isOffline,
    isFromCache,
    lastSynced,
    saveToCache,
  } = useOfflineStorage<Booking[]>({ key: "bookings" });

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/bookings");
    }
  }, [authStatus, router]);

  useEffect(() => {
    async function fetchBookings() {
      // If offline, use cached data immediately
      if (isOffline && cachedBookings) {
        setBookings(cachedBookings);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/bookings");
        if (response.ok) {
          const data = await response.json();
          const fetchedBookings = data.bookings || [];
          setBookings(fetchedBookings);
          // Save to cache for offline access
          saveToCache(fetchedBookings);
        }
      } catch (error) {
        console.error("Error fetching bookings:", error);
        // Fall back to cached data if fetch fails
        if (cachedBookings) {
          setBookings(cachedBookings);
          toast.info(t("offline.usingCachedData"));
        }
      } finally {
        setIsLoading(false);
      }
    }

    if (authStatus === "authenticated") {
      fetchBookings();
    }
  }, [authStatus, isOffline, cachedBookings, saveToCache, t]);

  const refreshBookings = async () => {
    if (isOffline) {
      toast.error(t("offline.cannotRefresh"));
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/bookings");
      if (response.ok) {
        const data = await response.json();
        const fetchedBookings = data.bookings || [];
        setBookings(fetchedBookings);
        saveToCache(fetchedBookings);
        toast.success(t("offline.refreshed"));
      }
    } catch {
      toast.error(t("offline.refreshFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const upcomingBookings = bookings.filter((b) =>
    ["PENDING", "CONFIRMED", "IN_PROGRESS"].includes(b.status)
  );
  const pastBookings = bookings.filter((b) =>
    ["COMPLETED", "CANCELLED"].includes(b.status)
  );

  if (authStatus === "loading" || isLoading) {
    return <BookingsPageSkeleton />;
  }

  const isCustomer = (booking: Booking) => booking.customer.id === session?.user?.id;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Offline indicator */}
          {(isOffline || isFromCache) && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <WifiOff className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800">
                      {isOffline ? t("offline.youAreOffline") : t("offline.viewingCached")}
                    </p>
                    {lastSynced && (
                      <p className="text-sm text-amber-600">
                        {t("offline.lastSynced")}: {lastSynced.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                {!isOffline && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshBookings}
                    disabled={isLoading}
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
                    {t("offline.refresh")}
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="text-center mb-8">
            <Calendar className="h-12 w-12 mx-auto text-blue-500 mb-4" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              {t("nav.bookings")}
            </h1>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 w-full justify-center">
              <TabsTrigger value="upcoming" className="gap-2">
                <Calendar className="h-4 w-4" />
                {t("booking.upcoming")} ({upcomingBookings.length})
              </TabsTrigger>
              <TabsTrigger value="past" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                {t("booking.past")} ({pastBookings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming">
              {upcomingBookings.length === 0 ? (
                <EmptyState
                  title={t("booking.noUpcoming")}
                  description={t("booking.noUpcomingDesc")}
                  actionLabel={t("booking.findCleaner")}
                  actionHref="/search"
                />
              ) : (
                <div className="space-y-4">
                  {upcomingBookings.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      isCustomer={isCustomer(booking)}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="past">
              {pastBookings.length === 0 ? (
                <EmptyState
                  title={t("booking.noPast")}
                  description={t("booking.noPastDesc")}
                />
              ) : (
                <div className="space-y-4">
                  {pastBookings.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      isCustomer={isCustomer(booking)}
                      t={t}
                      isPast
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function BookingCard({
  booking: initialBooking,
  isCustomer,
  t,
  isPast = false,
}: {
  booking: Booking;
  isCustomer: boolean;
  t: ReturnType<typeof useTranslations>;
  isPast?: boolean;
}) {
  const [booking, setBooking] = useState(initialBooking);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const otherUser = isCustomer ? booking.cleaner : booking.customer;
  const isPaid = booking.payment?.status === "SUCCEEDED";
  const needsPayment = isCustomer && !isPaid && ["PENDING", "CONFIRMED"].includes(booking.status);

  const handlePayment = async () => {
    setIsProcessingPayment(true);
    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Failed to process payment. Please try again.");
    } finally {
      setIsProcessingPayment(false);
    }
  };
  const initials = `${otherUser.firstName[0]}${otherUser.lastName[0]}`;
  const dateObj = new Date(booking.scheduledDate);
  const isCleaner = !isCustomer;

  const updateStatus = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const data = await response.json();
        setBooking({ ...booking, status: data.booking.status });
        toast.success(`Booking ${newStatus.toLowerCase().replace("_", " ")}`);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update booking");
      }
    } catch {
      toast.error("Failed to update booking");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          {/* Date sidebar */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 md:w-32 flex flex-col items-center justify-center text-center">
            <span className="text-sm font-medium opacity-90">
              {dateObj.toLocaleDateString("en-US", { month: "short" })}
            </span>
            <span className="text-3xl font-bold">{dateObj.getDate()}</span>
            <span className="text-sm opacity-90">{booking.scheduledTime}</span>
          </div>

          {/* Main content */}
          <div className="flex-1 p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={otherUser.avatar || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-green-500 text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">
                    {otherUser.firstName} {otherUser.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t(`cleaner.services.${booking.service.name}` as Parameters<typeof t>[0])}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isPaid ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {t("booking.paid")}
                  </Badge>
                ) : needsPayment ? (
                  <Badge className="bg-amber-100 text-amber-800">
                    <CreditCard className="h-3 w-3 mr-1" />
                    {t("booking.paymentDue")}
                  </Badge>
                ) : null}
                <Badge className={statusColors[booking.status]}>
                  {t(`booking.status.${booking.status.toLowerCase()}` as Parameters<typeof t>[0])}
                </Badge>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-blue-500" />
                {booking.address}
                {booking.city && `, ${booking.city}`}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-blue-500" />
                {booking.duration >= 60
                  ? `${Math.floor(booking.duration / 60)}h${booking.duration % 60 > 0 ? ` ${booking.duration % 60}m` : ''}`
                  : `${booking.duration}m`
                }
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <span className="text-xl font-bold text-green-600">
                ${booking.totalPrice}
              </span>
              <div className="flex flex-wrap gap-2">
                {!isPast && (
                  <>
                    {/* Pay button for customers */}
                    {needsPayment && (
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-green-500 to-green-600"
                        onClick={handlePayment}
                        disabled={isProcessingPayment}
                      >
                        {isProcessingPayment ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <CreditCard className="h-4 w-4 mr-1" />
                        )}
                        {t("booking.payNow")}
                      </Button>
                    )}

                    <Link href={`/messages/${otherUser.id}`}>
                      <Button variant="outline" size="sm">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        {t("booking.message")}
                      </Button>
                    </Link>

                    {/* Cleaner actions */}
                    {isCleaner && booking.status === "PENDING" && (
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-green-500 to-green-600"
                        onClick={() => updateStatus("CONFIRMED")}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        )}
                        {t("booking.confirm")}
                      </Button>
                    )}

                    {isCleaner && booking.status === "CONFIRMED" && (
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-purple-500 to-purple-600"
                        onClick={() => updateStatus("IN_PROGRESS")}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-1" />
                        )}
                        {t("booking.startJob")}
                      </Button>
                    )}

                    {isCleaner && booking.status === "IN_PROGRESS" && (
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-green-500 to-green-600"
                        onClick={() => updateStatus("COMPLETED")}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        )}
                        {t("booking.complete")}
                      </Button>
                    )}

                    {/* Cancel button for pending bookings */}
                    {booking.status === "PENDING" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => updateStatus("CANCELLED")}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-1" />
                        )}
                        {t("booking.cancel")}
                      </Button>
                    )}
                  </>
                )}
                {isPast && booking.status === "COMPLETED" && isCustomer && (
                  <>
                    <Link href={`/cleaner/${booking.cleaner.id}?rebook=${booking.id}`}>
                      <Button size="sm" className="bg-gradient-to-r from-green-500 to-green-600">
                        <RotateCcw className="h-4 w-4 mr-1" />
                        {t("booking.bookAgain")}
                      </Button>
                    </Link>
                    {booking.review ? (
                      <Link href={`/bookings/${booking.id}/review`}>
                        <Button size="sm" variant="outline" className="text-green-600">
                          <Star className="h-4 w-4 mr-1 fill-yellow-400 text-yellow-400" />
                          {booking.review.rating}/5 {t("booking.reviewed")}
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/bookings/${booking.id}/review`}>
                        <Button size="sm" className="bg-gradient-to-r from-blue-500 to-blue-600">
                          <Star className="h-4 w-4 mr-1" />
                          {t("booking.leaveReview")}
                        </Button>
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="text-center py-12">
      <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref}>
          <Button className="bg-gradient-to-r from-blue-500 to-blue-600">
            {actionLabel}
          </Button>
        </Link>
      )}
    </div>
  );
}

function BookingsPageSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4">
          <Skeleton className="h-10 w-48 mb-8" />
          <Skeleton className="h-10 w-64 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
