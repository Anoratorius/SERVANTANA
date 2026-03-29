import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile, deleteFile, extractPublicId } from "@/lib/file-storage";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// GET - Get current avatar
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatar: true },
    });

    return NextResponse.json({
      avatarUrl: user?.avatar || null,
      hasAvatar: !!user?.avatar,
    });
  } catch (error) {
    console.error("Error fetching avatar:", error);
    return NextResponse.json(
      { error: "Failed to fetch avatar" },
      { status: 500 }
    );
  }
}

// POST - Upload avatar
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("avatar") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "Image too large. Maximum size is 5MB" },
        { status: 400 }
      );
    }

    // Get current user to check for existing avatar
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatar: true },
    });

    // Delete existing avatar if it's a Cloudinary URL
    if (currentUser?.avatar && currentUser.avatar.includes("cloudinary")) {
      try {
        const publicId = extractPublicId(currentUser.avatar);
        if (publicId) {
          await deleteFile(publicId);
        }
      } catch (err) {
        console.error("Error deleting old avatar:", err);
        // Continue anyway
      }
    }

    // Upload new avatar
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadFile(buffer, file.name, {
      folder: "servantana/avatars",
      resourceType: "auto",
    });

    // Update user with new avatar URL
    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatar: result.url },
    });

    return NextResponse.json({
      message: "Avatar uploaded successfully",
      avatarUrl: result.url,
    });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return NextResponse.json(
      { error: "Failed to upload avatar" },
      { status: 500 }
    );
  }
}

// DELETE - Remove avatar
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatar: true },
    });

    if (!user?.avatar) {
      return NextResponse.json(
        { error: "No avatar to delete" },
        { status: 404 }
      );
    }

    // Delete from Cloudinary if it's a Cloudinary URL
    if (user.avatar.includes("cloudinary")) {
      try {
        const publicId = extractPublicId(user.avatar);
        if (publicId) {
          await deleteFile(publicId);
        }
      } catch (err) {
        console.error("Error deleting from Cloudinary:", err);
      }
    }

    // Remove from database
    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatar: null },
    });

    return NextResponse.json({
      message: "Avatar deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting avatar:", error);
    return NextResponse.json(
      { error: "Failed to delete avatar" },
      { status: 500 }
    );
  }
}
