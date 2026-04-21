/**
 * AI Quality Scoring
 *
 * Automatically scores work quality from before/after photos using Claude Vision.
 * Provides objective, consistent quality assessments.
 */

import { getAnthropicClient, AI_MODEL } from "./anthropic";
import Anthropic from "@anthropic-ai/sdk";

export interface QualityMetrics {
  cleanliness: number; // 1-10
  organization: number; // 1-10
  thoroughness: number; // 1-10
  attentionToDetail: number; // 1-10
}

export interface QualityAnalysis {
  beforeScore: number; // 1-10
  afterScore: number; // 1-10
  improvementScore: number; // 0-100 percentage improvement
  metrics: QualityMetrics;
  qualityPassed: boolean;
  concerns: string[];
  highlights: string[];
  aiAnalysis: string;
}

const QUALITY_SYSTEM_PROMPT = `You are an expert quality assessor for professional cleaning and home services.
Your job is to objectively evaluate before and after photos to score work quality.

SCORING CRITERIA (each 1-10 scale):
- Cleanliness (30% weight): Overall cleanliness level, removal of dirt/dust/stains
- Organization (15% weight): Items arranged properly, surfaces clear
- Thoroughness (20% weight): Corners, edges, hard-to-reach areas addressed
- Attention to Detail (15% weight): Small details handled, no areas missed
- Improvement (20% weight): How much better the after looks vs before

QUALITY THRESHOLD: Work passes if weighted average improvement >= 70%

Be objective and consistent. Look for:
- Visible dirt, dust, stains in before vs after
- Organization of items
- Streaks on glass/mirrors
- Missed spots or areas
- Overall transformation

Respond in JSON format only.`;

/**
 * Analyze before/after photos and generate quality score
 */
export async function analyzeQuality(
  beforePhotoUrls: string[],
  afterPhotoUrls: string[]
): Promise<QualityAnalysis> {
  if (beforePhotoUrls.length === 0 || afterPhotoUrls.length === 0) {
    throw new Error("Both before and after photos are required");
  }

  // Build message content with images
  const content: Array<{
    type: "image" | "text";
    source?: { type: "url"; url: string };
    text?: string;
  }> = [];

  // Add before photos
  content.push({ type: "text", text: "BEFORE PHOTOS:" });
  for (const url of beforePhotoUrls.slice(0, 3)) {
    content.push({
      type: "image",
      source: { type: "url", url },
    });
  }

  // Add after photos
  content.push({ type: "text", text: "AFTER PHOTOS:" });
  for (const url of afterPhotoUrls.slice(0, 3)) {
    content.push({
      type: "image",
      source: { type: "url", url },
    });
  }

  // Add analysis request
  content.push({
    type: "text",
    text: `Analyze these before and after photos and provide a quality assessment.

Return JSON in this exact format:
{
  "beforeScore": <1-10 overall cleanliness before>,
  "afterScore": <1-10 overall cleanliness after>,
  "metrics": {
    "cleanliness": <1-10>,
    "organization": <1-10>,
    "thoroughness": <1-10>,
    "attentionToDetail": <1-10>
  },
  "concerns": ["list of issues or areas that need improvement"],
  "highlights": ["list of things done particularly well"],
  "analysis": "Brief 2-3 sentence overall assessment"
}`,
  });

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 1024,
    system: QUALITY_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: content as Anthropic.MessageCreateParams["messages"][0]["content"],
      },
    ],
  });

  // Parse response
  const textContent = response.content.find((c: Anthropic.ContentBlock) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from AI");
  }

  // Extract JSON from response
  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse AI response as JSON");
  }

  const result = JSON.parse(jsonMatch[0]);

  // Calculate improvement score (0-100)
  const beforeScore = Math.max(1, Math.min(10, result.beforeScore || 5));
  const afterScore = Math.max(1, Math.min(10, result.afterScore || 5));

  // Improvement calculation: how much of the gap to perfect (10) was closed
  const maxPossibleImprovement = 10 - beforeScore;
  const actualImprovement = afterScore - beforeScore;
  const improvementScore =
    maxPossibleImprovement > 0
      ? Math.round((actualImprovement / maxPossibleImprovement) * 100)
      : afterScore >= 8
        ? 100
        : 50; // If already perfect before, score based on after

  // Ensure improvement score is 0-100
  const normalizedImprovement = Math.max(0, Math.min(100, improvementScore));

  // Calculate weighted quality score
  const metrics: QualityMetrics = {
    cleanliness: Math.max(1, Math.min(10, result.metrics?.cleanliness || 5)),
    organization: Math.max(1, Math.min(10, result.metrics?.organization || 5)),
    thoroughness: Math.max(1, Math.min(10, result.metrics?.thoroughness || 5)),
    attentionToDetail: Math.max(
      1,
      Math.min(10, result.metrics?.attentionToDetail || 5)
    ),
  };

  // Weighted average (normalized to 0-100)
  const weightedScore =
    metrics.cleanliness * 0.3 * 10 +
    metrics.organization * 0.15 * 10 +
    metrics.thoroughness * 0.2 * 10 +
    metrics.attentionToDetail * 0.15 * 10 +
    normalizedImprovement * 0.2;

  // Quality passes if weighted score >= 70
  const qualityPassed = weightedScore >= 70;

  return {
    beforeScore,
    afterScore,
    improvementScore: normalizedImprovement,
    metrics,
    qualityPassed,
    concerns: result.concerns || [],
    highlights: result.highlights || [],
    aiAnalysis: result.analysis || "Quality assessment completed.",
  };
}

/**
 * Calculate trust factor based on quality history
 */
export function calculateQualityTrustFactor(
  passCount: number,
  totalCount: number
): number {
  if (totalCount === 0) return 50; // Neutral for new workers

  const passRate = passCount / totalCount;

  // Weighted by sample size (more data = more confidence)
  const confidence = Math.min(1, totalCount / 20);

  // Base score from pass rate
  const baseScore = passRate * 100;

  // Blend with neutral (50) based on confidence
  return Math.round(baseScore * confidence + 50 * (1 - confidence));
}
