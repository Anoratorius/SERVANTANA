import { describe, it, expect } from "vitest";
import { z } from "zod";

// Common validation schemas (mirroring app schemas)
const emailSchema = z.string().email("Invalid email format");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[0-9]/, "Password must contain a number");

const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format");

const bookingSchema = z.object({
  workerId: z.string().uuid("Invalid worker ID"),
  serviceId: z.string().uuid("Invalid service ID"),
  scheduledDate: z.string().datetime("Invalid date format"),
  duration: z.number().min(1).max(12),
  notes: z.string().max(500).optional(),
});

describe("Email Validation", () => {
  it("should accept valid emails", () => {
    const validEmails = [
      "test@example.com",
      "user.name@domain.org",
      "user+tag@example.co.uk",
    ];

    validEmails.forEach((email) => {
      expect(() => emailSchema.parse(email)).not.toThrow();
    });
  });

  it("should reject invalid emails", () => {
    const invalidEmails = [
      "notanemail",
      "@nodomain.com",
      "missing@.com",
      "spaces in@email.com",
    ];

    invalidEmails.forEach((email) => {
      expect(() => emailSchema.parse(email)).toThrow();
    });
  });
});

describe("Password Validation", () => {
  it("should accept strong passwords", () => {
    const validPasswords = [
      "Password123",
      "SecurePass1",
      "MyP4ssw0rd!",
    ];

    validPasswords.forEach((password) => {
      expect(() => passwordSchema.parse(password)).not.toThrow();
    });
  });

  it("should reject weak passwords", () => {
    const weakPasswords = [
      "short1A",           // Too short
      "nouppercase123",    // No uppercase
      "NOLOWERCASE123",    // No lowercase
      "NoNumbers!",        // No numbers
    ];

    weakPasswords.forEach((password) => {
      expect(() => passwordSchema.parse(password)).toThrow();
    });
  });
});

describe("Phone Validation", () => {
  it("should accept valid phone numbers", () => {
    const validPhones = [
      "+14155551234",
      "+442071234567",
      "14155551234",
    ];

    validPhones.forEach((phone) => {
      expect(() => phoneSchema.parse(phone)).not.toThrow();
    });
  });

  it("should reject invalid phone numbers", () => {
    const invalidPhones = [
      "abc123",           // Contains letters
      "phone-number",     // All letters
      "",                 // Empty
      "++1234567890",     // Double plus
    ];

    invalidPhones.forEach((phone) => {
      expect(() => phoneSchema.parse(phone)).toThrow();
    });
  });
});

describe("Booking Validation", () => {
  const validBooking = {
    workerId: "550e8400-e29b-41d4-a716-446655440000",
    serviceId: "550e8400-e29b-41d4-a716-446655440001",
    scheduledDate: "2024-12-25T10:00:00Z",
    duration: 2,
    notes: "Please bring eco-friendly supplies",
  };

  it("should accept valid booking data", () => {
    expect(() => bookingSchema.parse(validBooking)).not.toThrow();
  });

  it("should accept booking without optional notes", () => {
    const bookingWithoutNotes = { ...validBooking };
    delete (bookingWithoutNotes as Record<string, unknown>).notes;
    expect(() => bookingSchema.parse(bookingWithoutNotes)).not.toThrow();
  });

  it("should reject invalid worker ID", () => {
    const invalidBooking = { ...validBooking, workerId: "not-a-uuid" };
    expect(() => bookingSchema.parse(invalidBooking)).toThrow();
  });

  it("should reject invalid duration", () => {
    const tooShort = { ...validBooking, duration: 0 };
    const tooLong = { ...validBooking, duration: 15 };

    expect(() => bookingSchema.parse(tooShort)).toThrow();
    expect(() => bookingSchema.parse(tooLong)).toThrow();
  });

  it("should reject notes that are too long", () => {
    const longNotes = { ...validBooking, notes: "a".repeat(501) };
    expect(() => bookingSchema.parse(longNotes)).toThrow();
  });
});
