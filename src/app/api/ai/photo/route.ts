import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAnthropicClient, AI_MODEL, SYSTEM_PROMPTS } from "@/lib/ai/anthropic";

export const maxDuration = 60;

interface PhotoAnalysisResult {
  cleanlinessScore: number; // 1-10
  overallCondition: "excellent" | "good" | "fair" | "poor";
  areasOfConcern: string[];
  positiveAspects: string[];
  jobComplexity: "easy" | "medium" | "hard";
  estimatedTime: number; // in minutes
  recommendations: string[];
  confidence: number; // 0-100
}

interface BeforeAfterComparison {
  improvementScore: number; // 0-100
  beforeScore: number;
  afterScore: number;
  improvements: string[];
  remainingIssues: string[];
  qualityVerified: boolean;
  verificationNotes: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { imageUrls, analysisType = "single", bookingId } = await request.json();

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ error: "Image URLs are required" }, { status: 400 });
    }

    const client = getAnthropicClient();

    if (analysisType === "before_after" && imageUrls.length >= 2) {
      // Before/After comparison
      const result = await analyzeBeforeAfter(client, imageUrls);
      return NextResponse.json({
        type: "before_after",
        comparison: result,
        bookingId,
      });
    } else {
      // Single photo or multiple photos analysis
      const results = await Promise.all(
        imageUrls.slice(0, 5).map((url: string) => analyzeSinglePhoto(client, url))
      );

      // Aggregate results if multiple photos
      const aggregated = aggregateResults(results);

      return NextResponse.json({
        type: "analysis",
        photos: results,
        summary: aggregated,
        bookingId,
      });
    }
  } catch (error) {
    console.error("Photo Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze photos" },
      { status: 500 }
    );
  }
}

async function analyzeSinglePhoto(
  client: ReturnType<typeof getAnthropicClient>,
  imageUrl: string
): Promise<PhotoAnalysisResult> {
  try {
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPTS.photoAnalysis,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "url",
                url: imageUrl,
              },
            },
            {
              type: "text",
              text: `Analyze this photo of a space for cleanliness and condition.

Return a JSON object with:
{
  "cleanlinessScore": (1-10),
  "overallCondition": "excellent" | "good" | "fair" | "poor",
  "areasOfConcern": ["list of specific issues"],
  "positiveAspects": ["list of positive observations"],
  "jobComplexity": "easy" | "medium" | "hard",
  "estimatedTime": (minutes to clean/fix),
  "recommendations": ["list of recommendations"],
  "confidence": (0-100)
}

Return ONLY valid JSON, no other text.`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as PhotoAnalysisResult;
    }

    // Default response if parsing fails
    return {
      cleanlinessScore: 5,
      overallCondition: "fair",
      areasOfConcern: ["Unable to analyze image properly"],
      positiveAspects: [],
      jobComplexity: "medium",
      estimatedTime: 60,
      recommendations: ["Manual inspection recommended"],
      confidence: 30,
    };
  } catch (error) {
    console.error("Single photo analysis error:", error);
    return {
      cleanlinessScore: 0,
      overallCondition: "poor",
      areasOfConcern: ["Analysis failed"],
      positiveAspects: [],
      jobComplexity: "medium",
      estimatedTime: 0,
      recommendations: ["Please try again"],
      confidence: 0,
    };
  }
}

async function analyzeBeforeAfter(
  client: ReturnType<typeof getAnthropicClient>,
  imageUrls: string[]
): Promise<BeforeAfterComparison> {
  try {
    const [beforeUrl, afterUrl] = imageUrls;

    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPTS.photoAnalysis,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Compare these two photos. The first is BEFORE service, the second is AFTER service.",
            },
            {
              type: "image",
              source: {
                type: "url",
                url: beforeUrl,
              },
            },
            {
              type: "image",
              source: {
                type: "url",
                url: afterUrl,
              },
            },
            {
              type: "text",
              text: `Analyze the improvement between before and after photos.

Return a JSON object with:
{
  "improvementScore": (0-100, how much improvement),
  "beforeScore": (1-10 cleanliness),
  "afterScore": (1-10 cleanliness),
  "improvements": ["list of visible improvements"],
  "remainingIssues": ["any issues still visible after"],
  "qualityVerified": (true if service was done well, false otherwise),
  "verificationNotes": "explanation of quality assessment"
}

Return ONLY valid JSON, no other text.`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as BeforeAfterComparison;
    }

    return {
      improvementScore: 50,
      beforeScore: 4,
      afterScore: 7,
      improvements: ["Unable to determine improvements"],
      remainingIssues: [],
      qualityVerified: false,
      verificationNotes: "Analysis could not be completed",
    };
  } catch (error) {
    console.error("Before/After analysis error:", error);
    return {
      improvementScore: 0,
      beforeScore: 0,
      afterScore: 0,
      improvements: [],
      remainingIssues: ["Analysis failed"],
      qualityVerified: false,
      verificationNotes: "Error during analysis",
    };
  }
}

function aggregateResults(results: PhotoAnalysisResult[]): {
  averageCleanlinessScore: number;
  overallCondition: string;
  allConcerns: string[];
  allPositives: string[];
  averageJobComplexity: string;
  totalEstimatedTime: number;
  averageConfidence: number;
} {
  const validResults = results.filter(r => r.confidence > 0);

  if (validResults.length === 0) {
    return {
      averageCleanlinessScore: 0,
      overallCondition: "unknown",
      allConcerns: [],
      allPositives: [],
      averageJobComplexity: "medium",
      totalEstimatedTime: 0,
      averageConfidence: 0,
    };
  }

  const avgCleanliness = validResults.reduce((sum, r) => sum + r.cleanlinessScore, 0) / validResults.length;
  const avgConfidence = validResults.reduce((sum, r) => sum + r.confidence, 0) / validResults.length;
  const totalTime = validResults.reduce((sum, r) => sum + r.estimatedTime, 0);

  const allConcerns = [...new Set(validResults.flatMap(r => r.areasOfConcern))];
  const allPositives = [...new Set(validResults.flatMap(r => r.positiveAspects))];

  // Determine overall complexity
  const complexityScores = { easy: 1, medium: 2, hard: 3 };
  const avgComplexity = validResults.reduce((sum, r) => sum + complexityScores[r.jobComplexity], 0) / validResults.length;
  const overallComplexity = avgComplexity < 1.5 ? "easy" : avgComplexity < 2.5 ? "medium" : "hard";

  // Determine overall condition
  let overallCondition = "fair";
  if (avgCleanliness >= 8) overallCondition = "excellent";
  else if (avgCleanliness >= 6) overallCondition = "good";
  else if (avgCleanliness >= 4) overallCondition = "fair";
  else overallCondition = "poor";

  return {
    averageCleanlinessScore: Math.round(avgCleanliness * 10) / 10,
    overallCondition,
    allConcerns,
    allPositives,
    averageJobComplexity: overallComplexity,
    totalEstimatedTime: totalTime,
    averageConfidence: Math.round(avgConfidence),
  };
}
