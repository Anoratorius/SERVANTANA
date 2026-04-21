import { PrismaClient, IndustryStatsSource } from "@prisma/client";

const prisma = new PrismaClient();

// Industry statistics for common professions by country
// Data based on industry research and market analysis
const industryData = [
  // Germany (DE) - Cleaning services
  {
    professionName: "House Cleaner",
    country: "DE",
    avgHourlyRate: 22,
    minHourlyRate: 15,
    maxHourlyRate: 35,
    avgMonthlyEarnings: 2800,
    avgWeeklyBookings: 12,
    avgBookingValue: 65,
  },
  {
    professionName: "Office Cleaner",
    country: "DE",
    avgHourlyRate: 20,
    minHourlyRate: 14,
    maxHourlyRate: 30,
    avgMonthlyEarnings: 2500,
    avgWeeklyBookings: 15,
    avgBookingValue: 45,
  },
  // Germany - Home services
  {
    professionName: "Handyman",
    country: "DE",
    avgHourlyRate: 35,
    minHourlyRate: 25,
    maxHourlyRate: 55,
    avgMonthlyEarnings: 4200,
    avgWeeklyBookings: 10,
    avgBookingValue: 110,
  },
  {
    professionName: "Plumber",
    country: "DE",
    avgHourlyRate: 45,
    minHourlyRate: 35,
    maxHourlyRate: 70,
    avgMonthlyEarnings: 5500,
    avgWeeklyBookings: 12,
    avgBookingValue: 120,
  },
  {
    professionName: "Electrician",
    country: "DE",
    avgHourlyRate: 48,
    minHourlyRate: 35,
    maxHourlyRate: 75,
    avgMonthlyEarnings: 5800,
    avgWeeklyBookings: 10,
    avgBookingValue: 150,
  },
  // Germany - Personal care
  {
    professionName: "Hairdresser",
    country: "DE",
    avgHourlyRate: 30,
    minHourlyRate: 20,
    maxHourlyRate: 50,
    avgMonthlyEarnings: 3500,
    avgWeeklyBookings: 18,
    avgBookingValue: 55,
  },
  {
    professionName: "Massage Therapist",
    country: "DE",
    avgHourlyRate: 55,
    minHourlyRate: 40,
    maxHourlyRate: 90,
    avgMonthlyEarnings: 4800,
    avgWeeklyBookings: 12,
    avgBookingValue: 80,
  },
  // Germany - Tutoring
  {
    professionName: "Private Tutor",
    country: "DE",
    avgHourlyRate: 28,
    minHourlyRate: 18,
    maxHourlyRate: 60,
    avgMonthlyEarnings: 3200,
    avgWeeklyBookings: 15,
    avgBookingValue: 45,
  },
  // Austria (AT)
  {
    professionName: "House Cleaner",
    country: "AT",
    avgHourlyRate: 25,
    minHourlyRate: 18,
    maxHourlyRate: 40,
    avgMonthlyEarnings: 3200,
    avgWeeklyBookings: 12,
    avgBookingValue: 70,
  },
  {
    professionName: "Handyman",
    country: "AT",
    avgHourlyRate: 40,
    minHourlyRate: 30,
    maxHourlyRate: 60,
    avgMonthlyEarnings: 4800,
    avgWeeklyBookings: 10,
    avgBookingValue: 120,
  },
  // Switzerland (CH)
  {
    professionName: "House Cleaner",
    country: "CH",
    avgHourlyRate: 40,
    minHourlyRate: 30,
    maxHourlyRate: 60,
    avgMonthlyEarnings: 5000,
    avgWeeklyBookings: 12,
    avgBookingValue: 100,
  },
  {
    professionName: "Handyman",
    country: "CH",
    avgHourlyRate: 65,
    minHourlyRate: 50,
    maxHourlyRate: 100,
    avgMonthlyEarnings: 7500,
    avgWeeklyBookings: 10,
    avgBookingValue: 180,
  },
];

async function seedIndustryStats() {
  console.log("Seeding industry statistics...");

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  for (const data of industryData) {
    // Find profession by name
    const profession = await prisma.profession.findFirst({
      where: {
        OR: [
          { name: { contains: data.professionName, mode: "insensitive" } },
          { nameDE: { contains: data.professionName, mode: "insensitive" } },
        ],
      },
    });

    if (!profession) {
      console.log(`  Profession not found: ${data.professionName}`);
      continue;
    }

    // Calculate scores
    const demandScore = 60 + Math.random() * 30; // 60-90
    const supplyScore = 30 + Math.random() * 40; // 30-70
    const opportunityScore = Math.max(0, demandScore - supplyScore + 50);

    // Find existing record
    const existing = await prisma.industryStats.findFirst({
      where: {
        professionId: profession.id,
        city: null,
        state: null,
        country: data.country,
        periodStart,
      },
    });

    if (existing) {
      await prisma.industryStats.update({
        where: { id: existing.id },
        data: {
          avgHourlyRate: data.avgHourlyRate,
          minHourlyRate: data.minHourlyRate,
          maxHourlyRate: data.maxHourlyRate,
          avgMonthlyEarnings: data.avgMonthlyEarnings,
          avgWeeklyBookings: data.avgWeeklyBookings,
          avgBookingValue: data.avgBookingValue,
          demandScore,
          supplyScore,
          opportunityScore,
          source: IndustryStatsSource.ESTIMATED,
          lastUpdated: now,
        },
      });
    } else {
      await prisma.industryStats.create({
        data: {
          professionId: profession.id,
          country: data.country,
          avgHourlyRate: data.avgHourlyRate,
          minHourlyRate: data.minHourlyRate,
          maxHourlyRate: data.maxHourlyRate,
          avgMonthlyEarnings: data.avgMonthlyEarnings,
          avgWeeklyBookings: data.avgWeeklyBookings,
          avgBookingValue: data.avgBookingValue,
          demandScore,
          supplyScore,
          opportunityScore,
          source: IndustryStatsSource.ESTIMATED,
          periodStart,
          periodEnd,
        },
      });
    }

    console.log(`  Added stats for ${data.professionName} in ${data.country}`);
  }

  console.log("Industry statistics seeding complete!");
}

seedIndustryStats()
  .catch((e) => {
    console.error("Error seeding industry stats:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
