"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Navigation,
  Clock,
  Route,
  Phone,
  User,
  ChevronRight,
  Car,
  Timer,
  Target,
  Home,
} from "lucide-react";

interface RouteBooking {
  id: string;
  address: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  scheduledTime: string;
  duration: number;
  status: string;
  distanceFromPrevious: number;
  travelTimeMinutes: number;
  customer: {
    firstName: string;
    lastName: string;
    phone: string | null;
  };
  service: {
    name: string;
  };
}

interface RouteSummary {
  totalStops: number;
  totalDistance: number;
  totalTravelTime: number;
  totalServiceTime: number;
  estimatedEndTime: string | null;
}

interface RouteData {
  bookings: RouteBooking[];
  summary: RouteSummary;
  startLocation: { latitude: number; longitude: number } | null;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-purple-100 text-purple-800",
};

export default function RoutePlannerPage() {
  const t = useTranslations();
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/dashboard/route");
    }
  }, [authStatus, router]);

  useEffect(() => {
    async function fetchRoute() {
      try {
        const response = await fetch("/api/bookings/route-plan");
        if (response.ok) {
          const data = await response.json();
          setRouteData(data);
        } else {
          const errorData = await response.json();
          setError(errorData.error || "Failed to load route");
        }
      } catch (err) {
        console.error("Error fetching route:", err);
        setError("Failed to load route");
      } finally {
        setIsLoading(false);
      }
    }

    if (authStatus === "authenticated" && session?.user?.role === "CLEANER") {
      fetchRoute();
    } else if (authStatus === "authenticated" && session?.user?.role !== "CLEANER") {
      setError("Only workers can access route planning");
      setIsLoading(false);
    }
  }, [authStatus, session?.user?.role]);

  const openInMaps = (address: string, lat?: number | null, lon?: number | null) => {
    let url: string;
    if (lat && lon) {
      // Use coordinates for more accurate navigation
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
    } else {
      // Fall back to address
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    }
    window.open(url, "_blank");
  };

  const openFullRoute = () => {
    if (!routeData || routeData.bookings.length === 0) return;

    const waypoints = routeData.bookings
      .filter((b) => b.latitude && b.longitude)
      .map((b) => `${b.latitude},${b.longitude}`)
      .join("|");

    const destination = routeData.bookings[routeData.bookings.length - 1];
    const destCoords = destination.latitude && destination.longitude
      ? `${destination.latitude},${destination.longitude}`
      : encodeURIComponent(destination.address);

    let url = `https://www.google.com/maps/dir/?api=1&destination=${destCoords}`;

    if (waypoints && routeData.bookings.length > 1) {
      const waypointsWithoutLast = routeData.bookings
        .slice(0, -1)
        .filter((b) => b.latitude && b.longitude)
        .map((b) => `${b.latitude},${b.longitude}`)
        .join("|");
      if (waypointsWithoutLast) {
        url += `&waypoints=${waypointsWithoutLast}`;
      }
    }

    if (routeData.startLocation) {
      url += `&origin=${routeData.startLocation.latitude},${routeData.startLocation.longitude}`;
    }

    window.open(url, "_blank");
  };

  if (authStatus === "loading" || isLoading) {
    return <RoutePlannerSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <Route className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">{error}</h1>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-8">
            <Route className="h-12 w-12 mx-auto text-blue-500 mb-4" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              {t("route.title")}
            </h1>
            <p className="text-muted-foreground mt-2">{today}</p>
          </div>

          {routeData && routeData.bookings.length > 0 ? (
            <>
              {/* Summary Card */}
              <Card className="mb-6 bg-gradient-to-r from-blue-500 to-green-500 text-white">
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <Target className="h-6 w-6 mx-auto mb-2 opacity-90" />
                      <p className="text-2xl font-bold">{routeData.summary.totalStops}</p>
                      <p className="text-sm opacity-90">{t("route.stops")}</p>
                    </div>
                    <div>
                      <Car className="h-6 w-6 mx-auto mb-2 opacity-90" />
                      <p className="text-2xl font-bold">{routeData.summary.totalDistance} km</p>
                      <p className="text-sm opacity-90">{t("route.totalDistance")}</p>
                    </div>
                    <div>
                      <Timer className="h-6 w-6 mx-auto mb-2 opacity-90" />
                      <p className="text-2xl font-bold">{routeData.summary.totalTravelTime} min</p>
                      <p className="text-sm opacity-90">{t("route.travelTime")}</p>
                    </div>
                    <div>
                      <Clock className="h-6 w-6 mx-auto mb-2 opacity-90" />
                      <p className="text-2xl font-bold">{routeData.summary.estimatedEndTime || "--:--"}</p>
                      <p className="text-sm opacity-90">{t("route.finishBy")}</p>
                    </div>
                  </div>
                  <div className="mt-6 text-center">
                    <Button
                      onClick={openFullRoute}
                      variant="secondary"
                      className="bg-white text-blue-600 hover:bg-white/90"
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      {t("route.openFullRoute")}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Start Location */}
              {routeData.startLocation && (
                <div className="flex items-center gap-3 mb-4 px-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
                    <Home className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-green-700">{t("route.startLocation")}</p>
                    <p className="text-sm text-muted-foreground">{t("route.yourLocation")}</p>
                  </div>
                </div>
              )}

              {/* Route Steps */}
              <div className="space-y-4">
                {routeData.bookings.map((booking, index) => (
                  <div key={booking.id}>
                    {/* Travel indicator */}
                    {(index > 0 || routeData.startLocation) && booking.travelTimeMinutes > 0 && (
                      <div className="flex items-center gap-3 py-2 px-4">
                        <div className="w-10 flex justify-center">
                          <div className="w-0.5 h-8 bg-blue-200" />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Car className="h-4 w-4" />
                          <span>
                            {booking.distanceFromPrevious} km ({booking.travelTimeMinutes} min)
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Booking Card */}
                    <Card className="overflow-hidden hover:shadow-md transition-shadow">
                      <CardContent className="p-0">
                        <div className="flex">
                          {/* Stop number */}
                          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 w-16 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold">{index + 1}</span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 p-4">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={statusColors[booking.status]}>
                                    {t(`booking.status.${booking.status.toLowerCase()}` as Parameters<typeof t>[0])}
                                  </Badge>
                                  <span className="text-sm font-medium">
                                    {booking.scheduledTime}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    ({booking.duration} min)
                                  </span>
                                </div>

                                <p className="font-medium text-lg mb-1">
                                  {t(`cleaner.services.${booking.service.name}` as Parameters<typeof t>[0])}
                                </p>

                                <div className="flex items-center gap-1 text-muted-foreground mb-2">
                                  <MapPin className="h-4 w-4" />
                                  <span className="text-sm">
                                    {booking.address}
                                    {booking.city && `, ${booking.city}`}
                                  </span>
                                </div>

                                <div className="flex items-center gap-4 text-sm">
                                  <div className="flex items-center gap-1">
                                    <User className="h-4 w-4 text-blue-500" />
                                    <span>
                                      {booking.customer.firstName} {booking.customer.lastName}
                                    </span>
                                  </div>
                                  {booking.customer.phone && (
                                    <a
                                      href={`tel:${booking.customer.phone}`}
                                      className="flex items-center gap-1 text-blue-600 hover:underline"
                                    >
                                      <Phone className="h-4 w-4" />
                                      <span>{booking.customer.phone}</span>
                                    </a>
                                  )}
                                </div>
                              </div>

                              <Button
                                onClick={() => openInMaps(
                                  `${booking.address}${booking.city ? `, ${booking.city}` : ""}`,
                                  booking.latitude,
                                  booking.longitude
                                )}
                                className="bg-gradient-to-r from-blue-500 to-green-500"
                              >
                                <Navigation className="h-4 w-4 mr-2" />
                                {t("route.navigate")}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>

              {/* End indicator */}
              <div className="flex items-center gap-3 mt-4 px-4">
                <div className="w-10 flex justify-center">
                  <div className="w-0.5 h-4 bg-blue-200" />
                </div>
              </div>
              <div className="flex items-center gap-3 px-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
                  <ChevronRight className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-green-700">{t("route.routeComplete")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("route.estimatedFinish")}: {routeData.summary.estimatedEndTime || "--:--"}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Route className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t("route.noBookings")}</h3>
                <p className="text-muted-foreground">{t("route.noBookingsDesc")}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function RoutePlannerSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Skeleton className="h-10 w-48 mx-auto mb-8" />
          <Skeleton className="h-40 w-full mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
