import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateAvailabilitySchema = z.object({
  availability: z.array(
    z.object({
      dayOfWeek: z.number().min(0).max(6),
      startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      isActive: z.boolean().optional(),
    })
  ),
});

// Get cleaner's availability
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        cleanerProfile: {
          include: { availability: true },
        },
      },
    });

    if (!user || user.role !== "CLEANER") {
      return NextResponse.json(
        { error: "Only cleaners can access this endpoint" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      availability: user.cleanerProfile?.availability || [],
    });
  } catch (error) {
    console.error("Error fetching availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}

// Update cleaner's availability
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { cleanerProfile: true },
    });

    if (!user || user.role !== "CLEANER") {
      return NextResponse.json(
        { error: "Only cleaners can update availability" },
        { status: 403 }
      );
    }

    if (!user.cleanerProfile) {
      return NextResponse.json(
        { error: "Please complete your profile first" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validationResult = updateAvailabilitySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { availability } = validationResult.data;
    const cleanerId = user.cleanerProfile.id;

    // Validate time ranges
    for (const slot of availability) {
      if (slot.startTime >= slot.endTime) {
        return NextResponse.json(
          { error: `Invalid time range for day ${slot.dayOfWeek}: start time must be before end time` },
          { status: 400 }
        );
      }
    }

    // Delete existing availability
    await prisma.availability.deleteMany({
      where: { cleanerId },
    });

    // Create new availability slots
    if (availability.length > 0) {
      await prisma.availability.createMany({
        data: availability.map((a) => ({
          cleanerId,
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime,
          isActive: a.isActive ?? true,
        })),
      });
    }

    // Fetch updated availability
    const updatedAvailability = await prisma.availability.findMany({
      where: { cleanerId },
      orderBy: { dayOfWeek: "asc" },
    });

    return NextResponse.json({
      message: "Availability updated successfully",
      availability: updatedAvailability,
    });
  } catch (error) {
    console.error("Error updating availability:", error);
    return NextResponse.json(
      { error: "Failed to update availability" },
      { status: 500 }
    );
  }
}
