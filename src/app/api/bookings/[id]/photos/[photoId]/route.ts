import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile, extractPublicId } from "@/lib/file-storage";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, photoId } = await params;

    const photo = await prisma.bookingPhoto.findUnique({
      where: { id: photoId },
      include: {
        booking: true,
      },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    if (photo.bookingId !== id) {
      return NextResponse.json(
        { error: "Photo does not belong to this booking" },
        { status: 400 }
      );
    }

    // Only the uploader (worker) can delete
    if (photo.uploaderId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the uploader can delete this photo" },
        { status: 403 }
      );
    }

    // Delete from Cloudinary
    const publicId = extractPublicId(photo.fileUrl);
    if (publicId) {
      await deleteFile(publicId);
    }

    // Delete from database
    await prisma.bookingPhoto.delete({
      where: { id: photoId },
    });

    return NextResponse.json({ message: "Photo deleted successfully" });
  } catch (error) {
    console.error("Error deleting photo:", error);
    return NextResponse.json(
      { error: "Failed to delete photo" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, photoId } = await params;

    const photo = await prisma.bookingPhoto.findUnique({
      where: { id: photoId },
      include: {
        booking: {
          select: {
            customerId: true,
            cleanerId: true,
          },
        },
        uploader: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    if (photo.bookingId !== id) {
      return NextResponse.json(
        { error: "Photo does not belong to this booking" },
        { status: 400 }
      );
    }

    // Only customer or worker can view
    if (
      photo.booking.customerId !== session.user.id &&
      photo.booking.cleanerId !== session.user.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ photo });
  } catch (error) {
    console.error("Error fetching photo:", error);
    return NextResponse.json(
      { error: "Failed to fetch photo" },
      { status: 500 }
    );
  }
}
