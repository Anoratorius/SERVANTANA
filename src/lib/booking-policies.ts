/**
 * Booking Policies Configuration
 * Defines cancellation, reschedule, and refund rules
 */

// Cancellation Policy
export const FREE_CANCEL_HOURS = 24; // Free cancellation if 24+ hours before booking
export const PARTIAL_REFUND_HOURS = 12; // 50% refund if 12-24 hours before booking
export const PARTIAL_REFUND_PERCENT = 50; // Percentage refund for partial refund window
export const NO_REFUND_HOURS = 12; // No refund if less than 12 hours before booking

// Reschedule Policy
export const MAX_RESCHEDULES = 2; // Maximum reschedule requests per booking
export const FREE_RESCHEDULE_HOURS = 24; // Free reschedule if 24+ hours before booking
export const MIN_ADVANCE_HOURS = 4; // Minimum hours in advance to reschedule

// Calculate refund amount based on time until booking
export function calculateRefundAmount(
  totalPrice: number,
  hoursUntilBooking: number
): { amount: number; percent: number; reason: string } {
  if (hoursUntilBooking >= FREE_CANCEL_HOURS) {
    return {
      amount: totalPrice,
      percent: 100,
      reason: "Full refund - cancelled with sufficient notice",
    };
  }

  if (hoursUntilBooking >= PARTIAL_REFUND_HOURS) {
    const amount = totalPrice * (PARTIAL_REFUND_PERCENT / 100);
    return {
      amount,
      percent: PARTIAL_REFUND_PERCENT,
      reason: `${PARTIAL_REFUND_PERCENT}% refund - cancelled within ${FREE_CANCEL_HOURS} hours`,
    };
  }

  return {
    amount: 0,
    percent: 0,
    reason: `No refund - cancelled within ${PARTIAL_REFUND_HOURS} hours of booking`,
  };
}

// Check if booking can be cancelled
export function canCancel(
  bookingStatus: string,
  _hoursUntilBooking: number
): { allowed: boolean; reason?: string } {
  const cancelableStatuses = ["PENDING", "CONFIRMED"];

  if (!cancelableStatuses.includes(bookingStatus)) {
    return {
      allowed: false,
      reason: `Cannot cancel booking with status: ${bookingStatus}`,
    };
  }

  // Allow cancellation even at last minute, just affects refund
  return { allowed: true };
}

// Check if booking can be rescheduled
export function canReschedule(
  bookingStatus: string,
  hoursUntilBooking: number,
  currentRescheduleCount: number
): { allowed: boolean; reason?: string } {
  const reschedulableStatuses = ["PENDING", "CONFIRMED"];

  if (!reschedulableStatuses.includes(bookingStatus)) {
    return {
      allowed: false,
      reason: `Cannot reschedule booking with status: ${bookingStatus}`,
    };
  }

  if (currentRescheduleCount >= MAX_RESCHEDULES) {
    return {
      allowed: false,
      reason: `Maximum reschedule limit (${MAX_RESCHEDULES}) reached`,
    };
  }

  if (hoursUntilBooking < MIN_ADVANCE_HOURS) {
    return {
      allowed: false,
      reason: `Cannot reschedule less than ${MIN_ADVANCE_HOURS} hours before booking`,
    };
  }

  return { allowed: true };
}

// Calculate hours until booking
export function getHoursUntilBooking(
  scheduledDate: Date,
  scheduledTime: string
): number {
  const [hours, minutes] = scheduledTime.split(":").map(Number);
  const bookingDateTime = new Date(scheduledDate);
  bookingDateTime.setHours(hours, minutes, 0, 0);

  const now = new Date();
  const diffMs = bookingDateTime.getTime() - now.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60));
}

// Check if reschedule is free (no fee)
export function isRescheduleFree(hoursUntilBooking: number): boolean {
  return hoursUntilBooking >= FREE_RESCHEDULE_HOURS;
}
