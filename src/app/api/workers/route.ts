import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { applyRateLimit } from "@/lib/rate-limit";

// Haversine formula to calculate distance between two points in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request: NextRequest) {
  // Rate limiting: 30 searches per minute
  const rateLimited = await applyRateLimit(request, "search");
  if (rateLimited) return rateLimited;

  try {
    const searchParams = request.nextUrl.searchParams;
    const service = searchParams.get("service");
    const minRating = searchParams.get("minRating");
    const maxPrice = searchParams.get("maxPrice");
    const city = searchParams.get("city");
    const ecoFriendly = searchParams.get("ecoFriendly");
    const petFriendly = searchParams.get("petFriendly");
    const specialtyServices = searchParams.get("specialty");
    const categoryId = searchParams.get("categoryId");
    const professionId = searchParams.get("professionId");

    // Location-based search parameters
    const userLat = searchParams.get("lat");
    const userLng = searchParams.get("lng");
    const maxDistance = searchParams.get("maxDistance"); // in km

    // Build worker profile filter conditions
    // Only show workers who completed onboarding and are active
    const profileFilters: Prisma.WorkerProfileWhereInput = {
      onboardingComplete: true,
      isActive: true,
    };

    // Filter by category - workers who have professions in this category
    if (categoryId) {
      profileFilters.professions = {
        some: {
          profession: {
            categoryId,
            status: "APPROVED",
          },
        },
      };
    }

    // Filter by specific profession
    if (professionId) {
      profileFilters.professions = {
        some: {
          professionId,
          profession: {
            status: "APPROVED",
          },
        },
      };
    }

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

    // Filter by eco-friendly
    if (ecoFriendly === "true") {
      profileFilters.ecoFriendly = true;
    }

    // Filter by pet-friendly
    if (petFriendly === "true") {
      profileFilters.petFriendly = true;
    }

    // Filter by specialty services
    if (specialtyServices === "true") {
      profileFilters.services = {
        some: {
          service: { isSpecialty: true },
          isActive: true,
        },
      };
    }

    // Build where clause - use 'is' to filter and ensure profile exists
    const where: Prisma.UserWhereInput = {
      role: "WORKER",
      workerProfile: Object.keys(profileFilters).length > 0
        ? { is: profileFilters }
        : { isNot: null },
    };

    // Get workers with optimized query
    const workers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        workerProfile: {
          select: {
            id: true,
            bio: true,
            hourlyRate: true,
            currency: true,
            experienceYears: true,
            verified: true,
            availableNow: true,
            ecoFriendly: true,
            petFriendly: true,
            city: true,
            state: true,
            latitude: true,
            longitude: true,
            serviceRadius: true,
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
                    isSpecialty: true,
                  },
                },
              },
            },
            professions: {
              where: {
                profession: { status: "APPROVED" },
              },
              select: {
                isPrimary: true,
                profession: {
                  select: {
                    id: true,
                    name: true,
                    nameDE: true,
                    emoji: true,
                    category: {
                      select: {
                        id: true,
                        name: true,
                        nameDE: true,
                      },
                    },
                  },
                },
              },
              orderBy: [{ isPrimary: "desc" }],
            },
          },
        },
      },
      orderBy: {
        workerProfile: {
          averageRating: "desc",
        },
      },
      take: 50, // Limit results for performance
    });

    // Filter out null profiles (should already be filtered but be safe)
    let filteredWorkers = workers.filter((c) => c.workerProfile !== null);

    // If user coordinates provided, calculate distances and filter
    if (userLat && userLng) {
      const lat = parseFloat(userLat);
      const lng = parseFloat(userLng);
      const maxDist = maxDistance ? parseFloat(maxDistance) : null;

      if (!isNaN(lat) && !isNaN(lng)) {
        // Add distance to each worker
        const workersWithDistance = filteredWorkers.map((worker) => {
          const profile = worker.workerProfile!;
          let distance: number | null = null;

          if (profile.latitude && profile.longitude) {
            distance = calculateDistance(lat, lng, profile.latitude, profile.longitude);
          }

          return {
            ...worker,
            workerProfile: {
              ...profile,
              distance: distance ? Math.round(distance * 10) / 10 : null, // Round to 1 decimal
            },
          };
        });

        // Filter by max distance if provided
        if (maxDist) {
          filteredWorkers = workersWithDistance.filter((c) => {
            const distance = c.workerProfile.distance;
            const serviceRadius = c.workerProfile.serviceRadius || 10;
            // Include if within max distance AND within worker's service radius
            return distance !== null && distance <= maxDist && distance <= serviceRadius;
          });
        } else {
          // Filter only by worker's service radius
          filteredWorkers = workersWithDistance.filter((c) => {
            const distance = c.workerProfile.distance;
            const serviceRadius = c.workerProfile.serviceRadius || 10;
            return distance === null || distance <= serviceRadius;
          });
        }

        // Sort by distance (closest first)
        filteredWorkers.sort((a, b) => {
          const profileA = a.workerProfile as { distance?: number | null };
          const profileB = b.workerProfile as { distance?: number | null };
          const distA = profileA?.distance ?? Infinity;
          const distB = profileB?.distance ?? Infinity;
          return distA - distB;
        });
      }
    }

    return NextResponse.json({ cleaners: filteredWorkers }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error("Error fetching workers:", error);
    return NextResponse.json(
      { error: "Failed to fetch workers" },
      { status: 500 }
    );
  }
}
