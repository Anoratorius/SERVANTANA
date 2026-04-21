import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile, UploadResult } from "@/lib/file-storage";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a worker
    if (session.user.role !== "WORKER") {
      return NextResponse.json(
        { error: "Only workers can upload documents" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;
    const expiresAt = formData.get("expiresAt") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const validTypes = [
      "GOVERNMENT_ID",
      "DRIVERS_LICENSE",
      "PASSPORT",
      "BUSINESS_LICENSE",
      "INSURANCE_CERTIFICATE",
      "BACKGROUND_CHECK",
      "OTHER",
    ];

    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid document type" },
        { status: 400 }
      );
    }

    // Validate file type (images and PDFs)
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, PDF" },
        { status: 400 }
      );
    }

    // Validate file size (max 20MB)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 20MB" },
        { status: 400 }
      );
    }

    // Check if document of this type already exists (pending or verified)
    const existingDoc = await prisma.workerDocument.findFirst({
      where: {
        workerId: session.user.id,
        type: type as "GOVERNMENT_ID" | "DRIVERS_LICENSE" | "PASSPORT" | "BUSINESS_LICENSE" | "INSURANCE_CERTIFICATE" | "BACKGROUND_CHECK" | "OTHER",
        status: { in: ["PENDING", "VERIFIED"] },
      },
    });

    if (existingDoc) {
      return NextResponse.json(
        {
          error: `You already have a ${existingDoc.status.toLowerCase()} ${type.replace(/_/g, " ").toLowerCase()} document`,
        },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary (use raw for PDFs)
    const resourceType = file.type === "application/pdf" ? "raw" : "image";
    let uploadResult: UploadResult;

    try {
      uploadResult = await uploadFile(buffer, file.name, {
        folder: `servantana/documents/${session.user.id}`,
        resourceType: resourceType as "image" | "raw",
      });
    } catch (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // Save to database
    const document = await prisma.workerDocument.create({
      data: {
        workerId: session.user.id,
        type: type as "GOVERNMENT_ID" | "DRIVERS_LICENSE" | "PASSPORT" | "BUSINESS_LICENSE" | "INSURANCE_CERTIFICATE" | "BACKGROUND_CHECK" | "OTHER",
        fileUrl: uploadResult.url,
        fileName: file.name,
        fileSize: uploadResult.size,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a worker
    if (session.user.role !== "WORKER") {
      return NextResponse.json(
        { error: "Only workers can view documents" },
        { status: 403 }
      );
    }

    const documents = await prisma.workerDocument.findMany({
      where: { workerId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        verifiedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Group by status
    const pending = documents.filter((d) => d.status === "PENDING");
    const verified = documents.filter((d) => d.status === "VERIFIED");
    const rejected = documents.filter((d) => d.status === "REJECTED");
    const expired = documents.filter((d) => d.status === "EXPIRED");

    return NextResponse.json({
      documents,
      counts: {
        pending: pending.length,
        verified: verified.length,
        rejected: rejected.length,
        expired: expired.length,
        total: documents.length,
      },
    });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}
