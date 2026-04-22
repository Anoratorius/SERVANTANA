import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Set environment
  environment: process.env.NODE_ENV,

  // Filter out common noise
  ignoreErrors: [
    // Expected errors
    "NEXT_NOT_FOUND",
    "NEXT_REDIRECT",
    // Auth errors (expected behavior)
    "Unauthorized",
    "401",
    // Validation errors (user input)
    "ZodError",
    // Rate limiting (expected)
    "Too many requests",
    "429",
  ],

  // Add context to errors
  beforeSend(event, hint) {
    const error = hint.originalException as Error | undefined;

    // Don't report expected errors
    if (error?.message?.includes("NEXT_NOT_FOUND")) {
      return null;
    }
    if (error?.message?.includes("NEXT_REDIRECT")) {
      return null;
    }

    return event;
  },
});
