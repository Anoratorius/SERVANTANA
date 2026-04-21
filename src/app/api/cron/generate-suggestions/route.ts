import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  analyzeBookingPatterns,
  saveDetectedPatterns,
  getPatternsReadyForSuggestion,
  predictNextBookingDate,
} from "@/lib/ai/booking-patterns";
import { sendNotification } from "@/lib/notifications";

/**
 * POST /api/cron/generate-suggestions
 * Daily cron job to:
 * 1. Analyze booking patterns for active customers
 * 2. Generate booking suggestions for patterns ready for notification
 * 3. Auto-book for customers who have enabled auto-booking
 *
 * This should be called by a cron service (e.g., Vercel Cron, GitHub Actions)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = {
      patternsAnalyzed: 0,
      newPatternsDetected: 0,
      suggestionsCreated: 0,
      autoBookingsCreated: 0,
      notificationsSent: 0,
      errors: [] as string[],
    };

    // Step 1: Find customers with recent booking activity who need pattern analysis
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const customersWithRecentActivity = await prisma.user.findMany({
      where: {
        role: "CUSTOMER",
        bookingsAsCustomer: {
          some: {
            status: "COMPLETED",
            completedAt: { gte: thirtyDaysAgo },
          },
        },
      },
      select: { id: true },
      take: 100, // Process 100 customers per cron run
    });

    // Step 2: Analyze patterns for each customer
    for (const customer of customersWithRecentActivity) {
      try {
        // Check when patterns were last analyzed
        const existingPattern = await prisma.bookingPattern.findFirst({
          where: { customerId: customer.id },
          orderBy: { updatedAt: "desc" },
        });

        // Skip if analyzed within last 7 days
        if (
          existingPattern &&
          existingPattern.updatedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ) {
          continue;
        }

        const analysis = await analyzeBookingPatterns(customer.id);
        results.patternsAnalyzed++;

        if (analysis.hasEnoughData && analysis.patterns.length > 0) {
          await saveDetectedPatterns(customer.id, analysis.patterns);
          results.newPatternsDetected += analysis.patterns.length;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`Pattern analysis for ${customer.id}: ${errorMessage}`);
      }
    }

    // Step 3: Generate suggestions for patterns ready for notification
    const readyPatterns = await getPatternsReadyForSuggestion(60); // Min 60% confidence

    for (const { pattern, predictedDate } of readyPatterns) {
      if (!pattern) continue;

      try {
        // Calculate expiration (3 days after predicted date or pattern's notifyDaysBefore)
        const expiresAt = new Date(predictedDate);
        expiresAt.setDate(expiresAt.getDate() + 1); // Expire 1 day after suggested date

        // Determine the time slot
        const timeSlot = pattern.timeSlot || "09:00";

        // Check if auto-booking is enabled
        if (pattern.autoBookEnabled && pattern.workerId) {
          // Auto-book: create the booking directly
          try {
            const booking = await prisma.booking.create({
              data: {
                customerId: pattern.customerId,
                workerId: pattern.workerId,
                serviceId: pattern.serviceId,
                scheduledDate: predictedDate,
                scheduledTime: timeSlot,
                duration: 60, // Default 1 hour
                totalPrice: 0, // Will be calculated at payment
                status: "PENDING",
                notes: "Auto-booked based on your booking pattern",
              },
            });

            // Create suggestion record for tracking
            await prisma.bookingSuggestion.create({
              data: {
                customerId: pattern.customerId,
                patternId: pattern.id,
                suggestedDate: predictedDate,
                suggestedTime: timeSlot,
                workerId: pattern.workerId,
                professionId: pattern.professionId,
                serviceId: pattern.serviceId,
                status: "AUTO_BOOKED",
                autoBooked: true,
                bookingId: booking.id,
                expiresAt,
                respondedAt: new Date(),
              },
            });

            // Update pattern
            await prisma.bookingPattern.update({
              where: { id: pattern.id },
              data: {
                lastBooked: new Date(),
                lastSuggested: new Date(),
                timesAccepted: { increment: 1 },
              },
            });

            results.autoBookingsCreated++;

            // Notify customer about auto-booking
            const formattedDate = predictedDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            });

            await sendNotification(
              pattern.customerId,
              "BOOKING_CREATED",
              {
                bookingId: booking.id,
                scheduledDate: formattedDate,
                scheduledTime: timeSlot,
              },
              {
                actionUrl: `/bookings/${booking.id}`,
              }
            );
            results.notificationsSent++;

            // Notify worker
            await sendNotification(
              pattern.workerId,
              "BOOKING_CREATED",
              {
                bookingId: booking.id,
                scheduledDate: formattedDate,
                scheduledTime: timeSlot,
              },
              {
                actionUrl: `/bookings/${booking.id}`,
              }
            );
            results.notificationsSent++;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            results.errors.push(`Auto-booking for pattern ${pattern.id}: ${errorMessage}`);
          }
        } else {
          // Regular suggestion: create suggestion and notify
          const suggestion = await prisma.bookingSuggestion.create({
            data: {
              customerId: pattern.customerId,
              patternId: pattern.id,
              suggestedDate: predictedDate,
              suggestedTime: timeSlot,
              workerId: pattern.workerId,
              professionId: pattern.professionId,
              serviceId: pattern.serviceId,
              status: "PENDING",
              expiresAt,
            },
          });

          results.suggestionsCreated++;

          // Update pattern
          await prisma.bookingPattern.update({
            where: { id: pattern.id },
            data: { lastSuggested: new Date() },
          });

          // Send notification
          const formattedDate = predictedDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          });

          try {
            await sendNotification(
              pattern.customerId,
              "BOOKING_REMINDER",
              {
                scheduledDate: formattedDate,
                scheduledTime: timeSlot,
              },
              {
                actionUrl: `/dashboard/suggestions`,
              }
            );

            await prisma.bookingSuggestion.update({
              where: { id: suggestion.id },
              data: { notifiedAt: new Date() },
            });

            results.notificationsSent++;
          } catch (notifError) {
            const errorMessage = notifError instanceof Error ? notifError.message : "Unknown error";
            results.errors.push(`Notification for suggestion ${suggestion.id}: ${errorMessage}`);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`Suggestion for pattern ${pattern.id}: ${errorMessage}`);
      }
    }

    // Step 4: Expire old pending suggestions
    const expiredCount = await prisma.bookingSuggestion.updateMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });

    return NextResponse.json({
      success: true,
      message: "Suggestion generation complete",
      results: {
        ...results,
        suggestionsExpired: expiredCount.count,
      },
    });
  } catch (error) {
    console.error("Error in generate-suggestions cron:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/generate-suggestions
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "generate-suggestions",
    description: "Daily cron job to analyze patterns and generate booking suggestions",
    requiredAuth: "Bearer token with CRON_SECRET",
  });
}
