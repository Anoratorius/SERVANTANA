import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay for debugging
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Set environment
  environment: process.env.NODE_ENV,

  // Filter out common noise
  ignoreErrors: [
    // Browser extensions
    "top.GLOBALS",
    "canvas.contentDocument",
    "MyApp_RemoveAllHighlights",
    "atomicFindClose",
    // Network errors
    "Network request failed",
    "Failed to fetch",
    "Load failed",
    "NetworkError",
    // User aborts
    "AbortError",
    "The operation was aborted",
    // Third-party errors
    "fb_xd_fragment",
    "Script error.",
    // Safari quirks
    "ResizeObserver loop",
    // User navigation
    "cancelled",
  ],

  // Don't report errors from these URLs
  denyUrls: [
    // Chrome extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    // Firefox extensions
    /^moz-extension:\/\//i,
    // Safari extensions
    /^safari-extension:\/\//i,
    // Analytics
    /google-analytics\.com/i,
    /googletagmanager\.com/i,
  ],

  // Add helpful context
  beforeSend(event, hint) {
    // Skip reporting certain errors
    const error = hint.originalException as Error | undefined;
    if (error?.message?.includes("401") || error?.message?.includes("Unauthorized")) {
      return null; // Don't report auth errors
    }
    return event;
  },

  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
});
