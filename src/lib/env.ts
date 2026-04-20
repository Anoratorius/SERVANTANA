/**
 * Environment Variable Validation
 * Validates all required environment variables at startup using Zod
 * Fails fast if any required variables are missing
 */

import { z } from "zod";

const envSchema = z.object({
  // Database (Required)
  POSTGRES_PRISMA_URL: z.string().min(1, "POSTGRES_PRISMA_URL is required"),
  POSTGRES_URL_NON_POOLING: z.string().min(1, "POSTGRES_URL_NON_POOLING is required"),

  // Auth (Required)
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL").optional(),

  // Upstash Redis (Optional but recommended for production)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // AI - Anthropic (Optional)
  ANTHROPIC_API_KEY: z.string().optional(),

  // Email - Resend (Optional)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),

  // Stripe Payment (Optional)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // PayPal Payment (Optional)
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  NEXT_PUBLIC_PAYPAL_CLIENT_ID: z.string().optional(),

  // Coinbase Commerce (Optional)
  COINBASE_COMMERCE_API_KEY: z.string().optional(),
  COINBASE_COMMERCE_WEBHOOK_SECRET: z.string().optional(),

  // Push Notifications - VAPID (Optional)
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),

  // Cloudinary (Optional)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Cron job authentication (Optional)
  CRON_SECRET: z.string().optional(),

  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validated environment variables
 * Access via `env.VARIABLE_NAME`
 */
let validatedEnv: Env | null = null;

/**
 * Validate and return environment variables
 * Throws an error if validation fails
 */
export function validateEnv(): Env {
  if (validatedEnv) return validatedEnv;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([field, messages]) => `  ${field}: ${messages?.join(", ")}`)
      .join("\n");

    console.error("❌ Environment validation failed:\n" + errorMessages);

    // In production, throw to fail fast
    if (process.env.NODE_ENV === "production") {
      throw new Error("Environment validation failed. Check logs for details.");
    }

    // In development, log warning but continue
    console.warn("⚠️ Continuing with missing env vars (development mode)");
  }

  validatedEnv = result.success ? result.data : (process.env as unknown as Env);
  return validatedEnv;
}

/**
 * Get validated environment variables
 * Call validateEnv() at app startup, then use this for access
 */
export function getEnv(): Env {
  if (!validatedEnv) {
    return validateEnv();
  }
  return validatedEnv;
}

/**
 * Check if a feature is enabled based on env vars
 */
export const features = {
  get redis() {
    const env = getEnv();
    return !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
  },

  get email() {
    const env = getEnv();
    return !!env.RESEND_API_KEY;
  },

  get stripe() {
    const env = getEnv();
    return !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);
  },

  get paypal() {
    const env = getEnv();
    return !!(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);
  },

  get coinbase() {
    const env = getEnv();
    return !!env.COINBASE_COMMERCE_API_KEY;
  },

  get ai() {
    const env = getEnv();
    return !!env.ANTHROPIC_API_KEY;
  },

  get pushNotifications() {
    const env = getEnv();
    return !!(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
  },

  get cloudinary() {
    const env = getEnv();
    return !!(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
  },
};

// Validate on module load in production
if (process.env.NODE_ENV === "production") {
  validateEnv();
}
