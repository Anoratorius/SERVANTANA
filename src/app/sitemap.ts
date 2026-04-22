import { MetadataRoute } from "next";
import { locales } from "@/i18n/config";

const BASE_URL = "https://servantana.com";

// Static pages that exist for all locales
const staticPages = [
  "", // home
  "/about",
  "/contact",
  "/careers",
  "/faq",
  "/press",
  "/terms",
  "/privacy",
  "/cookies",
  "/guarantee",
  "/search",
  "/categories",
  "/login",
  "/signup",
  "/forgot-password",
];

// Pages that require authentication (lower priority)
const authPages = [
  "/dashboard",
  "/dashboard/analytics",
  "/dashboard/calendar",
  "/dashboard/documents",
  "/dashboard/earnings",
  "/dashboard/notifications",
  "/dashboard/security",
  "/dashboard/settings",
  "/dashboard/subscription",
  "/bookings",
  "/favorites",
  "/messages",
  "/properties",
  "/invoices",
  "/support",
  "/support/disputes",
];

// AI feature pages
const aiPages = [
  "/ai",
  "/ai/chat",
  "/ai/estimate",
  "/ai/photo-analysis",
  "/ai/reviews",
  "/ai/schedule",
  "/ai/smart-match",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const sitemapEntries: MetadataRoute.Sitemap = [];
  const currentDate = new Date();

  // Add static pages for all locales
  for (const page of staticPages) {
    // English (default) - no locale prefix
    sitemapEntries.push({
      url: `${BASE_URL}${page}`,
      lastModified: currentDate,
      changeFrequency: page === "" ? "daily" : "weekly",
      priority: page === "" ? 1.0 : 0.8,
      alternates: {
        languages: Object.fromEntries(
          locales.map((locale) => [
            locale,
            locale === "en" ? `${BASE_URL}${page}` : `${BASE_URL}/${locale}${page}`,
          ])
        ),
      },
    });

    // Other locales
    for (const locale of locales) {
      if (locale === "en") continue;
      sitemapEntries.push({
        url: `${BASE_URL}/${locale}${page}`,
        lastModified: currentDate,
        changeFrequency: page === "" ? "daily" : "weekly",
        priority: page === "" ? 1.0 : 0.8,
        alternates: {
          languages: Object.fromEntries(
            locales.map((loc) => [
              loc,
              loc === "en" ? `${BASE_URL}${page}` : `${BASE_URL}/${loc}${page}`,
            ])
          ),
        },
      });
    }
  }

  // Add AI pages for all locales (medium priority)
  for (const page of aiPages) {
    sitemapEntries.push({
      url: `${BASE_URL}${page}`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.7,
      alternates: {
        languages: Object.fromEntries(
          locales.map((locale) => [
            locale,
            locale === "en" ? `${BASE_URL}${page}` : `${BASE_URL}/${locale}${page}`,
          ])
        ),
      },
    });

    for (const locale of locales) {
      if (locale === "en") continue;
      sitemapEntries.push({
        url: `${BASE_URL}/${locale}${page}`,
        lastModified: currentDate,
        changeFrequency: "weekly",
        priority: 0.7,
        alternates: {
          languages: Object.fromEntries(
            locales.map((loc) => [
              loc,
              loc === "en" ? `${BASE_URL}${page}` : `${BASE_URL}/${loc}${page}`,
            ])
          ),
        },
      });
    }
  }

  // Add auth-required pages (lower priority, still indexable)
  for (const page of authPages) {
    sitemapEntries.push({
      url: `${BASE_URL}${page}`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.5,
      alternates: {
        languages: Object.fromEntries(
          locales.map((locale) => [
            locale,
            locale === "en" ? `${BASE_URL}${page}` : `${BASE_URL}/${locale}${page}`,
          ])
        ),
      },
    });

    for (const locale of locales) {
      if (locale === "en") continue;
      sitemapEntries.push({
        url: `${BASE_URL}/${locale}${page}`,
        lastModified: currentDate,
        changeFrequency: "monthly",
        priority: 0.5,
        alternates: {
          languages: Object.fromEntries(
            locales.map((loc) => [
              loc,
              loc === "en" ? `${BASE_URL}${page}` : `${BASE_URL}/${loc}${page}`,
            ])
          ),
        },
      });
    }
  }

  return sitemapEntries;
}
