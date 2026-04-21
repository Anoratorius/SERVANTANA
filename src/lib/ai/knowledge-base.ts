/**
 * Servantana Platform Knowledge Base
 *
 * This module provides dynamic knowledge for the AI assistant.
 * Categories, professions, and cities are fetched from the database
 * so the AI always has up-to-date information.
 */

import { prisma } from "@/lib/prisma";

// Cache for dynamic data (refresh every 5 minutes)
let cachedKnowledgeBase: string | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Static platform information that doesn't change often.
 * Edit this to update policies, how booking works, etc.
 */
const STATIC_KNOWLEDGE = `
## What is Servantana?
Servantana is a professional services marketplace connecting customers with verified workers for home and personal services.

## How Booking Works
1. Customer searches for workers by service type and location
2. Customer views worker profiles (ratings, reviews, prices, availability)
3. Customer selects a worker and chooses a date/time
4. Customer pays securely through the platform
5. Worker confirms and completes the job
6. Customer can leave a review after completion

## Pricing
- Each worker sets their own hourly or flat rates
- Prices vary by service type, location, and worker experience
- Platform fee: Small service fee added at checkout
- Payment methods: Credit card, PayPal, bank transfer

## For Customers
- **Search**: Browse workers by location, service, rating, price
- **Book**: Schedule services at your preferred time
- **Pay**: Secure payment through the platform
- **Review**: Rate and review workers after service
- **Favorites**: Save preferred workers for quick rebooking
- **Messages**: Chat directly with workers
- **Guarantee**: Service satisfaction guarantee on eligible bookings

## For Workers
- **Profile**: Create a professional profile with photos and bio
- **Services**: List services offered with pricing
- **Availability**: Set working hours and calendar
- **Bookings**: Accept or decline booking requests
- **Earnings**: Track earnings and request payouts
- **Reviews**: Build reputation through customer reviews

## Service Guarantee
- Eligible bookings include satisfaction guarantee
- Issues can be reported within 48 hours of service
- Resolution options: Re-service, partial refund, or full refund
- Disputes are reviewed by our support team

## Cancellation Policy
- **Customer cancels 24+ hours before**: Full refund
- **Customer cancels within 24 hours**: 50% refund
- **Worker cancels**: Full refund, worker finds replacement if possible
- **No-show by worker**: Full refund + compensation credit

## Safety & Trust
- All workers complete identity verification
- Background checks available (marked with verified badge)
- Secure in-app messaging (no phone number sharing required)
- Secure payments (workers never see payment details)
- Review system helps maintain quality

## Contact & Support
- In-app support chat available
- Email support for complex issues
- Dispute resolution for booking problems
- Help center with FAQs

## Quick Tips for Customers
- Book in advance for better availability
- Read worker reviews before booking
- Be clear about job requirements in your booking notes
- Tip great workers through the app (100% goes to them)

## Quick Tips for Workers
- Keep your calendar up to date
- Respond to booking requests promptly
- Communicate clearly with customers
- Deliver quality work to earn great reviews
`;

/**
 * Fetch dynamic data from database
 */
async function fetchDynamicData(): Promise<{
  categories: Array<{ name: string; description: string | null; emoji: string }>;
  professions: Array<{ name: string; emoji: string; categoryName: string | null }>;
  cities: string[];
}> {
  try {
    // Fetch approved categories
    const categories = await prisma.category.findMany({
      where: { status: "APPROVED" },
      select: {
        name: true,
        description: true,
        emoji: true,
      },
      orderBy: { name: "asc" },
    });

    // Fetch active and approved professions
    const professions = await prisma.profession.findMany({
      where: {
        isActive: true,
        status: "APPROVED",
      },
      select: {
        name: true,
        emoji: true,
        category: {
          select: { name: true },
        },
      },
      orderBy: { name: "asc" },
    });

    // Fetch unique cities where workers are located
    const workerCities = await prisma.workerProfile.findMany({
      where: {
        city: { not: null },
        isVisible: true,
      },
      select: { city: true },
      distinct: ["city"],
    });

    const cities = workerCities
      .map((w) => w.city)
      .filter((city): city is string => city !== null)
      .sort();

    return {
      categories,
      professions: professions.map((p) => ({
        name: p.name,
        emoji: p.emoji,
        categoryName: p.category?.name || null,
      })),
      cities,
    };
  } catch (error) {
    console.error("Error fetching dynamic knowledge base data:", error);
    return {
      categories: [],
      professions: [],
      cities: [],
    };
  }
}

/**
 * Build the complete knowledge base with dynamic data
 */
export async function getKnowledgeBase(): Promise<string> {
  const now = Date.now();

  // Return cached version if still fresh
  if (cachedKnowledgeBase && now - cacheTimestamp < CACHE_DURATION) {
    return cachedKnowledgeBase;
  }

  // Fetch fresh data
  const { categories, professions, cities } = await fetchDynamicData();

  // Build categories section
  let categoriesSection = "## Available Service Categories\n";
  if (categories.length > 0) {
    categoriesSection += categories
      .map((c) => `- ${c.emoji} **${c.name}**${c.description ? `: ${c.description}` : ""}`)
      .join("\n");
  } else {
    categoriesSection += "- Various home and personal services available";
  }

  // Build professions section
  let professionsSection = "\n\n## Available Professions/Services\n";
  if (professions.length > 0) {
    professionsSection += "Workers on our platform offer these services:\n";
    professionsSection += professions
      .map((p) => `- ${p.emoji} ${p.name}${p.categoryName ? ` (${p.categoryName})` : ""}`)
      .join("\n");
  } else {
    professionsSection += "- Multiple professional services available";
  }

  // Build cities section
  let citiesSection = "\n\n## Cities Where Workers Are Available\n";
  if (cities.length > 0) {
    citiesSection += `Currently operating in: ${cities.join(", ")}`;
    citiesSection += `\n(${cities.length} cities and growing!)`;
  } else {
    citiesSection += "- Expanding to cities across Europe";
  }

  // Combine everything
  const fullKnowledgeBase = [
    "# Servantana Platform Knowledge Base",
    categoriesSection,
    professionsSection,
    citiesSection,
    STATIC_KNOWLEDGE,
  ].join("\n");

  // Update cache
  cachedKnowledgeBase = fullKnowledgeBase;
  cacheTimestamp = now;

  return fullKnowledgeBase;
}

/**
 * Legacy export for backwards compatibility
 * Use getKnowledgeBase() for dynamic data
 */
export const KNOWLEDGE_BASE = STATIC_KNOWLEDGE;
