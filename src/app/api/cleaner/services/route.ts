import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateServicesSchema = z.object({
  services: z.array(
    z.object({
      serviceId: z.string(),
      customPrice: z.number().nullable().optional(),
      isActive: z.boolean().optional(),
    })
  ),
});

// Get all available services and cleaner's current services
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        workerProfile: {
          include: {
            services: {
              include: { service: true },
            },
          },
        },
      },
    });

    if (!user || user.role !== "CLEANER") {
      return NextResponse.json(
        { error: "Only cleaners can access this endpoint" },
        { status: 403 }
      );
    }

    // Get all available services
    const allServices = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      allServices,
      workerServices: user.workerProfile?.services || [],
    });
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}

// Update cleaner's services
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { workerProfile: true },
    });

    if (!user || user.role !== "CLEANER") {
      return NextResponse.json(
        { error: "Only cleaners can update services" },
        { status: 403 }
      );
    }

    if (!user.workerProfile) {
      return NextResponse.json(
        { error: "Please complete your profile first" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validationResult = updateServicesSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { services } = validationResult.data;
    const workerId = user.workerProfile.id;

    // Delete existing services
    await prisma.workerService.deleteMany({
      where: { workerId },
    });

    // Create new services
    if (services.length > 0) {
      await prisma.workerService.createMany({
        data: services.map((s) => ({
          workerId,
          serviceId: s.serviceId,
          customPrice: s.customPrice ?? null,
          isActive: s.isActive ?? true,
        })),
      });
    }

    // Fetch updated services
    const updatedServices = await prisma.workerService.findMany({
      where: { workerId },
      include: { service: true },
    });

    return NextResponse.json({
      message: "Services updated successfully",
      services: updatedServices,
    });
  } catch (error) {
    console.error("Error updating services:", error);
    return NextResponse.json(
      { error: "Failed to update services" },
      { status: 500 }
    );
  }
}
