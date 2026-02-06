import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const service = searchParams.get("service");
    const minRating = searchParams.get("minRating");
    const maxPrice = searchParams.get("maxPrice");
    const city = searchParams.get("city");

    // Build cleaner profile filter conditions
    const profileFilters: Prisma.CleanerProfileWhereInput = {};

    // Filter by minimum rating at database level
    if (minRating) {
      const rating = parseFloat(minRating);
      if (!isNaN(rating)) {
        profileFilters.averageRating = { gte: rating };
      }
    }

    // Filter by max price at database level
    if (maxPrice) {
      const price = parseFloat(maxPrice);
      if (!isNaN(price)) {
        profileFilters.hourlyRate = { lte: price };
      }
    }

    // Filter by city at database level
    if (city) {
      profileFilters.city = { contains: city };
    }

    // Filter by service at database level
    if (service) {
      profileFilters.services = {
        some: {
          service: { name: service },
          isActive: true,
        },
      };
    }

    // Build where clause - use 'is' to filter and ensure profile exists
    const where: Prisma.UserWhereInput = {
      role: "CLEANER",
      cleanerProfile: Object.keys(profileFilters).length > 0
        ? { is: profileFilters }
        : { isNot: null },
    };

    // Get cleaners with optimized query
    const cleaners = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        cleanerProfile: {
          select: {
            id: true,
            bio: true,
            hourlyRate: true,
            currency: true,
            experienceYears: true,
            verified: true,
            availableNow: true,
            city: true,
            state: true,
            averageRating: true,
            totalBookings: true,
            services: {
              where: { isActive: true },
              select: {
                customPrice: true,
                service: {
                  select: {
                    id: true,
                    name: true,
                    basePrice: true,
                    duration: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        cleanerProfile: {
          averageRating: "desc",
        },
      },
      take: 50, // Limit results for performance
    });

    // Filter out null profiles (should already be filtered but be safe)
    const filteredCleaners = cleaners.filter((c) => c.cleanerProfile !== null);

    return NextResponse.json({ cleaners: filteredCleaners });
  } catch (error) {
    console.error("Error fetching cleaners:", error);
    return NextResponse.json(
      { error: "Failed to fetch cleaners" },
      { status: 500 }
    );
  }
}
