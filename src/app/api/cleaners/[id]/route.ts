import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cleaner = await prisma.user.findUnique({
      where: {
        id,
        role: "CLEANER",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        createdAt: true,
        cleanerProfile: {
          select: {
            id: true,
            bio: true,
            introVideoUrl: true,
            hourlyRate: true,
            currency: true,
            experienceYears: true,
            verified: true,
            availableNow: true,
            ecoFriendly: true,
            petFriendly: true,
            city: true,
            state: true,
            country: true,
            averageRating: true,
            totalBookings: true,
            responseTime: true,
            services: {
              where: { isActive: true },
              select: {
                id: true,
                customPrice: true,
                service: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    basePrice: true,
                    duration: true,
                  },
                },
              },
            },
            availability: {
              where: { isActive: true },
              select: {
                dayOfWeek: true,
                startTime: true,
                endTime: true,
              },
              orderBy: { dayOfWeek: "asc" },
            },
          },
        },
        reviewsReceived: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            reviewer: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!cleaner || !cleaner.cleanerProfile) {
      return NextResponse.json(
        { error: "Worker not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ cleaner }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error("Error fetching cleaner:", error);
    return NextResponse.json(
      { error: "Failed to fetch cleaner" },
      { status: 500 }
    );
  }
}
