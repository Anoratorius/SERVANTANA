import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().optional(),
  bio: z.string().max(1000).optional(),
  hourlyRate: z.number().min(1).max(1000).optional(),
  experienceYears: z.number().min(0).max(50).optional(),
  availableNow: z.boolean().optional(),
  ecoFriendly: z.boolean().optional(),
  petFriendly: z.boolean().optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  serviceRadius: z.number().min(1).max(100).optional(),
  timezone: z.string().max(100).optional(),
  paypalEmail: z.string().email().max(100).optional().or(z.literal("")),
});

// Get cleaner's own profile
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
          include: {
            services: {
              include: {
                service: true,
              },
            },
            availability: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role !== "CLEANER") {
      return NextResponse.json(
        { error: "Only cleaners can access this endpoint" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatar: user.avatar,
      },
      profile: user.cleanerProfile,
    });
  } catch (error) {
    console.error("Error fetching cleaner profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

// Update cleaner's profile
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
        { error: "Only cleaners can update their profile" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = updateProfileSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Update user fields
    const userUpdateData: Record<string, unknown> = {};
    if (data.firstName) userUpdateData.firstName = data.firstName;
    if (data.lastName) userUpdateData.lastName = data.lastName;
    if (data.phone !== undefined) userUpdateData.phone = data.phone || null;

    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: userUpdateData,
      });
    }

    // Update or create cleaner profile
    const profileData = {
      bio: data.bio,
      hourlyRate: data.hourlyRate,
      experienceYears: data.experienceYears,
      availableNow: data.availableNow,
      ecoFriendly: data.ecoFriendly,
      petFriendly: data.petFriendly,
      address: data.address,
      city: data.city,
      state: data.state,
      country: data.country,
      postalCode: data.postalCode,
      serviceRadius: data.serviceRadius,
      timezone: data.timezone,
      paypalEmail: data.paypalEmail || null,
    };

    // Remove undefined values
    const cleanProfileData = Object.fromEntries(
      Object.entries(profileData).filter(([, v]) => v !== undefined)
    );

    let profile;
    if (user.cleanerProfile) {
      profile = await prisma.cleanerProfile.update({
        where: { userId: session.user.id },
        data: cleanProfileData,
        include: {
          services: { include: { service: true } },
          availability: true,
        },
      });
    } else {
      profile = await prisma.cleanerProfile.create({
        data: {
          userId: session.user.id,
          hourlyRate: data.hourlyRate || 25,
          ...cleanProfileData,
        },
        include: {
          services: { include: { service: true } },
          availability: true,
        },
      });
    }

    return NextResponse.json({
      message: "Profile updated successfully",
      profile,
    });
  } catch (error) {
    console.error("Error updating cleaner profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
