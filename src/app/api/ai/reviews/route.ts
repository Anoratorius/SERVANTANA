import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAnthropicClient, AI_MODEL_FAST, SYSTEM_PROMPTS } from "@/lib/ai/anthropic";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

interface ReviewInsight {
  sentiment: {
    overall: "positive" | "neutral" | "negative";
    score: number; // -100 to 100
    confidence: number; // 0-100
  };
  themes: Array<{
    theme: string;
    sentiment: "positive" | "neutral" | "negative";
    mentions: number;
    examples: string[];
  }>;
  strengths: string[];
  weaknesses: string[];
  trustScore: number; // 0-100
  trustFactors: {
    authenticityScore: number;
    consistencyScore: number;
    detailScore: number;
    recencyScore: number;
  };
  summary: string;
  recommendations: string[];
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workerId, reviewIds, analyzeAll = false } = await request.json();

    if (!workerId) {
      return NextResponse.json({ error: "Worker ID is required" }, { status: 400 });
    }

    // Fetch reviews
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { revieweeId: workerId };
    if (reviewIds && reviewIds.length > 0 && !analyzeAll) {
      where.id = { in: reviewIds };
    }

    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: analyzeAll ? 100 : 50,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        reviewer: {
          select: {
            id: true,
            firstName: true,
            createdAt: true,
            bookingsAsCustomer: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (reviews.length === 0) {
      return NextResponse.json({
        insights: null,
        message: "No reviews found for analysis",
      });
    }

    // Calculate basic stats
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    const ratingsDistribution = [1, 2, 3, 4, 5].map(
      rating => reviews.filter(r => r.rating === rating).length
    );

    // Get AI analysis for review content
    const reviewsWithComments = reviews.filter(r => r.comment && r.comment.length > 10);

    let aiInsights: ReviewInsight | null = null;

    if (reviewsWithComments.length > 0) {
      const client = getAnthropicClient();

      const reviewTexts = reviewsWithComments.slice(0, 30).map(r => ({
        rating: r.rating,
        comment: r.comment,
        date: r.createdAt.toISOString().split("T")[0],
      }));

      const response = await client.messages.create({
        model: AI_MODEL_FAST,
        max_tokens: 2048,
        system: SYSTEM_PROMPTS.reviewAnalysis,
        messages: [
          {
            role: "user",
            content: `Analyze these ${reviewTexts.length} reviews for a service worker:

${JSON.stringify(reviewTexts, null, 2)}

Return a JSON object with:
{
  "sentiment": {
    "overall": "positive" | "neutral" | "negative",
    "score": (-100 to 100),
    "confidence": (0-100)
  },
  "themes": [
    {
      "theme": "theme name (e.g., punctuality, quality, communication)",
      "sentiment": "positive" | "neutral" | "negative",
      "mentions": (count),
      "examples": ["quote from review"]
    }
  ],
  "strengths": ["list of strengths"],
  "weaknesses": ["list of weaknesses"],
  "trustFactors": {
    "authenticityScore": (0-100, based on writing patterns),
    "consistencyScore": (0-100, based on theme consistency),
    "detailScore": (0-100, based on specificity),
    "recencyScore": (0-100, based on review dates)
  },
  "summary": "2-3 sentence summary",
  "recommendations": ["suggestions for improvement"]
}

Return ONLY valid JSON.`,
          },
        ],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);

          // Calculate trust score from factors
          const trustFactors = parsed.trustFactors || {
            authenticityScore: 70,
            consistencyScore: 70,
            detailScore: 70,
            recencyScore: 70,
          };

          // Add recency calculation
          const now = new Date();
          const recentReviews = reviews.filter(r => {
            const age = (now.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24);
            return age <= 90; // Last 90 days
          });
          trustFactors.recencyScore = Math.min(100, (recentReviews.length / reviews.length) * 100 + 30);

          // Calculate overall trust score
          const trustScore = Math.round(
            trustFactors.authenticityScore * 0.3 +
            trustFactors.consistencyScore * 0.25 +
            trustFactors.detailScore * 0.25 +
            trustFactors.recencyScore * 0.2
          );

          aiInsights = {
            ...parsed,
            trustScore,
            trustFactors,
          };
        } catch {
          console.error("Failed to parse AI response");
        }
      }
    }

    // Calculate reviewer credibility
    const reviewerStats = reviews.map(r => ({
      reviewerId: r.reviewer.id,
      accountAge: Math.floor((Date.now() - r.reviewer.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      totalBookings: r.reviewer.bookingsAsCustomer.length,
    }));

    const avgAccountAge = reviewerStats.reduce((sum, r) => sum + r.accountAge, 0) / reviewerStats.length;
    const avgBookings = reviewerStats.reduce((sum, r) => sum + r.totalBookings, 0) / reviewerStats.length;

    // Default insights if AI analysis failed
    if (!aiInsights) {
      const overallSentiment = avgRating >= 4 ? "positive" : avgRating >= 3 ? "neutral" : "negative";

      aiInsights = {
        sentiment: {
          overall: overallSentiment,
          score: Math.round((avgRating - 3) * 50),
          confidence: 60,
        },
        themes: [],
        strengths: avgRating >= 4 ? ["Generally positive feedback"] : [],
        weaknesses: avgRating < 3 ? ["Room for improvement"] : [],
        trustScore: Math.min(100, Math.round(avgAccountAge / 30 * 20 + avgBookings * 10 + 40)),
        trustFactors: {
          authenticityScore: 70,
          consistencyScore: 70,
          detailScore: 50,
          recencyScore: 70,
        },
        summary: `Worker has ${reviews.length} reviews with an average rating of ${avgRating.toFixed(1)} stars.`,
        recommendations: [],
      };
    }

    return NextResponse.json({
      insights: aiInsights,
      stats: {
        totalReviews: reviews.length,
        averageRating: Math.round(avgRating * 10) / 10,
        ratingsDistribution,
        reviewsWithComments: reviewsWithComments.length,
        avgReviewerAccountAge: Math.round(avgAccountAge),
        avgReviewerBookings: Math.round(avgBookings * 10) / 10,
      },
      recentReviews: reviews.slice(0, 5).map(r => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        date: r.createdAt.toISOString().split("T")[0],
        reviewerName: r.reviewer.firstName,
      })),
    });
  } catch (error) {
    console.error("Review Insights error:", error);
    return NextResponse.json(
      { error: "Failed to analyze reviews" },
      { status: 500 }
    );
  }
}
