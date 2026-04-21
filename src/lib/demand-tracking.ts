/**
 * Demand Tracking System
 *
 * Tracks customer demand signals to show workers real market data.
 * Never shows fake numbers - only actual platform data or industry estimates.
 */

import { DemandSignalType } from "@prisma/client";

export interface DemandSignalData {
  signalType: DemandSignalType;
  professionId?: string;
  searchQuery?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  requestedDate?: string;
  requestedTime?: string;
  wasMatched?: boolean;
  workerId?: string;
  joinedWaitlist?: boolean;
}

export interface DemandStats {
  period: {
    days: number;
    since: string;
  };
  demand: {
    totalSearches: number;
    unmatchedSearches: number;
    waitlistCount: number;
    matchRate: number;
    demandLevel: "low" | "moderate" | "high" | "very_high";
  };
  recentActivity: Array<{
    city: string;
    profession: string;
    timeAgo: string;
    type: DemandSignalType;
  }>;
  message: string;
}

export interface IndustryData {
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
}

/**
 * Track a demand signal (customer action)
 */
export async function trackDemand(data: DemandSignalData): Promise<{ success: boolean; id?: string }> {
  try {
    const response = await fetch("/api/demand/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to track demand");
    }

    return await response.json();
  } catch (error) {
    console.error("Error tracking demand:", error);
    return { success: false };
  }
}

/**
 * Track a search action
 */
export function trackSearch(params: {
  professionId?: string;
  searchQuery?: string;
  city?: string;
  state?: string;
  country?: string;
  wasMatched: boolean;
}) {
  return trackDemand({
    signalType: "SEARCH",
    ...params,
  });
}

/**
 * Track a booking attempt
 */
export function trackBookingAttempt(params: {
  professionId?: string;
  city?: string;
  country?: string;
  requestedDate?: string;
  requestedTime?: string;
  wasMatched: boolean;
  workerId?: string;
}) {
  return trackDemand({
    signalType: "BOOKING_ATTEMPT",
    ...params,
  });
}

/**
 * Get demand statistics for a location/profession
 */
export async function getDemandStats(params: {
  professionId?: string;
  city?: string;
  state?: string;
  country?: string;
  days?: number;
}): Promise<DemandStats | null> {
  try {
    const searchParams = new URLSearchParams();
    if (params.professionId) searchParams.set("professionId", params.professionId);
    if (params.city) searchParams.set("city", params.city);
    if (params.state) searchParams.set("state", params.state);
    if (params.country) searchParams.set("country", params.country);
    if (params.days) searchParams.set("days", params.days.toString());

    const response = await fetch(`/api/demand/stats?${searchParams.toString()}`);
    if (!response.ok) {
      throw new Error("Failed to get demand stats");
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting demand stats:", error);
    return null;
  }
}

/**
 * Get industry statistics for earnings potential
 */
export async function getIndustryStats(params: {
  professionId?: string;
  city?: string;
  state?: string;
  country?: string;
}): Promise<IndustryData | null> {
  try {
    const searchParams = new URLSearchParams();
    if (params.professionId) searchParams.set("professionId", params.professionId);
    if (params.city) searchParams.set("city", params.city);
    if (params.state) searchParams.set("state", params.state);
    if (params.country) searchParams.set("country", params.country);

    const response = await fetch(`/api/demand/industry?${searchParams.toString()}`);
    if (!response.ok) {
      throw new Error("Failed to get industry stats");
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting industry stats:", error);
    return null;
  }
}

/**
 * Join the waitlist for a service
 */
export async function joinWaitlist(params: {
  professionId: string;
  city?: string;
  state?: string;
  country: string;
  requestedDate?: string;
  requestedTime?: string;
}): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch("/api/demand/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to join waitlist");
    }

    return await response.json();
  } catch (error) {
    console.error("Error joining waitlist:", error);
    return { success: false, message: error instanceof Error ? error.message : "Failed to join waitlist" };
  }
}

/**
 * Format demand message for display
 * Always honest - uses real data or clearly labeled estimates
 */
export function formatDemandMessage(stats: DemandStats | null, industry: IndustryData | null): string {
  if (!stats && !industry) {
    return "Join thousands of service providers earning on Servantana";
  }

  const messages: string[] = [];

  // Real demand data
  if (stats && stats.demand.waitlistCount > 0) {
    messages.push(`${stats.demand.waitlistCount} customers actively waiting for providers`);
  } else if (stats && stats.demand.unmatchedSearches > 5) {
    messages.push(`${stats.demand.unmatchedSearches} recent searches couldn't find available providers`);
  }

  // Industry earnings
  if (industry?.earnings) {
    const avgHourly = industry.earnings.avgHourlyRate;
    const avgMonthly = industry.earnings.avgMonthlyEarnings;

    if (avgMonthly) {
      const source = industry.source === "PLATFORM" ? "on Servantana" : "in this industry";
      messages.push(`Providers earn ${avgMonthly.toLocaleString()}${getCurrencySymbol(industry.location.country)}/month ${source}`);
    } else if (avgHourly) {
      messages.push(`Average hourly rate: ${avgHourly}${getCurrencySymbol(industry.location.country)}`);
    }
  }

  return messages.join(" • ");
}

function getCurrencySymbol(country: string): string {
  const currencies: Record<string, string> = {
    DE: "€",
    AT: "€",
    FR: "€",
    ES: "€",
    IT: "€",
    CH: "CHF",
    US: "$",
    GB: "£",
    CA: "CA$",
    AU: "A$",
  };
  return currencies[country] || "€";
}
