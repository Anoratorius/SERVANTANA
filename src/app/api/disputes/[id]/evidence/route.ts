import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/file-storage";

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

    const dispute = await prisma.dispute.findUnique({
      where: { id },
    });

    if (!dispute) {
      return NextResponse.json(
        { error: "Dispute not found" },
        { status: 404 }
      );
    }

    // Check if dispute is still open
    if (dispute.status === "CLOSED" || dispute.status === "RESOLVED") {
      return NextResponse.json(
        { error: "Cannot add evidence to a closed dispute" },
        { status: 400 }
      );
    }

    // Only customer, worker, or admin can upload evidence
    const isCustomer = dispute.customerId === session.user.id;
    const isWorker = dispute.workerId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isCustomer && !isWorker && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const description = formData.get("description") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
      "video/mp4",
      "video/quicktime",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: images, PDFs, videos" },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB for videos, 10MB for others)
    const maxSize = file.type.startsWith("video/") ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary
    const resourceType = file.type.startsWith("video/")
      ? "auto"
      : file.type === "application/pdf"
      ? "raw"
      : "image";

    const uploadResult = await uploadFile(buffer, file.name, {
      folder: `servantana/disputes/${id}`,
      resourceType: resourceType as "image" | "raw" | "auto",
    });

    // Save to database
    const evidence = await prisma.disputeEvidence.create({
      data: {
        disputeId: id,
        uploaderId: session.user.id,
        fileUrl: uploadResult.url,
        fileName: file.name,
        fileType: file.type,
        fileSize: uploadResult.size,
        description,
      },
      include: {
        uploader: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({ evidence }, { status: 201 });
  } catch (error) {
    console.error("Error uploading evidence:", error);
    return NextResponse.json(
      { error: "Failed to upload evidence" },
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

    const dispute = await prisma.dispute.findUnique({
      where: { id },
    });

    if (!dispute) {
      return NextResponse.json(
        { error: "Dispute not found" },
        { status: 404 }
      );
    }

    // Only customer, worker, or admin can view evidence
    const isCustomer = dispute.customerId === session.user.id;
    const isWorker = dispute.workerId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isCustomer && !isWorker && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const evidence = await prisma.disputeEvidence.findMany({
      where: { disputeId: id },
      orderBy: { createdAt: "desc" },
      include: {
        uploader: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({ evidence });
  } catch (error) {
    console.error("Error fetching evidence:", error);
    return NextResponse.json(
      { error: "Failed to fetch evidence" },
      { status: 500 }
    );
  }
}
