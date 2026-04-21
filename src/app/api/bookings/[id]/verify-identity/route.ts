import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/file-storage";
import { verifyIdentity } from "@/lib/ai/face-verification";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/bookings/[id]/verify-identity
 * Check verification status for a booking
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId } = await params;

    // Verify booking exists
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        customerId: true,
        workerId: true,
        status: true,
        workerVerification: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            selfieUrl: true,
            faceMatchScore: true,
            livenessScore: true,
            verified: true,
            status: true,
            failureReason: true,
            createdAt: true,
            verifiedAt: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only customer or worker can view verification status
    const isParticipant =
      session.user.id === booking.customerId ||
      session.user.id === booking.workerId;
    const isAdmin = session.user.role === "ADMIN";

    if (!isParticipant && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const latestVerification = booking.workerVerification[0] || null;

    return NextResponse.json({
      bookingId,
      bookingStatus: booking.status,
      verification: latestVerification,
      isVerified: latestVerification?.verified ?? false,
      verificationRequired: ["CONFIRMED", "IN_PROGRESS"].includes(booking.status),
    });
  } catch (error) {
    console.error("Error getting verification status:", error);
    return NextResponse.json(
      { error: "Failed to get verification status" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bookings/[id]/verify-identity
 * Upload selfie and verify worker identity
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId } = await params;

    // Verify booking exists and get worker profile
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        worker: {
          select: {
            id: true,
            avatar: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only the worker assigned to this booking can verify
    if (booking.workerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the assigned worker can verify identity" },
        { status: 403 }
      );
    }

    // Only allow verification for confirmed or in-progress bookings
    if (!["CONFIRMED", "IN_PROGRESS"].includes(booking.status)) {
      return NextResponse.json(
        { error: "Verification only allowed for confirmed or in-progress bookings" },
        { status: 400 }
      );
    }

    // Check if worker has a profile photo
    if (!booking.worker.avatar) {
      return NextResponse.json(
        { error: "Worker must have a profile photo for verification" },
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("selfie") as File | null;
    const latitude = formData.get("latitude") as string | null;
    const longitude = formData.get("longitude") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No selfie provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP" },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB for selfies)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB" },
        { status: 400 }
      );
    }

    // Convert File to Buffer and upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await uploadFile(buffer, `verification-${Date.now()}.jpg`, {
      folder: `servantana/verifications/${bookingId}`,
      resourceType: "image",
    });

    // Run AI verification
    let verificationResult;
    let status: "PENDING" | "PASSED" | "FAILED" | "MANUAL_REVIEW" = "PENDING";
    let failureReason: string | null = null;

    try {
      verificationResult = await verifyIdentity(
        uploadResult.url,
        booking.worker.avatar
      );

      // Determine status based on results
      if (verificationResult.overallVerified) {
        status = "PASSED";
      } else if (verificationResult.overallScore < 50) {
        status = "FAILED";
        const concerns = [
          ...verificationResult.faceMatch.concerns,
          ...verificationResult.liveness.concerns,
        ];
        failureReason =
          concerns.length > 0
            ? concerns.join("; ")
            : "Face match or liveness check failed";
      } else {
        // Score between 50-70: needs manual review
        status = "MANUAL_REVIEW";
        failureReason = "Verification uncertain, requires manual review";
      }
    } catch (aiError) {
      console.error("AI verification error:", aiError);
      // If AI fails, set to manual review
      status = "MANUAL_REVIEW";
      failureReason = "AI verification service error, requires manual review";
      verificationResult = {
        faceMatch: { matchScore: 0, isMatch: false, confidence: "low", analysis: "", concerns: [] },
        liveness: { livenessScore: 0, isLive: false, confidence: "low", analysis: "", concerns: [] },
        overallVerified: false,
        overallScore: 0,
      };
    }

    // Parse location if provided
    const parsedLatitude = latitude ? parseFloat(latitude) : null;
    const parsedLongitude = longitude ? parseFloat(longitude) : null;
    const locationVerified = parsedLatitude !== null && parsedLongitude !== null;

    // Create verification record
    const verification = await prisma.workerVerification.create({
      data: {
        workerId: session.user.id,
        bookingId,
        selfieUrl: uploadResult.url,
        selfiePublicId: uploadResult.publicId,
        faceMatchScore: verificationResult.faceMatch.matchScore,
        livenessScore: verificationResult.liveness.livenessScore,
        verified: verificationResult.overallVerified,
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        locationVerified,
        status,
        failureReason,
        verifiedAt: status === "PASSED" ? new Date() : null,
      },
    });

    // Return result
    return NextResponse.json({
      success: true,
      verification: {
        id: verification.id,
        status: verification.status,
        verified: verification.verified,
        faceMatchScore: verification.faceMatchScore,
        livenessScore: verification.livenessScore,
        locationVerified: verification.locationVerified,
        failureReason: verification.failureReason,
        createdAt: verification.createdAt,
      },
      analysis: {
        faceMatch: verificationResult.faceMatch,
        liveness: verificationResult.liveness,
        overallScore: verificationResult.overallScore,
      },
    });
  } catch (error) {
    console.error("Error verifying identity:", error);
    return NextResponse.json(
      { error: "Failed to verify identity" },
      { status: 500 }
    );
  }
}
