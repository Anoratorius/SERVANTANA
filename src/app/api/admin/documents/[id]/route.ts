import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, rejectionNote } = body;

    if (!["verify", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use 'verify' or 'reject'" },
        { status: 400 }
      );
    }

    const document = await prisma.workerDocument.findUnique({
      where: { id },
      include: {
        worker: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    if (document.status !== "PENDING") {
      return NextResponse.json(
        { error: "Document has already been reviewed" },
        { status: 400 }
      );
    }

    const newStatus = action === "verify" ? "VERIFIED" : "REJECTED";

    const updatedDocument = await prisma.workerDocument.update({
      where: { id },
      data: {
        status: newStatus,
        verifiedById: session.user.id,
        verifiedAt: new Date(),
        rejectionNote: action === "reject" ? rejectionNote : null,
      },
    });

    // If verified, update worker profile verified status
    if (action === "verify") {
      // Check if all required documents are verified
      const verifiedDocs = await prisma.workerDocument.findMany({
        where: {
          workerId: document.workerId,
          status: "VERIFIED",
        },
      });

      // If at least one document is verified, mark worker as verified
      if (verifiedDocs.length > 0) {
        await prisma.workerProfile.updateMany({
          where: { userId: document.workerId },
          data: { verified: true },
        });
      }
    }

    // Audit log
    await writeAuditLog({
      action: action === "verify" ? "DOCUMENT_VERIFIED" : "DOCUMENT_REJECTED",
      actorId: session.user.id,
      targetId: document.id,
      targetType: "WorkerDocument",
      details: {
        workerId: document.workerId,
        workerEmail: document.worker.email,
        documentType: document.type,
        rejectionNote: action === "reject" ? rejectionNote : undefined,
      },
    });

    return NextResponse.json({
      document: updatedDocument,
      message: action === "verify" ? "Document verified" : "Document rejected",
    });
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json(
      { error: "Failed to update document" },
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
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const document = await prisma.workerDocument.findUnique({
      where: { id },
      include: {
        worker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
            workerProfile: {
              select: {
                verified: true,
                experienceYears: true,
              },
            },
          },
        },
        verifiedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}
