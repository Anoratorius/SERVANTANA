"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Navigation,
  Clock,
  Calendar,
  User,
  Phone,
  MessageCircle,
  Loader2,
  ArrowLeft,
  Car,
  Radio,
  MapPinOff,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import { BookingChat } from "@/components/bookings/BookingChat";
import { BookingTeam } from "@/components/bookings/BookingTeam";
import { TipDialog } from "@/components/bookings/TipDialog";
import { CustomerReviewDialog } from "@/components/bookings/CustomerReviewDialog";
import { SmartLockAccess } from "@/components/bookings/SmartLockAccess";

interface Booking {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  address: string;
  city: string | null;
  status: string;
  totalPrice: number;
  teamSize: number;
  tipAmount: number | null;
  notes: string | null;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  };
  cleaner: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  };
  service: {
    name: string;
  };
}

interface TrackingData {
  trackingActive: boolean;
  cleanerLocation: {
    latitude: number;
    longitude: number;
    lastUpdate: string;
  } | null;
  destination: {
    latitude: number | null;
    longitude: number | null;
    address: string;
  };
  estimatedArrival: string | null;
  distanceKm: number | null;
  cleanerName: string;
  status: string;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function BookingDetailPage() {
  const t = useTranslations();
  const params = useParams();
  const { data: session, status: authStatus } = useSession();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingTracking, setIsTogglingTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const bookingId = params.id as string;
  const isCleaner = session?.user?.id === booking?.cleaner.id;
  const isCustomer = session?.user?.id === booking?.customer.id;

  // Fetch booking details
  useEffect(() => {
    async function fetchBooking() {
      try {
        const response = await fetch(`/api/bookings/${bookingId}`);
        if (response.ok) {
          const data = await response.json();
          setBooking(data.booking);
        }
      } catch (error) {
        console.error("Error fetching booking:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (authStatus === "authenticated" && bookingId) {
      fetchBooking();
    }
  }, [authStatus, bookingId]);

  // Fetch tracking data (poll every 10 seconds for customer)
  const fetchTracking = useCallback(async () => {
    if (!bookingId) return;
    try {
      const response = await fetch(`/api/bookings/${bookingId}/tracking`);
      if (response.ok) {
        const data = await response.json();
        setTracking(data);
      }
    } catch (error) {
      console.error("Error fetching tracking:", error);
    }
  }, [bookingId]);

  useEffect(() => {
    if (authStatus === "authenticated" && bookingId && booking) {
      fetchTracking();

      // Poll for updates if customer and booking is confirmed/in progress
      if (isCustomer && ["CONFIRMED", "IN_PROGRESS"].includes(booking.status)) {
        const interval = setInterval(fetchTracking, 10000);
        return () => clearInterval(interval);
      }
    }
  }, [authStatus, bookingId, booking, isCustomer, fetchTracking]);

  // Start GPS tracking (cleaner)
  const startTracking = async () => {
    if (!navigator.geolocation) {
      toast.error(t("tracking.gpsNotSupported"));
      return;
    }

    setIsTogglingTracking(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch(`/api/bookings/${bookingId}/tracking`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "start",
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          });

          if (response.ok) {
            toast.success(t("tracking.started"));
            fetchTracking();

            // Start watching position
            const id = navigator.geolocation.watchPosition(
              async (pos) => {
                await fetch(`/api/bookings/${bookingId}/tracking`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                  }),
                });
                fetchTracking();
              },
              (error) => console.error("Watch position error:", error),
              { enableHighAccuracy: true, maximumAge: 10000 }
            );
            setWatchId(id);
          }
        } catch {
          toast.error(t("tracking.startFailed"));
        } finally {
          setIsTogglingTracking(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error(t("tracking.locationError"));
        setIsTogglingTracking(false);
      },
      { enableHighAccuracy: true }
    );
  };

  // Stop GPS tracking (cleaner)
  const stopTracking = async () => {
    setIsTogglingTracking(true);

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }

    try {
      const response = await fetch(`/api/bookings/${bookingId}/tracking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });

      if (response.ok) {
        toast.success(t("tracking.stopped"));
        fetchTracking();
      }
    } catch {
      toast.error(t("tracking.stopFailed"));
    } finally {
      setIsTogglingTracking(false);
    }
  };

  // Open navigation
  const openNavigation = () => {
    if (!booking) return;
    const address = `${booking.address}${booking.city ? `, ${booking.city}` : ""}`;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`,
      "_blank"
    );
  };

  if (authStatus === "loading" || isLoading) {
    return <BookingDetailSkeleton />;
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">{t("booking.notFound")}</h1>
            <Link href="/bookings">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("common.back")}
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const otherUser = isCleaner ? booking.customer : booking.cleaner;
  const dateObj = new Date(booking.scheduledDate);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Back button */}
          <Link
            href="/bookings"
            className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("common.back")}
          </Link>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">
                {t(`cleaner.services.${booking.service.name}` as Parameters<typeof t>[0])}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={statusColors[booking.status]}>
                  {t(`booking.status.${booking.status.toLowerCase()}` as Parameters<typeof t>[0])}
                </Badge>
                <span className="text-muted-foreground">
                  {dateObj.toLocaleDateString()} at {booking.scheduledTime}
                </span>
              </div>
            </div>
            <div className="text-2xl font-bold text-green-600">
              ${booking.totalPrice}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Booking Details */}
            <Card>
              <CardHeader>
                <CardTitle>{t("booking.details")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">{dateObj.toLocaleDateString()}</p>
                    <p className="text-sm text-muted-foreground">{t("booking.date")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">
                      {booking.scheduledTime} ({booking.duration} min)
                    </p>
                    <p className="text-sm text-muted-foreground">{t("booking.time")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">
                      {booking.address}
                      {booking.city && `, ${booking.city}`}
                    </p>
                    <p className="text-sm text-muted-foreground">{t("booking.location")}</p>
                  </div>
                </div>
                {booking.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">{t("booking.notes")}</p>
                    <p className="mt-1">{booking.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {isCleaner ? t("booking.customer") : t("booking.cleaner")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-blue-500" />
                  <p className="font-medium">
                    {otherUser.firstName} {otherUser.lastName}
                  </p>
                </div>
                {otherUser.phone && (
                  <a
                    href={`tel:${otherUser.phone}`}
                    className="flex items-center gap-3 text-blue-600 hover:underline"
                  >
                    <Phone className="h-5 w-5" />
                    <p>{otherUser.phone}</p>
                  </a>
                )}
                <Link href={`/messages/${otherUser.id}`}>
                  <Button variant="outline" className="w-full mt-2">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {t("booking.message")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* GPS Tracking Section */}
          {["CONFIRMED", "IN_PROGRESS"].includes(booking.status) && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="h-5 w-5 text-blue-500" />
                  {t("tracking.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Cleaner controls */}
                {isCleaner && (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      {t("tracking.cleanerDescription")}
                    </p>
                    <div className="flex flex-wrap gap-4">
                      {tracking?.trackingActive ? (
                        <Button
                          onClick={stopTracking}
                          disabled={isTogglingTracking}
                          variant="destructive"
                        >
                          {isTogglingTracking ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <MapPinOff className="h-4 w-4 mr-2" />
                          )}
                          {t("tracking.stopSharing")}
                        </Button>
                      ) : (
                        <Button
                          onClick={startTracking}
                          disabled={isTogglingTracking}
                          className="bg-gradient-to-r from-blue-500 to-green-500"
                        >
                          {isTogglingTracking ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Radio className="h-4 w-4 mr-2" />
                          )}
                          {t("tracking.startSharing")}
                        </Button>
                      )}
                      <Button onClick={openNavigation} variant="outline">
                        <Navigation className="h-4 w-4 mr-2" />
                        {t("tracking.navigate")}
                      </Button>
                    </div>
                    {tracking?.trackingActive && (
                      <div className="flex items-center gap-2 text-green-600">
                        <Radio className="h-4 w-4 animate-pulse" />
                        <span>{t("tracking.sharingActive")}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Customer view */}
                {isCustomer && (
                  <div className="space-y-4">
                    {tracking?.trackingActive ? (
                      <>
                        <div className="flex items-center gap-2 text-green-600">
                          <Car className="h-5 w-5" />
                          <span className="font-medium">
                            {t("tracking.cleanerEnRoute", { name: tracking.cleanerName })}
                          </span>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          {tracking.distanceKm !== null && (
                            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                              <MapPin className="h-6 w-6 text-blue-500" />
                              <div>
                                <p className="text-2xl font-bold text-blue-600">
                                  {tracking.distanceKm} km
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {t("tracking.distance")}
                                </p>
                              </div>
                            </div>
                          )}

                          {tracking.estimatedArrival && (
                            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                              <Clock className="h-6 w-6 text-green-500" />
                              <div>
                                <p className="text-2xl font-bold text-green-600">
                                  {new Date(tracking.estimatedArrival).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {t("tracking.eta")}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {tracking.cleanerLocation?.lastUpdate && (
                          <p className="text-sm text-muted-foreground">
                            {t("tracking.lastUpdate")}:{" "}
                            {new Date(tracking.cleanerLocation.lastUpdate).toLocaleTimeString()}
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>{t("tracking.notStarted")}</p>
                        <p className="text-sm mt-2">{t("tracking.notStartedDesc")}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Smart Lock Access - For cleaners on confirmed/in-progress bookings */}
          {isCleaner && ["CONFIRMED", "IN_PROGRESS"].includes(booking.status) && (
            <div className="mt-6">
              <SmartLockAccess bookingId={bookingId} />
            </div>
          )}

          {/* Team Section - For team bookings */}
          {booking.teamSize > 1 && (
            <div className="mt-6">
              <BookingTeam
                bookingId={bookingId}
                isLeadCleaner={isCleaner}
                teamSize={booking.teamSize}
              />
            </div>
          )}

          {/* Tip Section - For customers on completed bookings */}
          {booking.status === "COMPLETED" && isCustomer && (
            <Card className="mt-6">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{t("tip.satisfied")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {booking.tipAmount
                        ? t("tip.alreadyTipped", { amount: booking.tipAmount.toFixed(2) })
                        : t("tip.showAppreciation")}
                    </p>
                  </div>
                  {!booking.tipAmount && (
                    <TipDialog
                      bookingId={bookingId}
                      cleanerName={`${booking.cleaner.firstName} ${booking.cleaner.lastName}`}
                      totalPrice={booking.totalPrice}
                      onTipComplete={() => {
                        // Refresh booking data
                        window.location.reload();
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Customer Review Section - For cleaners on completed bookings */}
          {booking.status === "COMPLETED" && isCleaner && (
            <Card className="mt-6">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{t("customerReview.title")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("customerReview.description", {
                        name: `${booking.customer.firstName} ${booking.customer.lastName}`,
                      })}
                    </p>
                  </div>
                  <CustomerReviewDialog
                    bookingId={bookingId}
                    customerName={`${booking.customer.firstName} ${booking.customer.lastName}`}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Chat Section - Only for completed bookings */}
          {booking.status === "COMPLETED" && (
            <div className="mt-6">
              <BookingChat bookingId={bookingId} />
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function BookingDetailSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-10 w-64 mb-6" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-48 mt-6" />
        </div>
      </main>
      <Footer />
    </div>
  );
}
