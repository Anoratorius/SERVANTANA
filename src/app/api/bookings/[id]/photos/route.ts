import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile, UploadResult } from "@/lib/file-storage";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only worker can upload photos
    if (booking.cleanerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the worker can upload photos" },
        { status: 403 }
      );
    }

    // Only allow photos for confirmed or in-progress bookings
    if (!["CONFIRMED", "IN_PROGRESS", "COMPLETED"].includes(booking.status)) {
      return NextResponse.json(
        { error: "Cannot upload photos for this booking status" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;
    const caption = formData.get("caption") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!type || !["before", "after"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be 'before' or 'after'" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, HEIC" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary
    let uploadResult: UploadResult;
    try {
      uploadResult = await uploadFile(buffer, file.name, {
        folder: `servantana/bookings/${id}`,
        resourceType: "image",
        generateThumbnail: true,
      });
    } catch (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // Save to database
    const photo = await prisma.bookingPhoto.create({
      data: {
        bookingId: id,
        uploaderId: session.user.id,
        type,
        fileUrl: uploadResult.url,
        thumbnailUrl: uploadResult.thumbnailUrl,
        fileName: file.name,
        fileSize: uploadResult.size,
        caption,
      },
    });

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    console.error("Error uploading photo:", error);
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only customer or worker can view photos
    if (
      booking.customerId !== session.user.id &&
      booking.cleanerId !== session.user.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const photos = await prisma.bookingPhoto.findMany({
      where: { bookingId: id },
      orderBy: [{ type: "asc" }, { createdAt: "asc" }],
      include: {
        uploader: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Group by type
    const beforePhotos = photos.filter((p) => p.type === "before");
    const afterPhotos = photos.filter((p) => p.type === "after");

    return NextResponse.json({
      photos,
      beforePhotos,
      afterPhotos,
      counts: {
        before: beforePhotos.length,
        after: afterPhotos.length,
        total: photos.length,
      },
    });
  } catch (error) {
    console.error("Error fetching photos:", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}
