import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calculateRefundAmount,
  canCancel,
  canReschedule,
  getHoursUntilBooking,
  isRescheduleFree,
  FREE_CANCEL_HOURS,
  PARTIAL_REFUND_HOURS,
  PARTIAL_REFUND_PERCENT,
  MAX_RESCHEDULES,
  FREE_RESCHEDULE_HOURS,
  MIN_ADVANCE_HOURS,
} from "./booking-policies";

describe("Policy Constants", () => {
  it("has correct free cancellation window", () => {
    expect(FREE_CANCEL_HOURS).toBe(24);
  });

  it("has correct partial refund window", () => {
    expect(PARTIAL_REFUND_HOURS).toBe(12);
  });

  it("has correct partial refund percentage", () => {
    expect(PARTIAL_REFUND_PERCENT).toBe(50);
  });

  it("has correct max reschedules limit", () => {
    expect(MAX_RESCHEDULES).toBe(2);
  });

  it("has correct free reschedule window", () => {
    expect(FREE_RESCHEDULE_HOURS).toBe(24);
  });

  it("has correct minimum advance hours for reschedule", () => {
    expect(MIN_ADVANCE_HOURS).toBe(4);
  });
});

describe("calculateRefundAmount", () => {
  const totalPrice = 100;

  it("gives full refund when cancelled 24+ hours in advance", () => {
    const result = calculateRefundAmount(totalPrice, 25);
    expect(result.amount).toBe(100);
    expect(result.percent).toBe(100);
    expect(result.reason).toContain("Full refund");
  });

  it("gives full refund at exactly 24 hours", () => {
    const result = calculateRefundAmount(totalPrice, 24);
    expect(result.amount).toBe(100);
    expect(result.percent).toBe(100);
  });

  it("gives 50% refund when cancelled 12-24 hours in advance", () => {
    const result = calculateRefundAmount(totalPrice, 18);
    expect(result.amount).toBe(50);
    expect(result.percent).toBe(50);
    expect(result.reason).toContain("50% refund");
  });

  it("gives 50% refund at exactly 12 hours", () => {
    const result = calculateRefundAmount(totalPrice, 12);
    expect(result.amount).toBe(50);
    expect(result.percent).toBe(50);
  });

  it("gives no refund when cancelled less than 12 hours in advance", () => {
    const result = calculateRefundAmount(totalPrice, 6);
    expect(result.amount).toBe(0);
    expect(result.percent).toBe(0);
    expect(result.reason).toContain("No refund");
  });

  it("gives no refund when cancelled last minute", () => {
    const result = calculateRefundAmount(totalPrice, 1);
    expect(result.amount).toBe(0);
    expect(result.percent).toBe(0);
  });

  it("correctly calculates 50% for different prices", () => {
    expect(calculateRefundAmount(200, 15).amount).toBe(100);
    expect(calculateRefundAmount(50, 15).amount).toBe(25);
    expect(calculateRefundAmount(75, 15).amount).toBe(37.5);
  });
});

describe("canCancel", () => {
  it("allows cancellation of PENDING bookings", () => {
    const result = canCancel("PENDING", 5);
    expect(result.allowed).toBe(true);
  });

  it("allows cancellation of CONFIRMED bookings", () => {
    const result = canCancel("CONFIRMED", 5);
    expect(result.allowed).toBe(true);
  });

  it("prevents cancellation of COMPLETED bookings", () => {
    const result = canCancel("COMPLETED", 5);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("COMPLETED");
  });

  it("prevents cancellation of CANCELLED bookings", () => {
    const result = canCancel("CANCELLED", 5);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("CANCELLED");
  });

  it("prevents cancellation of IN_PROGRESS bookings", () => {
    const result = canCancel("IN_PROGRESS", 5);
    expect(result.allowed).toBe(false);
  });

  it("allows last-minute cancellations (affects refund, not ability)", () => {
    const result = canCancel("CONFIRMED", 0.5);
    expect(result.allowed).toBe(true);
  });
});

describe("canReschedule", () => {
  it("allows rescheduling PENDING bookings with sufficient notice", () => {
    const result = canReschedule("PENDING", 24, 0);
    expect(result.allowed).toBe(true);
  });

  it("allows rescheduling CONFIRMED bookings with sufficient notice", () => {
    const result = canReschedule("CONFIRMED", 24, 0);
    expect(result.allowed).toBe(true);
  });

  it("prevents rescheduling COMPLETED bookings", () => {
    const result = canReschedule("COMPLETED", 24, 0);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("COMPLETED");
  });

  it("prevents rescheduling when max limit reached", () => {
    const result = canReschedule("CONFIRMED", 24, 2);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Maximum reschedule limit");
  });

  it("prevents rescheduling less than 4 hours before booking", () => {
    const result = canReschedule("CONFIRMED", 3, 0);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("less than 4 hours");
  });

  it("allows rescheduling at exactly 4 hours", () => {
    const result = canReschedule("CONFIRMED", 4, 0);
    expect(result.allowed).toBe(true);
  });

  it("counts previous reschedules correctly", () => {
    expect(canReschedule("CONFIRMED", 24, 0).allowed).toBe(true);
    expect(canReschedule("CONFIRMED", 24, 1).allowed).toBe(true);
    expect(canReschedule("CONFIRMED", 24, 2).allowed).toBe(false);
    expect(canReschedule("CONFIRMED", 24, 3).allowed).toBe(false);
  });
});

describe("getHoursUntilBooking", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calculates hours correctly", () => {
    // Set current time to 10:00
    vi.setSystemTime(new Date("2024-01-15T10:00:00"));

    // Booking at 14:00 same day = 4 hours
    const result = getHoursUntilBooking(new Date("2024-01-15"), "14:00");
    expect(result).toBeCloseTo(4, 1);
  });

  it("handles next day bookings", () => {
    vi.setSystemTime(new Date("2024-01-15T10:00:00"));

    // Booking at 10:00 next day = 24 hours
    const result = getHoursUntilBooking(new Date("2024-01-16"), "10:00");
    expect(result).toBeCloseTo(24, 1);
  });

  it("returns 0 for past bookings", () => {
    vi.setSystemTime(new Date("2024-01-15T14:00:00"));

    // Booking was at 10:00 same day = past
    const result = getHoursUntilBooking(new Date("2024-01-15"), "10:00");
    expect(result).toBe(0);
  });

  it("handles minutes correctly", () => {
    vi.setSystemTime(new Date("2024-01-15T10:00:00"));

    // Booking at 10:30 = 0.5 hours
    const result = getHoursUntilBooking(new Date("2024-01-15"), "10:30");
    expect(result).toBeCloseTo(0.5, 1);
  });
});

describe("isRescheduleFree", () => {
  it("returns true when 24+ hours until booking", () => {
    expect(isRescheduleFree(24)).toBe(true);
    expect(isRescheduleFree(48)).toBe(true);
    expect(isRescheduleFree(100)).toBe(true);
  });

  it("returns false when less than 24 hours until booking", () => {
    expect(isRescheduleFree(23)).toBe(false);
    expect(isRescheduleFree(12)).toBe(false);
    expect(isRescheduleFree(1)).toBe(false);
  });

  it("returns true at exactly 24 hours", () => {
    expect(isRescheduleFree(24)).toBe(true);
  });
});
