/**
 * AI Face Verification
 *
 * Uses Claude Vision to compare faces and detect liveness.
 * Ensures the worker arriving at a job matches their profile photo.
 */

import { getAnthropicClient, AI_MODEL } from "./anthropic";
import Anthropic from "@anthropic-ai/sdk";

export interface FaceComparisonResult {
  matchScore: number; // 0-100 similarity score
  isMatch: boolean; // true if score >= threshold
  confidence: string; // "high", "medium", "low"
  analysis: string; // Brief explanation
  concerns: string[]; // Any issues detected
}

export interface LivenessResult {
  livenessScore: number; // 0-100 liveness probability
  isLive: boolean; // true if appears to be a real person
  confidence: string; // "high", "medium", "low"
  analysis: string; // Brief explanation
  concerns: string[]; // Any issues detected (screen photo, printed image, etc.)
}

export interface VerificationResult {
  faceMatch: FaceComparisonResult;
  liveness: LivenessResult;
  overallVerified: boolean;
  overallScore: number; // Combined score 0-100
}

const FACE_COMPARISON_PROMPT = `You are an expert face recognition system for identity verification.
Your job is to compare two photos and determine if they show the same person.

IMPORTANT: Focus on facial features, not accessories or background.

COMPARISON CRITERIA:
- Facial structure (bone structure, face shape)
- Eye shape and spacing
- Nose shape and size
- Mouth and lip shape
- Ear shape (if visible)
- Distinctive features (moles, scars, etc.)

SCORING:
- 90-100: Definitely the same person (high confidence match)
- 70-89: Likely the same person (medium-high confidence)
- 50-69: Possibly the same person (medium confidence, needs review)
- 30-49: Unlikely the same person (low confidence)
- 0-29: Definitely different people (no match)

Do NOT penalize for:
- Different lighting or angles
- Different clothing/accessories
- Different hairstyles
- Facial hair changes
- Glasses on/off
- Aging (within reason)

Respond with JSON only.`;

const LIVENESS_DETECTION_PROMPT = `You are an expert liveness detection system.
Your job is to analyze a photo and determine if it's a real, live person or a fake.

DETECT THESE SPOOFING ATTEMPTS:
1. Photo of a screen (monitor, phone, tablet)
2. Printed photo being held up
3. Photo of a photo (photo-in-photo)
4. Digital manipulation or deepfakes
5. Masks or face overlays
6. 3D models or mannequins

SIGNS OF A REAL PHOTO:
- Natural lighting and shadows
- Realistic skin texture and pores
- Natural eye reflections (catchlights)
- Depth and dimensionality
- Natural background (not flat)
- Subtle imperfections
- No moire patterns or screen pixels
- No paper texture or edges

SIGNS OF A FAKE:
- Flat, 2D appearance
- Screen glare or pixels visible
- Paper edges or reflections
- Unnatural lighting
- Missing depth cues
- Artificial textures
- Color banding
- Watermarks or text overlays

SCORING:
- 90-100: Definitely a real, live person
- 70-89: Likely real (minor concerns)
- 50-69: Uncertain (needs manual review)
- 30-49: Likely fake (significant concerns)
- 0-29: Definitely fake/spoofed

Respond with JSON only.`;

/**
 * Compare two face images to determine if they're the same person
 */
export async function compareFaces(
  selfieUrl: string,
  profilePhotoUrl: string
): Promise<FaceComparisonResult> {
  const client = getAnthropicClient();

  const content: Array<{
    type: "image" | "text";
    source?: { type: "url"; url: string };
    text?: string;
  }> = [
    { type: "text", text: "SELFIE (photo to verify):" },
    { type: "image", source: { type: "url", url: selfieUrl } },
    { type: "text", text: "PROFILE PHOTO (reference):" },
    { type: "image", source: { type: "url", url: profilePhotoUrl } },
    {
      type: "text",
      text: `Compare these two photos and determine if they show the same person.

Return JSON in this exact format:
{
  "matchScore": <0-100 similarity score>,
  "isMatch": <true if score >= 70>,
  "confidence": "<high/medium/low>",
  "analysis": "<brief 1-2 sentence explanation>",
  "concerns": ["<list any concerns or issues>"]
}`,
    },
  ];

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 1024,
    system: FACE_COMPARISON_PROMPT,
    messages: [
      {
        role: "user",
        content: content as Anthropic.MessageCreateParams["messages"][0]["content"],
      },
    ],
  });

  // Parse response
  const textContent = response.content.find(
    (c: Anthropic.ContentBlock) => c.type === "text"
  );
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from AI");
  }

  // Extract JSON from response
  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse AI response as JSON");
  }

  const result = JSON.parse(jsonMatch[0]);

  return {
    matchScore: Math.max(0, Math.min(100, result.matchScore || 0)),
    isMatch: result.isMatch ?? result.matchScore >= 70,
    confidence: result.confidence || "medium",
    analysis: result.analysis || "Face comparison completed.",
    concerns: Array.isArray(result.concerns) ? result.concerns : [],
  };
}

/**
 * Detect if a selfie is a real, live person (not a photo of a photo/screen)
 */
export async function detectLiveness(selfieUrl: string): Promise<LivenessResult> {
  const client = getAnthropicClient();

  const content: Array<{
    type: "image" | "text";
    source?: { type: "url"; url: string };
    text?: string;
  }> = [
    { type: "text", text: "SELFIE TO ANALYZE:" },
    { type: "image", source: { type: "url", url: selfieUrl } },
    {
      type: "text",
      text: `Analyze this photo for liveness detection. Determine if this is a real, live person or a spoofing attempt (photo of a screen, printed photo, etc.).

Return JSON in this exact format:
{
  "livenessScore": <0-100 liveness probability>,
  "isLive": <true if score >= 70>,
  "confidence": "<high/medium/low>",
  "analysis": "<brief 1-2 sentence explanation>",
  "concerns": ["<list any spoofing indicators detected>"]
}`,
    },
  ];

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 1024,
    system: LIVENESS_DETECTION_PROMPT,
    messages: [
      {
        role: "user",
        content: content as Anthropic.MessageCreateParams["messages"][0]["content"],
      },
    ],
  });

  // Parse response
  const textContent = response.content.find(
    (c: Anthropic.ContentBlock) => c.type === "text"
  );
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from AI");
  }

  // Extract JSON from response
  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse AI response as JSON");
  }

  const result = JSON.parse(jsonMatch[0]);

  return {
    livenessScore: Math.max(0, Math.min(100, result.livenessScore || 0)),
    isLive: result.isLive ?? result.livenessScore >= 70,
    confidence: result.confidence || "medium",
    analysis: result.analysis || "Liveness detection completed.",
    concerns: Array.isArray(result.concerns) ? result.concerns : [],
  };
}

/**
 * Full verification: compare faces AND check liveness
 */
export async function verifyIdentity(
  selfieUrl: string,
  profilePhotoUrl: string
): Promise<VerificationResult> {
  // Run both checks in parallel for efficiency
  const [faceMatch, liveness] = await Promise.all([
    compareFaces(selfieUrl, profilePhotoUrl),
    detectLiveness(selfieUrl),
  ]);

  // Calculate overall score (weighted average)
  // Face match is more important (60%) than liveness (40%)
  const overallScore = Math.round(
    faceMatch.matchScore * 0.6 + liveness.livenessScore * 0.4
  );

  // Overall verification passes only if both checks pass
  const overallVerified = faceMatch.isMatch && liveness.isLive;

  return {
    faceMatch,
    liveness,
    overallVerified,
    overallScore,
  };
}
