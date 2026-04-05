import { NextRequest, NextResponse } from "next/server";
import { calculateFees, formatPrice, PLATFORM_FEES } from "@/lib/fees";
import { detectCurrencyFromHeaders, getCurrencyForCountry } from "@/lib/currency";

// GET: Calculate fees for a given booking price
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const priceParam = searchParams.get("price");
  const currencyParam = searchParams.get("currency");
  const countryParam = searchParams.get("country");

  if (!priceParam) {
    return NextResponse.json(
      { error: "Price parameter is required" },
      { status: 400 }
    );
  }

  const price = parseFloat(priceParam);
  if (isNaN(price) || price <= 0) {
    return NextResponse.json(
      { error: "Invalid price" },
      { status: 400 }
    );
  }

  // Determine currency
  let currency = currencyParam?.toUpperCase();
  let locale = "en-US";

  if (!currency) {
    if (countryParam) {
      const currencyConfig = getCurrencyForCountry(countryParam);
      currency = currencyConfig.code;
      locale = currencyConfig.locale;
    } else {
      const currencyConfig = detectCurrencyFromHeaders(request.headers);
      currency = currencyConfig.code;
      locale = currencyConfig.locale;
    }
  }

  // Calculate fees
  const fees = calculateFees(price, currency);

  // Format for display
  const formatted = {
    bookingPrice: formatPrice(fees.bookingPrice, currency, locale),
    customerPays: formatPrice(fees.customerTotal, currency, locale),
    customerFee: formatPrice(fees.customerFixedFee + fees.customerPercentageFee, currency, locale),
    workerReceives: formatPrice(fees.workerReceives, currency, locale),
    workerFee: formatPrice(fees.workerFixedFee + fees.workerPercentageFee, currency, locale),
    platformFee: formatPrice(fees.platformTotal, currency, locale),
  };

  return NextResponse.json({
    ...fees,
    formatted,
    feeStructure: {
      fixedFee: PLATFORM_FEES.FIXED_FEE_CENTS / 100,
      percentageFee: PLATFORM_FEES.PERCENTAGE_FEE * 100,
      description: `${formatPrice(PLATFORM_FEES.FIXED_FEE_CENTS / 100, currency, locale)} + ${PLATFORM_FEES.PERCENTAGE_FEE * 100}% service fee`,
    },
  });
}
