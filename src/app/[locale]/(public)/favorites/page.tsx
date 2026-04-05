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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Heart,
  Star,
  MapPin,
  CheckCircle,
  Trash2,
  Calendar,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";

interface Favorite {
  id: string;
  createdAt: string;
  cleaner: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    workerProfile: {
      hourlyRate: number;
      averageRating: number;
      city: string | null;
      verified: boolean;
    } | null;
  };
}

export default function FavoritesPage() {
  const t = useTranslations();
  const router = useRouter();
  const { status: authStatus } = useSession();

  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/favorites");
    }
  }, [authStatus, router]);

  useEffect(() => {
    async function fetchFavorites() {
      try {
        const response = await fetch("/api/favorites");
        if (response.ok) {
          const data = await response.json();
          setFavorites(data.favorites || []);
        }
      } catch (error) {
        console.error("Error fetching favorites:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (authStatus === "authenticated") {
      fetchFavorites();
    }
  }, [authStatus]);

  const removeFavorite = async (cleanerId: string) => {
    setRemovingId(cleanerId);
    try {
      const response = await fetch(`/api/favorites?cleanerId=${cleanerId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setFavorites((prev) => prev.filter((f) => f.cleaner.id !== cleanerId));
        toast.success("Removed from favorites");
      } else {
        toast.error("Failed to remove from favorites");
      }
    } catch {
      toast.error("Failed to remove from favorites");
    } finally {
      setRemovingId(null);
    }
  };

  if (authStatus === "loading" || isLoading) {
    return <FavoritesPageSkeleton />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-b from-red-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <Button variant="ghost" onClick={() => router.back()} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("common.back")}
          </Button>
          <div className="text-center mb-8">
            <Heart className="h-12 w-12 mx-auto text-red-500 fill-red-500 mb-4" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
              {t("customer.dashboard.favoriteWorkers")}
            </h1>
          </div>

          {favorites.length === 0 ? (
            <div className="text-center py-16">
              <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No favorite workers yet</h2>
              <p className="text-muted-foreground mb-6">
                Save workers you like to easily find them later
              </p>
              <Link href="/search">
                <Button className="bg-gradient-to-r from-blue-500 to-blue-600">
                  Find Workers
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {favorites.map((favorite) => {
                const cleaner = favorite.cleaner;
                const profile = cleaner.workerProfile;
                const initials = `${cleaner.firstName[0]}${cleaner.lastName[0]}`;

                return (
                  <Card key={favorite.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardContent className="p-0">
                      <div className="p-4">
                        <div className="flex items-start gap-4">
                          <Link href={`/worker-profile/${cleaner.id}`}>
                            <Avatar className="h-16 w-16 ring-2 ring-red-100">
                              <AvatarImage src={cleaner.avatar || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-green-500 text-white text-lg">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                          </Link>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Link href={`/worker-profile/${cleaner.id}`}>
                                <h3 className="font-semibold hover:text-blue-600 transition-colors">
                                  {cleaner.firstName} {cleaner.lastName}
                                </h3>
                              </Link>
                              {profile?.verified && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </div>

                            {profile && (
                              <>
                                <div className="flex items-center gap-1 mt-1">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  <span className="text-sm font-medium">
                                    {profile.averageRating.toFixed(1)}
                                  </span>
                                </div>

                                {profile.city && (
                                  <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                                    <MapPin className="h-3 w-3" />
                                    {profile.city}
                                  </div>
                                )}

                                <div className="mt-2">
                                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                                    ${profile.hourlyRate}/hr
                                  </Badge>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Link href={`/worker-profile/${cleaner.id}/book`} className="flex-1">
                            <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600" size="sm">
                              <Calendar className="h-4 w-4 mr-1" />
                              Book Now
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => removeFavorite(cleaner.id)}
                            disabled={removingId === cleaner.id}
                          >
                            {removingId === cleaner.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function FavoritesPageSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-b from-red-50 to-white py-8">
        <div className="container mx-auto px-4">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
