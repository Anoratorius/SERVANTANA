"use client";

import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Star, MapPin, CheckCircle } from "lucide-react";

interface Service {
  id: string;
  name: string;
  basePrice: number;
  duration: number;
}

interface CleanerService {
  customPrice: number | null;
  service: Service;
}

interface CleanerProfile {
  id: string;
  bio: string | null;
  hourlyRate: number;
  currency: string;
  experienceYears: number;
  verified: boolean;
  availableNow: boolean;
  city: string | null;
  state: string | null;
  averageRating: number;
  totalBookings: number;
  services: CleanerService[];
}

interface Cleaner {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  cleanerProfile: CleanerProfile | null;
}

function SearchContent() {
  const t = useTranslations();
  const searchParams = useSearchParams();

  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [isDetectingLocation, setIsDetectingLocation] = useState(true);
  const [serviceFilter, setServiceFilter] = useState(searchParams.get("service") || "all");
  const [minRating, setMinRating] = useState(searchParams.get("rating") || "0");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("price") || "any");

  // Auto-detect location via IP on mount
  useEffect(() => {
    async function detectLocation() {
      try {
        const response = await fetch("http://ip-api.com/json/?fields=city,regionName,country");
        const data = await response.json();
        if (data.city) {
          setLocation(data.city);
        }
      } catch (error) {
        console.error("Error detecting location:", error);
      } finally {
        setIsDetectingLocation(false);
      }
    }

    // Only detect if no location provided in URL
    if (!searchParams.get("location")) {
      detectLocation();
    } else {
      setIsDetectingLocation(false);
    }
  }, [searchParams]);

  // Fetch services on mount
  useEffect(() => {
    async function fetchServices() {
      try {
        const response = await fetch("/api/services");
        const data = await response.json();
        setServices(data.services || []);
      } catch (error) {
        console.error("Error fetching services:", error);
      }
    }
    fetchServices();
  }, []);

  // Debounced fetch cleaners
  const fetchCleaners = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (serviceFilter && serviceFilter !== "all") params.set("service", serviceFilter);
      if (minRating && minRating !== "0") params.set("minRating", minRating);
      if (maxPrice && maxPrice !== "any") params.set("maxPrice", maxPrice);
      if (location) params.set("city", location);

      const response = await fetch(`/api/cleaners?${params.toString()}`);
      const data = await response.json();
      setCleaners(data.cleaners || []);
    } catch (error) {
      console.error("Error fetching cleaners:", error);
    } finally {
      setIsLoading(false);
    }
  }, [serviceFilter, minRating, maxPrice, location]);

  // Debounce filter changes to prevent excessive API calls
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchCleaners();
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [fetchCleaners]);

  const getServiceLabel = (name: string) => {
    const key = `cleaner.services.${name}` as const;
    return t(key);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-muted/30">
        {/* Search Header */}
        <section className="bg-white border-b py-6">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-6">
              <Search className="h-10 w-10 mx-auto text-blue-500 mb-3" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">{t("customer.search.title")}</h1>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm">{t("customer.search.location")}</Label>
                <div className="relative mt-1 flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  {isDetectingLocation ? (
                    <span className="text-sm text-muted-foreground">{t("home.hero.detectingLocation")}</span>
                  ) : (
                    <span className="text-sm font-medium">{location || "Unknown"}</span>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-sm">{t("customer.search.service")}</Label>
                <Select value={serviceFilter} onValueChange={setServiceFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All services" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.name}>
                        {getServiceLabel(service.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">{t("customer.search.rating")}</Label>
                <Select value={minRating} onValueChange={setMinRating}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Any Rating</SelectItem>
                    <SelectItem value="3">3+ Stars</SelectItem>
                    <SelectItem value="4">4+ Stars</SelectItem>
                    <SelectItem value="4.5">4.5+ Stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">{t("customer.search.priceRange")}</Label>
                <Select value={maxPrice} onValueChange={setMaxPrice}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Any price" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Price</SelectItem>
                    <SelectItem value="25">Up to $25/hr</SelectItem>
                    <SelectItem value="50">Up to $50/hr</SelectItem>
                    <SelectItem value="75">Up to $75/hr</SelectItem>
                    <SelectItem value="100">Up to $100/hr</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        {/* Results */}
        <section className="py-8">
          <div className="container mx-auto px-4 max-w-5xl">
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <CleanerCardSkeleton key={i} />
                ))}
              </div>
            ) : cleaners.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">{t("customer.search.noResults")}</h2>
                <p className="text-muted-foreground">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <p className="text-muted-foreground mb-6">
                  {cleaners.length} {t("customer.search.results")}
                </p>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cleaners.map((cleaner) => (
                    <CleanerCard key={cleaner.id} cleaner={cleaner} t={t} />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function CleanerCard({ cleaner, t }: { cleaner: Cleaner; t: ReturnType<typeof useTranslations> }) {
  const profile = cleaner.cleanerProfile;
  if (!profile) return null;

  const initials = `${cleaner.firstName[0]}${cleaner.lastName[0]}`;

  return (
    <Card className="hover:shadow-lg transition-shadow overflow-hidden border-t-4 border-t-blue-500">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 ring-2 ring-blue-100">
            <AvatarImage src={cleaner.avatar || undefined} />
            <AvatarFallback className="text-lg bg-gradient-to-br from-blue-500 to-green-500 text-white">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">
                {cleaner.firstName} {cleaner.lastName}
              </h3>
              {profile.verified && (
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium text-gray-700">{profile.averageRating.toFixed(1)}</span>
              <span>({profile.totalBookings} {t("cleaner.profile.bookings")})</span>
            </div>
            {profile.city && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <MapPin className="h-3 w-3 text-blue-500" />
                <span>{profile.city}{profile.state ? `, ${profile.state}` : ""}</span>
              </div>
            )}
          </div>
        </div>

        {profile.bio && (
          <p className="text-sm text-muted-foreground mt-4 line-clamp-2">
            {profile.bio}
          </p>
        )}

        <div className="flex flex-wrap gap-1 mt-4">
          {profile.services.slice(0, 3).map((s) => (
            <Badge key={s.service.id} className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200">
              {t(`cleaner.services.${s.service.name}` as Parameters<typeof t>[0])}
            </Badge>
          ))}
          {profile.services.length > 3 && (
            <Badge className="text-xs bg-green-100 text-green-700">
              +{profile.services.length - 3}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <div>
            <span className="text-2xl font-bold text-blue-600">${profile.hourlyRate}</span>
            <span className="text-muted-foreground">/hr</span>
          </div>
          <Link href={`/cleaner/${cleaner.id}`}>
            <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">{t("cleaner.profile.bookNow")}</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function CleanerCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <Skeleton className="h-10 w-full mt-4" />
        <div className="flex gap-1 mt-4">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-10 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <SearchContent />
    </Suspense>
  );
}

function SearchPageSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <section className="bg-white border-b py-6">
          <div className="container mx-auto px-4">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="grid md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          </div>
        </section>
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <CleanerCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
