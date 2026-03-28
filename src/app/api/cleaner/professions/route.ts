import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// GET - get current worker's professions
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workerProfile = await prisma.workerProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        professions: {
          include: {
            profession: {
              include: {
                category: {
                  select: { id: true, name: true, nameDE: true, emoji: true },
                },
              },
            },
          },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!workerProfile) {
      return NextResponse.json({ error: "Worker profile not found" }, { status: 404 });
    }

    return NextResponse.json(workerProfile.professions);
  } catch (error) {
    console.error("Failed to fetch worker professions:", error);
    return NextResponse.json(
      { error: "Failed to fetch professions" },
      { status: 500 }
    );
  }
}

const addProfessionSchema = z.object({
  professionId: z.string(),
  isPrimary: z.boolean().default(false),
  hourlyRate: z.number().positive().optional(),
});

// POST - add a profession to worker's profile
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = addProfessionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { professionId, isPrimary, hourlyRate } = validation.data;

    // Get worker profile
    const workerProfile = await prisma.workerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!workerProfile) {
      return NextResponse.json({ error: "Worker profile not found" }, { status: 404 });
    }

    // Check if profession exists and is approved
    const profession = await prisma.profession.findUnique({
      where: { id: professionId },
    });

    if (!profession) {
      return NextResponse.json({ error: "Profession not found" }, { status: 404 });
    }

    if (profession.status !== "APPROVED") {
      return NextResponse.json(
        { error: "This profession is not yet approved" },
        { status: 400 }
      );
    }

    // Check if already added
    const existing = await prisma.workerProfession.findUnique({
      where: {
        cleanerId_professionId: {
          cleanerId: workerProfile.id,
          professionId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Profession already added to your profile" },
        { status: 400 }
      );
    }

    // If setting as primary, unset other primaries
    if (isPrimary) {
      await prisma.workerProfession.updateMany({
        where: { cleanerId: workerProfile.id },
        data: { isPrimary: false },
      });
    }

    // Add profession to worker
    const workerProfession = await prisma.workerProfession.create({
      data: {
        cleanerId: workerProfile.id,
        professionId,
        isPrimary,
        hourlyRate,
      },
      include: {
        profession: {
          include: {
            category: {
              select: { id: true, name: true, nameDE: true, emoji: true },
            },
          },
        },
      },
    });

    return NextResponse.json(workerProfession, { status: 201 });
  } catch (error) {
    console.error("Failed to add profession:", error);
    return NextResponse.json(
      { error: "Failed to add profession" },
      { status: 500 }
    );
  }
}

const removeProfessionSchema = z.object({
  professionId: z.string(),
});

// DELETE - remove a profession from worker's profile
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = removeProfessionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { professionId } = validation.data;

    // Get worker profile
    const workerProfile = await prisma.workerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!workerProfile) {
      return NextResponse.json({ error: "Worker profile not found" }, { status: 404 });
    }

    await prisma.workerProfession.delete({
      where: {
        cleanerId_professionId: {
          cleanerId: workerProfile.id,
          professionId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove profession:", error);
    return NextResponse.json(
      { error: "Failed to remove profession" },
      { status: 500 }
    );
  }
}
