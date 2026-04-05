import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile, deleteFile } from "@/lib/file-storage";

const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

// GET - Get current intro video
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "WORKER") {
      return NextResponse.json(
        { error: "Only cleaners can access this" },
        { status: 403 }
      );
    }

    const profile = await prisma.workerProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        introVideoUrl: true,
        introVideoId: true,
      },
    });

    return NextResponse.json({
      videoUrl: profile?.introVideoUrl || null,
      hasVideo: !!profile?.introVideoUrl,
    });
  } catch (error) {
    console.error("Error fetching video:", error);
    return NextResponse.json(
      { error: "Failed to fetch video" },
      { status: 500 }
    );
  }
}

// POST - Upload intro video
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "WORKER") {
      return NextResponse.json(
        { error: "Only cleaners can upload intro videos" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("video") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No video file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: MP4, WebM, MOV" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        { error: "Video too large. Maximum size is 50MB" },
        { status: 400 }
      );
    }

    // Get current profile to check for existing video
    const currentProfile = await prisma.workerProfile.findUnique({
      where: { userId: session.user.id },
      select: { introVideoId: true },
    });

    // Delete existing video if present
    if (currentProfile?.introVideoId) {
      try {
        await deleteFile(currentProfile.introVideoId);
      } catch (err) {
        console.error("Error deleting old video:", err);
        // Continue anyway
      }
    }

    // Upload new video
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadFile(buffer, file.name, {
      folder: "servantana/intro-videos",
      resourceType: "auto",
    });

    // Update profile with new video URL
    await prisma.workerProfile.update({
      where: { userId: session.user.id },
      data: {
        introVideoUrl: result.url,
        introVideoId: result.publicId,
      },
    });

    return NextResponse.json({
      message: "Video uploaded successfully",
      videoUrl: result.url,
    });
  } catch (error) {
    console.error("Error uploading video:", error);
    return NextResponse.json(
      { error: "Failed to upload video" },
      { status: 500 }
    );
  }
}

// DELETE - Remove intro video
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "WORKER") {
      return NextResponse.json(
        { error: "Only cleaners can delete intro videos" },
        { status: 403 }
      );
    }

    const profile = await prisma.workerProfile.findUnique({
      where: { userId: session.user.id },
      select: { introVideoId: true },
    });

    if (!profile?.introVideoId) {
      return NextResponse.json(
        { error: "No video to delete" },
        { status: 404 }
      );
    }

    // Delete from Cloudinary
    try {
      await deleteFile(profile.introVideoId);
    } catch (err) {
      console.error("Error deleting from Cloudinary:", err);
    }

    // Remove from database
    await prisma.workerProfile.update({
      where: { userId: session.user.id },
      data: {
        introVideoUrl: null,
        introVideoId: null,
      },
    });

    return NextResponse.json({
      message: "Video deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting video:", error);
    return NextResponse.json(
      { error: "Failed to delete video" },
      { status: 500 }
    );
  }
}
