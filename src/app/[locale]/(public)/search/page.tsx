"use client";

import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
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
import { Search, Star, MapPin, CheckCircle, Leaf, PawPrint } from "lucide-react";

interface Service {
  id: string;
  name: string;
  basePrice: number;
  duration: number;
  isSpecialty?: boolean;
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
  ecoFriendly: boolean;
  petFriendly: boolean;
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
  const [ecoFriendly, setEcoFriendly] = useState(searchParams.get("eco") === "true");
  const [petFriendly, setPetFriendly] = useState(searchParams.get("pet") === "true");

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
      if (ecoFriendly) params.set("ecoFriendly", "true");
      if (petFriendly) params.set("petFriendly", "true");

      const response = await fetch(`/api/cleaners?${params.toString()}`);
      const data = await response.json();
      setCleaners(data.cleaners || []);
    } catch (error) {
      console.error("Error fetching cleaners:", error);
    } finally {
      setIsLoading(false);
    }
  }, [serviceFilter, minRating, maxPrice, location, ecoFriendly, petFriendly]);

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
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Header />

      <main className="flex-1 bg-muted/30 overflow-x-hidden">
        {/* Search Header */}
        <section className="bg-white border-b py-3 md:py-8">
          <div className="container mx-auto px-2 md:px-4 max-w-5xl">
            <div className="text-center mb-3 md:mb-6">
              <Search className="h-7 w-7 md:h-12 md:w-12 mx-auto text-blue-500 mb-1.5 md:mb-3" />
              <h1 className="text-lg md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">{t("customer.search.title")}</h1>
            </div>
            <div className="flex items-center justify-center gap-1.5 md:gap-4 mt-2 md:mt-4 flex-wrap">
              <button
                onClick={() => setEcoFriendly(!ecoFriendly)}
                className={`flex items-center gap-1 md:gap-2 px-2.5 md:px-5 py-1 md:py-2.5 rounded-full border transition-colors ${
                  ecoFriendly
                    ? "bg-emerald-100 border-emerald-500 text-emerald-700"
                    : "bg-white border-gray-300 text-gray-600 hover:border-emerald-400"
                }`}
              >
                <Leaf className="h-3 w-3 md:h-5 md:w-5" />
                <span className="text-[10px] md:text-base font-medium">{t("customer.search.ecoFriendly")}</span>
              </button>
              <button
                onClick={() => setPetFriendly(!petFriendly)}
                className={`flex items-center gap-1 md:gap-2 px-2.5 md:px-5 py-1 md:py-2.5 rounded-full border transition-colors ${
                  petFriendly
                    ? "bg-orange-100 border-orange-500 text-orange-700"
                    : "bg-white border-gray-300 text-gray-600 hover:border-orange-400"
                }`}
              >
                <PawPrint className="h-3 w-3 md:h-5 md:w-5" />
                <span className="text-[10px] md:text-base font-medium">{t("customer.search.petFriendly")}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Results */}
        <section className="py-4 md:py-10">
          <div className="container mx-auto px-2 md:px-4 max-w-5xl">
            {isLoading ? (
              <div className="flex flex-col items-center gap-2.5 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <CleanerCardSkeleton key={i} />
                ))}
              </div>
            ) : cleaners.length === 0 ? (
              <div className="text-center py-6 md:py-16">
                <Search className="h-8 w-8 md:h-14 md:w-14 mx-auto text-muted-foreground mb-2 md:mb-5" />
                <h2 className="text-base md:text-2xl font-semibold mb-1 md:mb-2">{t("customer.search.noResults")}</h2>
                <p className="text-xs md:text-base text-muted-foreground">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <p className="text-xs md:text-base text-muted-foreground mb-2 md:mb-6 text-center">
                  {cleaners.length} {t("customer.search.results")}
                </p>
                <div className="flex flex-col items-center gap-2.5 w-full md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6">
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
    <Card className="hover:shadow-lg transition-shadow overflow-hidden border-t-[3px] md:border-t-4 border-t-blue-500 w-[76vw] max-w-[260px] md:w-full md:max-w-none h-[240px] md:h-[360px]">
      <CardContent className="p-2 md:p-5 h-full flex flex-col">
        <div className="flex flex-col items-center text-center">
          <Avatar className="h-9 w-9 md:h-14 md:w-14 ring-2 ring-blue-100">
            <AvatarImage src={cleaner.avatar || undefined} />
            <AvatarFallback className="text-xs md:text-lg bg-gradient-to-br from-blue-500 to-green-500 text-white">{initials}</AvatarFallback>
          </Avatar>
          <div className="mt-1 md:mt-3 w-full">
            <div className="flex items-center justify-center gap-0.5 md:gap-1.5 flex-wrap">
              <h3 className="font-semibold text-[11px] md:text-base">
                {cleaner.firstName} {cleaner.lastName}
              </h3>
              {profile.verified && (
                <CheckCircle className="h-2 w-2 md:h-4 md:w-4 text-blue-500 flex-shrink-0" />
              )}
              {profile.ecoFriendly && (
                <Leaf className="h-2 w-2 md:h-4 md:w-4 text-emerald-500 flex-shrink-0" />
              )}
              {profile.petFriendly && (
                <PawPrint className="h-2 w-2 md:h-4 md:w-4 text-orange-500 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center justify-center gap-0.5 md:gap-1 text-[9px] md:text-sm text-muted-foreground mt-0.5 md:mt-1">
              <Star className="h-2 w-2 md:h-4 md:w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium text-gray-700">{profile.averageRating.toFixed(1)}</span>
              <span>({profile.totalBookings})</span>
            </div>
            {profile.city && (
              <div className="flex items-center justify-center gap-0.5 md:gap-1 text-[9px] md:text-sm text-muted-foreground mt-0.5 md:mt-1">
                <MapPin className="h-2 w-2 md:h-4 md:w-4 text-blue-500" />
                <span>{profile.city}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <p className="text-[9px] md:text-sm text-muted-foreground mt-1 md:mt-3 line-clamp-2 text-center">
            {profile.bio || "\u00A0"}
          </p>

          <div className="flex flex-wrap justify-center gap-0.5 md:gap-1.5 mt-1 md:mt-3">
            {profile.services.slice(0, 2).map((s) => (
              <Badge key={s.service.id} className="text-[8px] md:text-xs px-1 md:px-2.5 py-0 md:py-0.5 bg-blue-100 text-blue-700 hover:bg-blue-200">
                {t(`cleaner.services.${s.service.name}` as Parameters<typeof t>[0])}
              </Badge>
            ))}
            {profile.services.length > 2 && (
              <Badge className="text-[8px] md:text-xs px-1 md:px-2.5 py-0 md:py-0.5 bg-green-100 text-green-700">
                +{profile.services.length - 2}
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-auto pt-1 md:pt-3 border-t text-center">
          <span className="text-sm md:text-2xl font-bold text-blue-600">${profile.hourlyRate}</span>
          <span className="text-muted-foreground text-[9px] md:text-base">/hr</span>
        </div>
        <Link href={`/cleaner/${cleaner.id}`} className="block mt-1 md:mt-3">
          <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-[10px] md:text-sm h-6 md:h-10">{t("cleaner.profile.bookNow")}</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function CleanerCardSkeleton() {
  return (
    <Card className="w-[76vw] max-w-[260px] md:w-full md:max-w-none h-[240px] md:h-[360px]">
      <CardContent className="p-2 md:p-5 h-full flex flex-col">
        <div className="flex flex-col items-center">
          <Skeleton className="h-9 w-9 md:h-14 md:w-14 rounded-full" />
          <Skeleton className="h-2.5 md:h-5 w-20 md:w-32 mt-1 md:mt-3" />
          <Skeleton className="h-2 md:h-4 w-14 md:w-24 mt-0.5 md:mt-1" />
        </div>
        <div className="flex-1 flex flex-col">
          <Skeleton className="h-2 md:h-4 w-full mt-1 md:mt-3" />
          <div className="flex justify-center gap-0.5 md:gap-1.5 mt-1 md:mt-3">
            <Skeleton className="h-3 md:h-6 w-10 md:w-16" />
            <Skeleton className="h-3 md:h-6 w-10 md:w-16" />
          </div>
        </div>
        <div className="mt-auto pt-1 md:pt-3 border-t flex flex-col items-center">
          <Skeleton className="h-3.5 md:h-7 w-12 md:w-20" />
          <Skeleton className="h-6 md:h-10 w-full mt-1 md:mt-3" />
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
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Header />
      <main className="flex-1 bg-muted/30 overflow-x-hidden">
        <section className="bg-white border-b py-3 md:py-8">
          <div className="container mx-auto px-2 md:px-4">
            <div className="flex flex-col items-center">
              <Skeleton className="h-7 w-7 md:h-12 md:w-12 mb-1.5 md:mb-3 rounded-full" />
              <Skeleton className="h-4 md:h-8 w-28 md:w-48" />
            </div>
            <div className="flex justify-center gap-1.5 md:gap-4 mt-2 md:mt-4">
              <Skeleton className="h-6 md:h-11 w-20 md:w-32 rounded-full" />
              <Skeleton className="h-6 md:h-11 w-20 md:w-32 rounded-full" />
            </div>
          </div>
        </section>
        <section className="py-3 md:py-10">
          <div className="container mx-auto px-2 md:px-4">
            <div className="flex flex-col items-center gap-2.5 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6">
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
