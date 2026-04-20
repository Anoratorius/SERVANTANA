/**
 * User Validation Schemas
 * Zod schemas for user-related API inputs
 */

import { z } from "zod";

/**
 * Password requirements
 */
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password cannot exceed 128 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

/**
 * Email validation
 */
const emailSchema = z
  .string()
  .email("Invalid email address")
  .max(255, "Email cannot exceed 255 characters")
  .transform((val) => val.toLowerCase().trim());

/**
 * Phone validation (E.164 format)
 */
const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
  .optional()
  .nullable();

/**
 * User registration validation
 */
export const registerUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  phone: phoneSchema,
  role: z.enum(["CUSTOMER", "WORKER"]).default("CUSTOMER"),
  // Honeypot field - should be empty
  website: z.string().max(0).optional(),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;

/**
 * User login validation
 */
export const loginUserSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginUserInput = z.infer<typeof loginUserSchema>;

/**
 * Update user profile validation
 */
export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: phoneSchema,
  avatar: z.string().url("Invalid avatar URL").optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),
  notificationPreferences: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    sms: z.boolean().optional(),
  }).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Change password validation
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * Forgot password validation
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * Reset password validation
 */
export const resetPasswordSchema = z.object({
  email: emailSchema,
  code: z.string().length(3, "Code must be 3 digits"),
  password: passwordSchema,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Worker profile update validation
 */
export const updateWorkerProfileSchema = z.object({
  bio: z.string().max(2000).optional(),
  hourlyRate: z.number().min(1).max(10000).optional(),
  currency: z.string().length(3).optional(),
  experienceYears: z.number().min(0).max(60).optional(),
  availableNow: z.boolean().optional(),
  ecoFriendly: z.boolean().optional(),
  petFriendly: z.boolean().optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  serviceRadius: z.number().min(1).max(500).optional(), // km
  professionIds: z.array(z.string()).optional(),
  serviceIds: z.array(z.string()).optional(),
});

export type UpdateWorkerProfileInput = z.infer<typeof updateWorkerProfileSchema>;

/**
 * Contact form validation
 */
export const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: emailSchema,
  subject: z.string().min(1, "Subject is required").max(200),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
  // Honeypot
  company: z.string().max(0).optional(),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;

/**
 * Review creation validation
 */
export const createReviewSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

/**
 * Message sending validation
 */
export const sendMessageSchema = z.object({
  receiverId: z.string().min(1, "Receiver ID is required"),
  content: z.string().min(1, "Message content is required").max(2000),
  bookingId: z.string().optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
