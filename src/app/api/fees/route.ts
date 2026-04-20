import { NextRequest, NextResponse } from "next/server";
import { calculateFees, calculateFeesWithTax, formatPrice, PLATFORM_FEES } from "@/lib/fees";
import { detectCurrencyFromHeaders, getCurrencyForCountry } from "@/lib/currency";
import { getVATRate, isEUCountry, getAllTaxRates } from "@/lib/tax";

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

  // Calculate fees (with tax if country provided)
  const includeTax = !!countryParam;
  const fees = includeTax
    ? calculateFeesWithTax(price, currency, countryParam!)
    : calculateFees(price, currency);

  // Format for display
  const formatted: Record<string, string> = {
    bookingPrice: formatPrice(fees.bookingPrice, currency, locale),
    customerPays: formatPrice(fees.customerTotal, currency, locale),
    customerFee: formatPrice(fees.customerFixedFee + fees.customerPercentageFee, currency, locale),
    workerReceives: formatPrice(fees.workerReceives, currency, locale),
    workerFee: formatPrice(fees.workerFixedFee + fees.workerPercentageFee, currency, locale),
    platformFee: formatPrice(fees.platformTotal, currency, locale),
  };

  // Add tax formatting if applicable
  if (includeTax && "taxAmount" in fees) {
    const feesWithTax = fees as unknown as { taxAmount: number; customerTotalWithTax: number };
    formatted.taxAmount = formatPrice(feesWithTax.taxAmount, currency, locale);
    formatted.customerPaysWithTax = formatPrice(feesWithTax.customerTotalWithTax, currency, locale);
  }

  // Build response
  const response: Record<string, unknown> = {
    ...fees,
    formatted,
    feeStructure: {
      fixedFee: PLATFORM_FEES.FIXED_FEE_CENTS / 100,
      percentageFee: PLATFORM_FEES.PERCENTAGE_FEE * 100,
      description: `${formatPrice(PLATFORM_FEES.FIXED_FEE_CENTS / 100, currency, locale)} + ${PLATFORM_FEES.PERCENTAGE_FEE * 100}% service fee`,
    },
  };

  // Add tax info if country provided
  if (countryParam) {
    response.taxInfo = {
      countryCode: countryParam.toUpperCase(),
      rate: getVATRate(countryParam),
      isEU: isEUCountry(countryParam),
    };
  }

  // If requesting all tax rates (for dropdowns)
  const { searchParams: sp } = new URL(request.url);
  if (sp.get("includeTaxRates") === "true") {
    response.allTaxRates = getAllTaxRates();
  }

  return NextResponse.json(response);
}
