import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Set explicit root to avoid lockfile detection issues
  turbopack: {
    root: __dirname,
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "date-fns",
      "recharts",
      "zod",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
    ],
  },
  // Optimize production builds
  productionBrowserSourceMaps: false,
  // Enable React strict mode for better development
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  // Security and caching headers for production
  async headers() {
    return [
      // Cache static assets for 1 year
      {
        source: "/:path*.(ico|svg|jpg|jpeg|png|gif|webp|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Security headers for all routes
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.paypal.com https://*.paypal.com https://js.stripe.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.stripe.com https://www.paypal.com https://*.paypal.com https://*.coinbase.com https://ipinfo.io https://ipwho.is https://en.wikipedia.org https://*.sentry.io https://*.ingest.sentry.io",
              "frame-src 'self' https://js.stripe.com https://www.paypal.com https://*.paypal.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  // Compress responses
  compress: true,
  // Production optimizations
  poweredByHeader: false,
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Suppress source map upload warnings
  silent: true,
  // Organization and project from Sentry
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Auth token for uploading source maps
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Hide source maps from users
  hideSourceMaps: true,
  // Disable Sentry telemetry
  telemetry: false,
  // Widen source map upload scope
  widenClientFileUpload: true,
  // Tunnel route for ad-blockers
  tunnelRoute: "/monitoring",
  // Disable logger for cleaner output
  disableLogger: true,
  // Auto-instrument for request data
  automaticVercelMonitors: true,
};

export default withSentryConfig(withNextIntl(nextConfig), sentryWebpackPluginOptions);
