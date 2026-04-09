"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UserCheck,
  Star,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";

interface Substitute {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  rating: number;
  totalBookings: number;
  price: number;
  bio: string | null;
}

interface BookingInfo {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
  service: string;
  originalCleaner: {
    firstName: string;
    lastName: string;
  };
}

export default function SubstitutesPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const { status: authStatus } = useSession();

  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [substitutes, setSubstitutes] = useState<Substitute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bookingId = params.id as string;

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push(`/login?callbackUrl=/bookings/${bookingId}/substitutes`);
    }
  }, [authStatus, router, bookingId]);

  useEffect(() => {
    async function fetchSubstitutes() {
      try {
        const response = await fetch(`/api/bookings/${bookingId}/substitutes`);
        if (response.ok) {
          const data = await response.json();
          setBooking(data.booking);
          setSubstitutes(data.substitutes);
        } else {
          const errorData = await response.json();
          setError(errorData.error || "Failed to load substitutes");
        }
      } catch (err) {
        console.error("Error fetching substitutes:", err);
        setError("Failed to load substitutes");
      } finally {
        setIsLoading(false);
      }
    }

    if (authStatus === "authenticated" && bookingId) {
      fetchSubstitutes();
    }
  }, [authStatus, bookingId]);

  const handleAcceptSubstitute = async (substituteId: string) => {
    setAcceptingId(substituteId);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/substitutes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ substituteCleanerId: substituteId }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(t("substitutes.accepted"));
        router.push(`/bookings/${data.newBooking.id}`);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to accept substitute");
      }
    } catch (err) {
      console.error("Error accepting substitute:", err);
      toast.error("Failed to accept substitute");
    } finally {
      setAcceptingId(null);
    }
  };

  if (authStatus === "loading" || isLoading) {
    return <SubstitutesPageSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h1 className="text-2xl font-bold mb-2">{error}</h1>
            <BackButton href={`/bookings/${bookingId}`} />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const dateObj = booking ? new Date(booking.scheduledDate) : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <BackButton href={`/bookings/${bookingId}`} />
          <div className="text-center mb-8">
            <UserCheck className="h-12 w-12 mx-auto text-blue-500 mb-4" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              {t("substitutes.title")}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t("substitutes.subtitle")}
            </p>
          </div>

          {/* Original booking info */}
          {booking && (
            <Card className="mb-6 border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">
                      {t("substitutes.originalCancelled", {
                        name: `${booking.originalCleaner.firstName} ${booking.originalCleaner.lastName}`,
                      })}
                    </p>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-amber-700">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {dateObj?.toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {booking.scheduledTime}
                      </div>
                      <div>
                        {t(`cleaner.services.${booking.service}` as Parameters<typeof t>[0])}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Substitutes list */}
          {substitutes.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                {t("substitutes.availableCount", { count: substitutes.length })}
              </p>

              {substitutes.map((substitute, index) => (
                <Card
                  key={substitute.id}
                  className="overflow-hidden hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Rank */}
                      {index < 3 && (
                        <div className="bg-gradient-to-br from-blue-500 to-green-500 text-white p-4 md:w-16 flex items-center justify-center">
                          <span className="text-xl font-bold">#{index + 1}</span>
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={substitute.avatar || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-green-500 text-white">
                                {substitute.firstName[0]}
                                {substitute.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-semibold">
                                {substitute.firstName} {substitute.lastName}
                              </h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  {substitute.rating.toFixed(1)}
                                </div>
                                <span>|</span>
                                <span>
                                  {substitute.totalBookings} {t("substitutes.bookings")}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-600">
                                ${substitute.price}
                              </p>
                            </div>
                            <Button
                              onClick={() => handleAcceptSubstitute(substitute.id)}
                              disabled={acceptingId !== null}
                              className="bg-gradient-to-r from-blue-500 to-green-500"
                            >
                              {acceptingId === substitute.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-2" />
                              )}
                              {t("substitutes.accept")}
                            </Button>
                          </div>
                        </div>

                        {substitute.bio && (
                          <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                            {substitute.bio}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {t("substitutes.noAvailable")}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {t("substitutes.noAvailableDesc")}
                </p>
                <Link href="/search">
                  <Button className="bg-gradient-to-r from-blue-500 to-green-500">
                    {t("substitutes.findNewWorker")}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Skip option */}
          <div className="mt-6 text-center">
            <Link href={`/bookings/${bookingId}`}>
              <Button variant="outline">{t("substitutes.skipForNow")}</Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function SubstitutesPageSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Skeleton className="h-10 w-64 mx-auto mb-8" />
          <Skeleton className="h-24 w-full mb-6" />
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
