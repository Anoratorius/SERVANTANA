import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create default services
  const services = [
    {
      name: "regular",
      description: "Standard cleaning service for homes and apartments",
      basePrice: 50,
      duration: 120,
      category: "cleaning",
      icon: "sparkles",
    },
    {
      name: "deep",
      description: "Thorough deep cleaning including hard-to-reach areas",
      basePrice: 100,
      duration: 240,
      category: "cleaning",
      icon: "sparkles",
    },
    {
      name: "moveInOut",
      description: "Complete cleaning for move-in or move-out",
      basePrice: 150,
      duration: 300,
      category: "cleaning",
      icon: "home",
      isSpecialty: true,
    },
    {
      name: "postConstruction",
      description: "Thorough cleaning after construction or renovation",
      basePrice: 200,
      duration: 360,
      category: "cleaning",
      icon: "hammer",
      isSpecialty: true,
    },
    {
      name: "airbnb",
      description: "Quick turnover cleaning for short-term rentals",
      basePrice: 80,
      duration: 90,
      category: "cleaning",
      icon: "key",
      isSpecialty: true,
    },
    {
      name: "office",
      description: "Professional office and commercial space cleaning",
      basePrice: 80,
      duration: 180,
      category: "cleaning",
      icon: "building",
    },
    {
      name: "window",
      description: "Interior and exterior window cleaning",
      basePrice: 60,
      duration: 90,
      category: "cleaning",
      icon: "square",
    },
    {
      name: "carpet",
      description: "Professional carpet and rug cleaning",
      basePrice: 70,
      duration: 120,
      category: "cleaning",
      icon: "rectangle",
    },
    {
      name: "laundry",
      description: "Laundry washing, drying, and folding service",
      basePrice: 40,
      duration: 60,
      category: "cleaning",
      icon: "shirt",
    },
    {
      name: "organizing",
      description: "Home organization and decluttering service",
      basePrice: 60,
      duration: 180,
      category: "organizing",
      icon: "folder",
    },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { name: service.name },
      update: service,
      create: service,
    });
  }

  console.log(`Created ${services.length} services`);

  // Create sample cleaners
  const sampleCleaners = [
    {
      email: "maria.garcia@example.com",
      firstName: "Maria",
      lastName: "Garcia",
      bio: "Professional cleaner with over 8 years of experience. I take pride in leaving every home spotless and fresh. Specializing in deep cleaning and move-in/out services.",
      hourlyRate: 35,
      experienceYears: 8,
      city: "Tbilisi",
      state: "",
      verified: true,
      availableNow: true,
      averageRating: 4.9,
      totalBookings: 127,
      responseTime: 15,
      services: ["regular", "deep", "moveInOut"],
    },
    {
      email: "james.wilson@example.com",
      firstName: "James",
      lastName: "Wilson",
      bio: "Reliable and detail-oriented cleaning professional. I use eco-friendly products and pay attention to every corner of your home.",
      hourlyRate: 30,
      experienceYears: 5,
      city: "Tbilisi",
      state: "",
      verified: true,
      availableNow: false,
      averageRating: 4.7,
      totalBookings: 89,
      responseTime: 30,
      services: ["regular", "window", "carpet"],
    },
    {
      email: "sarah.johnson@example.com",
      firstName: "Sarah",
      lastName: "Johnson",
      bio: "Experienced office and residential cleaner. I provide thorough, consistent cleaning services that you can count on week after week.",
      hourlyRate: 40,
      experienceYears: 10,
      city: "Tbilisi",
      state: "",
      verified: true,
      availableNow: true,
      averageRating: 4.8,
      totalBookings: 215,
      responseTime: 20,
      services: ["regular", "deep", "office", "organizing"],
    },
    {
      email: "michael.chen@example.com",
      firstName: "Michael",
      lastName: "Chen",
      bio: "Professional cleaner specializing in carpet and upholstery cleaning. I use industry-leading equipment for the best results.",
      hourlyRate: 45,
      experienceYears: 6,
      city: "Tbilisi",
      state: "",
      verified: false,
      availableNow: true,
      averageRating: 4.6,
      totalBookings: 52,
      responseTime: 45,
      services: ["carpet", "deep", "laundry"],
    },
  ];

  const hashedPassword = await hash("password123", 12);

  for (const cleaner of sampleCleaners) {
    // Delete existing user if exists (to update with new data)
    await prisma.user.deleteMany({
      where: { email: cleaner.email },
    });

    {
      const user = await prisma.user.create({
        data: {
          email: cleaner.email,
          password: hashedPassword,
          firstName: cleaner.firstName,
          lastName: cleaner.lastName,
          role: "CLEANER",
          workerProfile: {
            create: {
              bio: cleaner.bio,
              hourlyRate: cleaner.hourlyRate,
              experienceYears: cleaner.experienceYears,
              city: cleaner.city,
              state: cleaner.state,
              country: "USA",
              verified: cleaner.verified,
              availableNow: cleaner.availableNow,
              averageRating: cleaner.averageRating,
              totalBookings: cleaner.totalBookings,
              responseTime: cleaner.responseTime,
            },
          },
        },
        include: { workerProfile: true },
      });

      // Add services to cleaner
      for (const serviceName of cleaner.services) {
        const service = await prisma.service.findUnique({
          where: { name: serviceName },
        });
        if (service && user.workerProfile) {
          await prisma.workerService.create({
            data: {
              workerId: user.workerProfile.id,
              serviceId: service.id,
            },
          });
        }
      }

      // Add availability (Mon-Fri 9am-5pm)
      if (user.workerProfile) {
        for (let day = 1; day <= 5; day++) {
          await prisma.availability.create({
            data: {
              workerId: user.workerProfile.id,
              dayOfWeek: day,
              startTime: "09:00",
              endTime: "17:00",
            },
          });
        }
      }

      console.log(`Created cleaner: ${cleaner.firstName} ${cleaner.lastName}`);
    }
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
