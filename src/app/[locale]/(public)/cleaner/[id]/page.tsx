"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Star,
  MapPin,
  Clock,
  CheckCircle,
  Leaf,
  PawPrint,
  Calendar,
  MessageCircle,
  Heart,
  Share2,
  ArrowLeft,
  Loader2,
  PlayCircle,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  duration: number;
}

interface CleanerService {
  id: string;
  customPrice: number | null;
  service: Service;
}

interface Availability {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: {
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
}

interface CleanerProfile {
  id: string;
  bio: string | null;
  introVideoUrl: string | null;
  hourlyRate: number;
  currency: string;
  experienceYears: number;
  verified: boolean;
  availableNow: boolean;
  ecoFriendly: boolean;
  petFriendly: boolean;
  city: string | null;
  state: string | null;
  country: string | null;
  averageRating: number;
  totalBookings: number;
  responseTime: number | null;
  services: CleanerService[];
  availability: Availability[];
}

interface Cleaner {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  createdAt: string;
  workerProfile: CleanerProfile | null;
  reviewsReceived: Review[];
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CleanerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations();
  const { data: session } = useSession();
  const { formatPrice, formatPricePerHour } = useCurrency();
  const [cleaner, setCleaner] = useState<Cleaner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);

  useEffect(() => {
    async function fetchCleaner() {
      try {
        const response = await fetch(`/api/cleaners/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Worker not found");
          } else {
            setError("Failed to load worker profile");
          }
          return;
        }
        const data = await response.json();
        setCleaner(data.cleaner);
      } catch {
        setError("Failed to load worker profile");
      } finally {
        setIsLoading(false);
      }
    }
    fetchCleaner();
  }, [id]);

  useEffect(() => {
    async function checkFavorite() {
      if (!session?.user?.id) return;
      try {
        const response = await fetch(`/api/favorites/check?cleanerId=${id}`);
        if (response.ok) {
          const data = await response.json();
          setIsFavorite(data.isFavorite);
        }
      } catch {
        // Ignore errors for favorite check
      }
    }
    checkFavorite();
  }, [id, session?.user?.id]);

  const toggleFavorite = async () => {
    if (!session?.user?.id) {
      toast.error("Please log in to save favorites");
      return;
    }

    setIsFavoriteLoading(true);
    try {
      if (isFavorite) {
        const response = await fetch(`/api/favorites?cleanerId=${id}`, {
          method: "DELETE",
        });
        if (response.ok) {
          setIsFavorite(false);
          toast.success("Removed from favorites");
        }
      } else {
        const response = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cleanerId: id }),
        });
        if (response.ok) {
          setIsFavorite(true);
          toast.success("Added to favorites");
        }
      }
    } catch {
      toast.error("Failed to update favorites");
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  if (isLoading) {
    return <CleanerProfileSkeleton />;
  }

  if (error || !cleaner || !cleaner.workerProfile) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">{error || "Worker not found"}</h1>
            <Link href="/search">
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

  const profile = cleaner.workerProfile;
  const initials = `${cleaner.firstName[0]}${cleaner.lastName[0]}`;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-muted/30">
        {/* Back button */}
        <div className="container mx-auto px-4 py-4">
          <Link href="/search">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("common.back")}
            </Button>
          </Link>
        </div>

        {/* Profile Header */}
        <section className="bg-gradient-to-r from-blue-50 to-green-50 border-b py-8">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <Avatar className="h-32 w-32 border-4 border-white shadow-lg ring-4 ring-blue-100">
                <AvatarImage src={cleaner.avatar || undefined} />
                <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-500 to-green-500 text-white">{initials}</AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                    {cleaner.firstName} {cleaner.lastName}
                  </h1>
                  {profile.verified && (
                    <Badge className="bg-blue-500 hover:bg-blue-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t("cleaner.profile.verified")}
                    </Badge>
                  )}
                  {profile.availableNow && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Available Now
                    </Badge>
                  )}
                  {profile.ecoFriendly && (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                      <Leaf className="h-3 w-3 mr-1" />
                      {t("cleaner.profile.ecoFriendly")}
                    </Badge>
                  )}
                  {profile.petFriendly && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      <PawPrint className="h-3 w-3 mr-1" />
                      {t("cleaner.profile.petFriendly")}
                    </Badge>
                  )}
                </div>

                {profile.city && (
                  <div className="flex items-center gap-1 text-muted-foreground mt-2">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    <span>
                      {profile.city}
                      {profile.state ? `, ${profile.state}` : ""}
                      {profile.country ? `, ${profile.country}` : ""}
                    </span>
                  </div>
                )}

                {/* Stats */}
                <div className="flex flex-wrap gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{profile.averageRating.toFixed(1)}</span>
                    <span className="text-muted-foreground">
                      ({cleaner.reviewsReceived.length} {t("cleaner.profile.reviews").toLowerCase()})
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{profile.totalBookings}</span>{" "}
                    {t("cleaner.profile.bookings").toLowerCase()}
                  </div>
                  <div className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{profile.experienceYears}</span>{" "}
                    {t("cleaner.profile.years")} {t("cleaner.profile.experience").toLowerCase()}
                  </div>
                  {profile.responseTime && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        {t("cleaner.profile.responseTime")}: {profile.responseTime} min
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <Link href={`/cleaner/${cleaner.id}/book`}>
                    <Button size="lg" className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                      <Calendar className="mr-2 h-4 w-4" />
                      {t("cleaner.profile.bookNow")}
                    </Button>
                  </Link>
                  <Link href={`/messages/${cleaner.id}`}>
                    <Button variant="outline" size="lg" className="border-green-500 text-green-600 hover:bg-green-50">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      {t("messages.send")}
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={isFavorite ? "text-red-500" : "hover:text-red-500"}
                    onClick={toggleFavorite}
                    disabled={isFavoriteLoading}
                  >
                    {isFavoriteLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Heart className={`h-5 w-5 ${isFavorite ? "fill-red-500" : ""}`} />
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" className="hover:text-blue-500">
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Price Card */}
              <Card className="w-full md:w-64 shrink-0 border-t-4 border-t-green-500">
                <CardContent className="p-6 text-center">
                  <div className="text-muted-foreground text-sm">{t("cleaner.profile.hourlyRate")}</div>
                  <div className="text-4xl font-bold mt-1 text-green-600">
                    {formatPricePerHour(profile.hourlyRate)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Tabs Content */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <Tabs defaultValue="about" className="space-y-6">
              <TabsList>
                <TabsTrigger value="about">{t("cleaner.profile.about")}</TabsTrigger>
                <TabsTrigger value="services">{t("cleaner.profile.services")}</TabsTrigger>
                <TabsTrigger value="reviews">{t("cleaner.profile.reviews")}</TabsTrigger>
                <TabsTrigger value="availability">{t("cleaner.profile.availability")}</TabsTrigger>
              </TabsList>

              {/* About Tab */}
              <TabsContent value="about" className="space-y-4">
                {/* Intro Video */}
                {profile.introVideoUrl && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PlayCircle className="h-5 w-5 text-blue-500" />
                        {t("cleaner.profile.introVideo")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                        <video
                          src={profile.introVideoUrl}
                          controls
                          className="w-full h-full object-contain"
                          poster={profile.introVideoUrl.replace(/\.[^.]+$/, ".jpg")}
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Bio */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t("cleaner.profile.about")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {profile.bio ? (
                      <p className="text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>
                    ) : (
                      <p className="text-muted-foreground italic">No bio available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Services Tab */}
              <TabsContent value="services">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("cleaner.profile.services")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {profile.services.length === 0 ? (
                      <p className="text-muted-foreground italic">No services listed</p>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {profile.services.map((s) => {
                          const price = s.customPrice ?? s.service.basePrice;
                          return (
                            <div
                              key={s.id}
                              className="flex items-center justify-between p-4 border rounded-lg"
                            >
                              <div>
                                <h4 className="font-semibold">
                                  {t(`cleaner.services.${s.service.name}` as Parameters<typeof t>[0])}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  ~{s.service.duration} min
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">{formatPrice(price)}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {t("cleaner.profile.reviews")} ({cleaner.reviewsReceived.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {cleaner.reviewsReceived.length === 0 ? (
                      <p className="text-muted-foreground italic">No reviews yet</p>
                    ) : (
                      <div className="space-y-6">
                        {cleaner.reviewsReceived.map((review) => (
                          <div key={review.id} className="border-b last:border-0 pb-6 last:pb-0">
                            <div className="flex items-start gap-4">
                              <Avatar>
                                <AvatarImage src={review.reviewer.avatar || undefined} />
                                <AvatarFallback>
                                  {review.reviewer.firstName[0]}
                                  {review.reviewer.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold">
                                    {review.reviewer.firstName} {review.reviewer.lastName}
                                  </h4>
                                  <span className="text-sm text-muted-foreground">
                                    {new Date(review.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 mt-1">
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
                                {review.comment && (
                                  <p className="mt-2 text-muted-foreground">{review.comment}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Availability Tab */}
              <TabsContent value="availability">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("cleaner.profile.availability")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {profile.availability.length === 0 ? (
                      <p className="text-muted-foreground italic">No availability set</p>
                    ) : (
                      <div className="grid gap-2">
                        {DAYS.map((day, index) => {
                          const avail = profile.availability.find((a) => a.dayOfWeek === index);
                          return (
                            <div
                              key={day}
                              className="flex items-center justify-between py-2 border-b last:border-0"
                            >
                              <span className="font-medium w-20">{day}</span>
                              {avail ? (
                                <span className="text-muted-foreground">
                                  {avail.startTime} - {avail.endTime}
                                </span>
                              ) : (
                                <span className="text-muted-foreground italic">Not available</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function CleanerProfileSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <Skeleton className="h-6 w-20" />
        </div>
        <section className="bg-white border-b py-8">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-6">
              <Skeleton className="h-32 w-32 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-9 w-64 mb-2" />
                <Skeleton className="h-5 w-48 mb-4" />
                <div className="flex gap-6">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <div className="flex gap-3 mt-6">
                  <Skeleton className="h-11 w-32" />
                  <Skeleton className="h-11 w-32" />
                </div>
              </div>
              <Skeleton className="h-32 w-64" />
            </div>
          </div>
        </section>
        <section className="py-8">
          <div className="container mx-auto px-4">
            <Skeleton className="h-10 w-96 mb-6" />
            <Skeleton className="h-64 w-full" />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
