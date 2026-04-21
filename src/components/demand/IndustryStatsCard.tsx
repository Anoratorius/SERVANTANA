"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  DollarSign,
  Users,
  Clock,
  MapPin,
  Sparkles,
  AlertCircle,
} from "lucide-react";

interface IndustryStatsCardProps {
  professionId?: string;
  city?: string;
  state?: string;
  country?: string;
  locale?: string;
}

interface IndustryData {
  source: "PLATFORM" | "ESTIMATED" | "HYBRID";
  profession?: {
    name: string;
    nameDE: string | null;
    emoji: string;
  };
  location: {
    city: string | null;
    state: string | null;
    country: string;
  };
  earnings: {
    avgHourlyRate: number;
    minHourlyRate: number | null;
    maxHourlyRate: number | null;
    avgMonthlyEarnings: number | null;
    avgWeeklyBookings: number | null;
    avgBookingValue: number | null;
  };
  market?: {
    totalWorkers: number;
    totalCustomers: number;
    demandScore: number;
    supplyScore: number;
    opportunityScore: number;
  };
  data?: {
    currency: string;
    avgHourlyRate: number;
    minHourlyRate: number;
    maxHourlyRate: number;
    avgMonthlyEarnings: number;
    avgWeeklyBookings: number;
    avgBookingValue: number;
  };
}

interface DemandStats {
  demand: {
    totalSearches: number;
    unmatchedSearches: number;
    waitlistCount: number;
    demandLevel: string;
  };
  message: string;
}

export function IndustryStatsCard({
  professionId,
  city,
  state,
  country = "DE",
  locale = "en",
}: IndustryStatsCardProps) {
  const [industryData, setIndustryData] = useState<IndustryData | null>(null);
  const [demandStats, setDemandStats] = useState<DemandStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (professionId) params.set("professionId", professionId);
        if (city) params.set("city", city);
        if (state) params.set("state", state);
        if (country) params.set("country", country);

        const [industryRes, demandRes] = await Promise.all([
          fetch(`/api/demand/industry?${params.toString()}`),
          fetch(`/api/demand/stats?${params.toString()}`),
        ]);

        if (industryRes.ok) {
          setIndustryData(await industryRes.json());
        }
        if (demandRes.ok) {
          setDemandStats(await demandRes.json());
        }
      } catch (error) {
        console.error("Error fetching industry data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [professionId, city, state, country]);

  if (isLoading) {
    return <IndustryStatsCardSkeleton />;
  }

  const getCurrency = () => {
    const currencies: Record<string, string> = {
      DE: "EUR",
      AT: "EUR",
      CH: "CHF",
      US: "USD",
      GB: "GBP",
    };
    return currencies[country] || "EUR";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-US", {
      style: "currency",
      currency: getCurrency(),
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const earnings = industryData?.earnings || industryData?.data;
  const avgHourlyRate = earnings?.avgHourlyRate || 25;
  const avgMonthlyEarnings = earnings?.avgMonthlyEarnings || avgHourlyRate * 120; // ~30h/week
  const avgWeeklyBookings = earnings?.avgWeeklyBookings || 10;

  const locationDisplay = city || state || country;
  const demandLevel = demandStats?.demand?.demandLevel || "moderate";
  const waitlistCount = demandStats?.demand?.waitlistCount || 0;

  return (
    <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            {locale === "de" ? "Verdienstmöglichkeiten" : "Earning Potential"}
          </CardTitle>
          <Badge
            variant="outline"
            className={`text-xs ${
              industryData?.source === "PLATFORM"
                ? "border-green-500 text-green-700 bg-green-50"
                : "border-blue-500 text-blue-700 bg-blue-50"
            }`}
          >
            {industryData?.source === "PLATFORM" ? (
              <>
                <Sparkles className="h-3 w-3 mr-1" />
                {locale === "de" ? "Echtzeit-Daten" : "Real-time data"}
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3 mr-1" />
                {locale === "de" ? "Branchenschätzung" : "Industry estimate"}
              </>
            )}
          </Badge>
        </div>
        {locationDisplay && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {locationDisplay}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Earnings Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-white/70 text-center">
            <DollarSign className="h-5 w-5 mx-auto text-green-600 mb-1" />
            <p className="text-2xl font-bold text-green-700">
              {formatCurrency(avgHourlyRate)}
            </p>
            <p className="text-xs text-muted-foreground">
              {locale === "de" ? "Ø Stundensatz" : "Avg. hourly rate"}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-white/70 text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-emerald-600 mb-1" />
            <p className="text-2xl font-bold text-emerald-700">
              {formatCurrency(avgMonthlyEarnings)}
            </p>
            <p className="text-xs text-muted-foreground">
              {locale === "de" ? "Ø Monatlich" : "Avg. monthly"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-white/70 text-center">
            <Clock className="h-5 w-5 mx-auto text-blue-600 mb-1" />
            <p className="text-xl font-bold text-blue-700">
              {avgWeeklyBookings}
            </p>
            <p className="text-xs text-muted-foreground">
              {locale === "de" ? "Buchungen/Woche" : "Bookings/week"}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-white/70 text-center">
            <Users className="h-5 w-5 mx-auto text-purple-600 mb-1" />
            <p className="text-xl font-bold text-purple-700 capitalize">
              {demandLevel === "very_high" ? (
                <span className="text-green-600">
                  {locale === "de" ? "Sehr hoch" : "Very High"}
                </span>
              ) : demandLevel === "high" ? (
                <span className="text-green-500">
                  {locale === "de" ? "Hoch" : "High"}
                </span>
              ) : demandLevel === "moderate" ? (
                <span className="text-yellow-600">
                  {locale === "de" ? "Mittel" : "Moderate"}
                </span>
              ) : (
                <span className="text-gray-500">
                  {locale === "de" ? "Wachsend" : "Growing"}
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {locale === "de" ? "Nachfrage" : "Demand"}
            </p>
          </div>
        </div>

        {/* Real Demand Signal */}
        {waitlistCount > 0 && (
          <div className="p-3 rounded-lg bg-yellow-100 border border-yellow-300">
            <p className="text-sm text-yellow-800 font-medium text-center">
              {locale === "de"
                ? `${waitlistCount} Kunden warten auf einen Anbieter in deiner Nähe`
                : `${waitlistCount} customer${waitlistCount > 1 ? "s" : ""} waiting for a provider in your area`}
            </p>
          </div>
        )}

        {/* Data Source Disclaimer */}
        <p className="text-xs text-center text-muted-foreground">
          {industryData?.source === "PLATFORM" ? (
            locale === "de"
              ? "Basierend auf echten Servantana-Daten"
              : "Based on real Servantana data"
          ) : (
            locale === "de"
              ? "Basierend auf Branchenforschung und Marktdaten"
              : "Based on industry research and market data"
          )}
        </p>
      </CardContent>
    </Card>
  );
}

function IndustryStatsCardSkeleton() {
  return (
    <Card className="border-2 border-gray-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-4 w-32 mt-1" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-4 w-full" />
      </CardContent>
    </Card>
  );
}
