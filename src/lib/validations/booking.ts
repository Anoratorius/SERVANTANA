/**
 * Booking Validation Schemas
 * Zod schemas for booking-related API inputs
 */

import { z } from "zod";

/**
 * Create booking request validation
 */
export const createBookingSchema = z.object({
  cleanerId: z.string().min(1, "Worker ID is required"),
  serviceId: z.string().optional(),
  scheduledDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    "Invalid date format"
  ),
  scheduledTime: z.string().regex(
    /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    "Time must be in HH:MM format"
  ),
  duration: z.number().min(15).max(480).optional().default(60),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  notes: z.string().max(2000).optional(),
  totalPrice: z.number().min(0).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

/**
 * Update booking status validation
 */
export const updateBookingStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
    "DISPUTED",
  ]),
  cancelReason: z.string().max(1000).optional(),
});

export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;

/**
 * Booking search/filter validation
 */
export const bookingQuerySchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
    "DISPUTED",
  ]).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
});

export type BookingQueryInput = z.infer<typeof bookingQuerySchema>;

/**
 * Booking reschedule validation
 */
export const rescheduleBookingSchema = z.object({
  scheduledDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    "Invalid date format"
  ),
  scheduledTime: z.string().regex(
    /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    "Time must be in HH:MM format"
  ),
  duration: z.number().min(15).max(480).optional(),
});

export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>;

/**
 * Create dispute validation
 */
export const createDisputeSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  type: z.enum([
    "QUALITY",
    "NO_SHOW",
    "LATE_ARRIVAL",
    "DAMAGE",
    "PRICING",
    "OTHER",
  ]),
  subject: z.string().min(5, "Subject must be at least 5 characters").max(200),
  description: z.string().min(20, "Description must be at least 20 characters").max(5000),
});

export type CreateDisputeInput = z.infer<typeof createDisputeSchema>;

/**
 * Add dispute message validation
 */
export const addDisputeMessageSchema = z.object({
  content: z.string().min(1, "Message content is required").max(5000),
});

export type AddDisputeMessageInput = z.infer<typeof addDisputeMessageSchema>;
