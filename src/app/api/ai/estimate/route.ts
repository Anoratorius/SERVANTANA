import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAnthropicClient, AI_MODEL, SYSTEM_PROMPTS } from "@/lib/ai/anthropic";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

interface PriceEstimate {
  estimatedPrice: {
    low: number;
    mid: number;
    high: number;
    currency: string;
  };
  breakdown: {
    basePrice: number;
    sizeMultiplier: number;
    difficultyMultiplier: number;
    specialtyAddons: number;
  };
  spaceAnalysis: {
    estimatedSqMeters: number;
    roomCount: number;
    roomTypes: string[];
    condition: "clean" | "moderate" | "dirty" | "very_dirty";
    difficulty: number; // 1-10
  };
  timeEstimate: {
    minMinutes: number;
    maxMinutes: number;
    recommended: number;
  };
  specialRequirements: string[];
  confidence: number; // 0-100
  notes: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      imageUrls,
      serviceType = "cleaning",
      professionId,
      additionalInfo,
      userCurrency = "USD",
    } = await request.json();

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ error: "Image URLs are required" }, { status: 400 });
    }

    // Get market rate data
    const marketRates = await getMarketRates(professionId);

    const client = getAnthropicClient();

    // Build image content
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imageContent: any[] = imageUrls.slice(0, 5).map((url: string) => ({
      type: "image",
      source: {
        type: "url",
        url,
      },
    }));

    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPTS.priceEstimation,
      messages: [
        {
          role: "user",
          content: [
            ...imageContent,
            {
              type: "text",
              text: `Analyze these photos to estimate the price for a ${serviceType} service.

Market rates for reference:
- Average hourly rate: ${marketRates.avgHourlyRate} ${userCurrency}
- Rate range: ${marketRates.minRate} - ${marketRates.maxRate} ${userCurrency}

${additionalInfo ? `Additional context: ${additionalInfo}` : ""}

Return a JSON object with:
{
  "spaceAnalysis": {
    "estimatedSqMeters": (number),
    "roomCount": (number),
    "roomTypes": ["living room", "bedroom", etc.],
    "condition": "clean" | "moderate" | "dirty" | "very_dirty",
    "difficulty": (1-10)
  },
  "timeEstimate": {
    "minMinutes": (number),
    "maxMinutes": (number),
    "recommended": (number)
  },
  "priceFactors": {
    "sizeMultiplier": (0.5 to 2.0),
    "difficultyMultiplier": (0.8 to 1.5),
    "specialtyAddons": (extra cost for special requirements)
  },
  "specialRequirements": ["list of special cleaning/work needs"],
  "confidence": (0-100),
  "notes": "any important observations"
}

Return ONLY valid JSON.`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    let estimate: PriceEstimate;

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);

        // Calculate price based on analysis
        const basePrice = marketRates.avgHourlyRate * (parsed.timeEstimate.recommended / 60);
        const sizeAdjusted = basePrice * (parsed.priceFactors?.sizeMultiplier || 1);
        const difficultyAdjusted = sizeAdjusted * (parsed.priceFactors?.difficultyMultiplier || 1);
        const totalWithAddons = difficultyAdjusted + (parsed.priceFactors?.specialtyAddons || 0);

        // Calculate price range
        const lowPrice = totalWithAddons * 0.8;
        const highPrice = totalWithAddons * 1.3;

        estimate = {
          estimatedPrice: {
            low: Math.round(lowPrice),
            mid: Math.round(totalWithAddons),
            high: Math.round(highPrice),
            currency: userCurrency,
          },
          breakdown: {
            basePrice: Math.round(basePrice),
            sizeMultiplier: parsed.priceFactors?.sizeMultiplier || 1,
            difficultyMultiplier: parsed.priceFactors?.difficultyMultiplier || 1,
            specialtyAddons: parsed.priceFactors?.specialtyAddons || 0,
          },
          spaceAnalysis: parsed.spaceAnalysis,
          timeEstimate: parsed.timeEstimate,
          specialRequirements: parsed.specialRequirements || [],
          confidence: parsed.confidence || 70,
          notes: parsed.notes || "",
        };
      } catch {
        // Fallback estimate
        estimate = createFallbackEstimate(marketRates, userCurrency);
      }
    } else {
      estimate = createFallbackEstimate(marketRates, userCurrency);
    }

    // Get comparable bookings for reference
    const comparableBookings = await prisma.booking.findMany({
      where: {
        status: "COMPLETED",
        totalPrice: {
          gte: estimate.estimatedPrice.low * 0.7,
          lte: estimate.estimatedPrice.high * 1.3,
        },
      },
      select: {
        totalPrice: true,
        duration: true,
        service: { select: { name: true } },
      },
      take: 5,
      orderBy: { completedAt: "desc" },
    });

    return NextResponse.json({
      estimate,
      marketData: {
        avgHourlyRate: marketRates.avgHourlyRate,
        rateRange: { min: marketRates.minRate, max: marketRates.maxRate },
        currency: userCurrency,
      },
      comparableBookings: comparableBookings.map(b => ({
        price: b.totalPrice,
        duration: b.duration,
        service: b.service?.name,
      })),
    });
  } catch (error) {
    console.error("Price Estimate error:", error);
    return NextResponse.json(
      { error: "Failed to estimate price" },
      { status: 500 }
    );
  }
}

async function getMarketRates(professionId?: string): Promise<{
  avgHourlyRate: number;
  minRate: number;
  maxRate: number;
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    onboardingComplete: true,
    isActive: true,
    hourlyRate: { gt: 0 },
  };

  if (professionId) {
    where.professions = {
      some: { professionId },
    };
  }

  const workers = await prisma.workerProfile.findMany({
    where,
    select: { hourlyRate: true },
    take: 100,
  });

  if (workers.length === 0) {
    return { avgHourlyRate: 35, minRate: 20, maxRate: 60 };
  }

  const rates = workers.map(w => w.hourlyRate);
  const avgHourlyRate = rates.reduce((a, b) => a + b, 0) / rates.length;
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);

  return {
    avgHourlyRate: Math.round(avgHourlyRate),
    minRate: Math.round(minRate),
    maxRate: Math.round(maxRate),
  };
}

function createFallbackEstimate(
  marketRates: { avgHourlyRate: number; minRate: number; maxRate: number },
  currency: string
): PriceEstimate {
  const basePrice = marketRates.avgHourlyRate * 2; // 2 hours default

  return {
    estimatedPrice: {
      low: Math.round(basePrice * 0.8),
      mid: Math.round(basePrice),
      high: Math.round(basePrice * 1.3),
      currency,
    },
    breakdown: {
      basePrice: Math.round(basePrice),
      sizeMultiplier: 1,
      difficultyMultiplier: 1,
      specialtyAddons: 0,
    },
    spaceAnalysis: {
      estimatedSqMeters: 50,
      roomCount: 3,
      roomTypes: ["Unknown"],
      condition: "moderate",
      difficulty: 5,
    },
    timeEstimate: {
      minMinutes: 90,
      maxMinutes: 180,
      recommended: 120,
    },
    specialRequirements: [],
    confidence: 40,
    notes: "Estimate based on market averages. Upload clearer photos for more accurate pricing.",
  };
}
