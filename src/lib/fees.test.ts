import { describe, it, expect } from "vitest";
import {
  calculateFees,
  toStripeAmount,
  fromStripeAmount,
  formatPrice,
  PLATFORM_FEES,
} from "./fees";

describe("PLATFORM_FEES", () => {
  it("has correct fixed fee", () => {
    expect(PLATFORM_FEES.FIXED_FEE_CENTS).toBe(99);
  });

  it("has correct percentage fee", () => {
    expect(PLATFORM_FEES.PERCENTAGE_FEE).toBe(0.025);
  });
});

describe("calculateFees", () => {
  // New fee model:
  // - Customer: €0.99 fixed + 2.5% of booking price
  // - Worker: 15% of booking price (subscription-based, no fixed fee)

  it("calculates fees for a €50 booking", () => {
    const result = calculateFees(50, "EUR");

    // Customer fixed fee: €0.99
    expect(result.customerFixedFee).toBe(0.99);
    // Worker has no fixed fee in new model
    expect(result.workerFixedFee).toBe(0);

    // Customer percentage fee: 2.5% of 50 = €1.25
    expect(result.customerPercentageFee).toBe(1.25);
    // Worker percentage fee: 15% of 50 = €7.50
    expect(result.workerPercentageFee).toBe(7.5);

    // Customer pays: 50 + 0.99 + 1.25 = €52.24
    expect(result.customerTotal).toBe(52.24);

    // Worker receives: 50 - 7.50 = €42.50
    expect(result.workerReceives).toBe(42.5);

    // Platform total: 0.99 + 1.25 + 7.50 = €9.74
    expect(result.platformTotal).toBe(9.74);

    expect(result.currency).toBe("EUR");
  });

  it("calculates fees for a €100 booking", () => {
    const result = calculateFees(100, "EUR");

    // Customer percentage fee: 2.5% of 100 = €2.50
    expect(result.customerPercentageFee).toBe(2.5);

    // Customer pays: 100 + 0.99 + 2.50 = €103.49
    expect(result.customerTotal).toBe(103.49);

    // Worker receives: 100 - 15% = €85.00
    expect(result.workerReceives).toBe(85);
  });

  it("calculates fees for a small €20 booking", () => {
    const result = calculateFees(20, "EUR");

    // Customer percentage fee: 2.5% of 20 = €0.50
    expect(result.customerPercentageFee).toBe(0.5);

    // Customer pays: 20 + 0.99 + 0.50 = €21.49
    expect(result.customerTotal).toBe(21.49);
  });

  it("uses EUR as default currency", () => {
    const result = calculateFees(50);
    expect(result.currency).toBe("EUR");
  });

  it("includes booking price in result", () => {
    const result = calculateFees(75, "USD");
    expect(result.bookingPrice).toBe(75);
    expect(result.currency).toBe("USD");
  });

  it("handles large bookings correctly", () => {
    const result = calculateFees(1000, "EUR");

    // Customer percentage fee: 2.5% of 1000 = €25.00
    expect(result.customerPercentageFee).toBe(25);

    // Customer pays: 1000 + 0.99 + 25 = €1025.99
    expect(result.customerTotal).toBe(1025.99);

    // Worker receives: 1000 - 15% = €850.00
    expect(result.workerReceives).toBe(850);
  });

  it("maintains mathematical consistency", () => {
    const result = calculateFees(80, "EUR");

    // Customer total - booking price should equal customer fees
    const customerFees = result.customerFixedFee + result.customerPercentageFee;
    expect(result.customerTotal - result.bookingPrice).toBeCloseTo(customerFees, 2);

    // Booking price - worker fees should equal worker receives
    const workerFees = result.workerFixedFee + result.workerPercentageFee;
    expect(result.bookingPrice - workerFees).toBeCloseTo(result.workerReceives, 2);
  });
});

describe("toStripeAmount", () => {
  it("converts EUR to cents", () => {
    expect(toStripeAmount(50, "EUR")).toBe(5000);
    expect(toStripeAmount(50.5, "EUR")).toBe(5050);
    expect(toStripeAmount(50.99, "EUR")).toBe(5099);
  });

  it("converts USD to cents", () => {
    expect(toStripeAmount(100, "USD")).toBe(10000);
  });

  it("handles JPY (zero decimal currency)", () => {
    expect(toStripeAmount(5000, "JPY")).toBe(5000);
    expect(toStripeAmount(5000.5, "JPY")).toBe(5001);
  });

  it("handles KRW (zero decimal currency)", () => {
    expect(toStripeAmount(50000, "KRW")).toBe(50000);
  });

  it("handles VND (zero decimal currency)", () => {
    expect(toStripeAmount(500000, "VND")).toBe(500000);
  });

  it("rounds correctly", () => {
    expect(toStripeAmount(50.999, "EUR")).toBe(5100);
    expect(toStripeAmount(50.001, "EUR")).toBe(5000);
  });

  it("handles case insensitivity", () => {
    expect(toStripeAmount(5000, "jpy")).toBe(5000);
    expect(toStripeAmount(50, "eur")).toBe(5000);
  });
});

describe("fromStripeAmount", () => {
  it("converts cents to EUR", () => {
    expect(fromStripeAmount(5000, "EUR")).toBe(50);
    expect(fromStripeAmount(5050, "EUR")).toBe(50.5);
    expect(fromStripeAmount(5099, "EUR")).toBe(50.99);
  });

  it("converts cents to USD", () => {
    expect(fromStripeAmount(10000, "USD")).toBe(100);
  });

  it("handles JPY (zero decimal currency)", () => {
    expect(fromStripeAmount(5000, "JPY")).toBe(5000);
  });

  it("handles KRW (zero decimal currency)", () => {
    expect(fromStripeAmount(50000, "KRW")).toBe(50000);
  });

  it("is inverse of toStripeAmount", () => {
    const originalEUR = 50.75;
    const stripeAmountEUR = toStripeAmount(originalEUR, "EUR");
    expect(fromStripeAmount(stripeAmountEUR, "EUR")).toBe(originalEUR);

    const originalJPY = 5000;
    const stripeAmountJPY = toStripeAmount(originalJPY, "JPY");
    expect(fromStripeAmount(stripeAmountJPY, "JPY")).toBe(originalJPY);
  });
});

describe("formatPrice", () => {
  it("formats EUR correctly", () => {
    const result = formatPrice(50, "EUR");
    expect(result).toContain("50");
  });

  it("formats USD correctly", () => {
    const result = formatPrice(100, "USD");
    expect(result).toContain("$");
    expect(result).toContain("100");
  });

  it("formats with custom locale", () => {
    const result = formatPrice(50, "EUR", "de-DE");
    expect(result).toContain("€");
  });

  it("handles decimal places", () => {
    const result = formatPrice(50.99, "USD");
    expect(result).toContain("50.99");
  });
});
