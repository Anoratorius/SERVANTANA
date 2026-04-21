import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

// This endpoint should be called periodically (e.g., every 15 minutes by a cron job)
// to send booking reminders at the user's preferred times
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret - required for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    let remindersSent = 0;

    // Get all upcoming confirmed bookings in the next 24 hours
    const maxReminderWindow = 24 * 60; // 24 hours in minutes
    const windowEnd = new Date(now.getTime() + maxReminderWindow * 60 * 1000);

    const upcomingBookings = await prisma.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "PENDING"] },
        scheduledDate: {
          gte: now,
          lte: windowEnd,
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            reminderPreference: true,
          },
        },
        worker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            reminderPreference: true,
          },
        },
        service: {
          select: {
            name: true,
          },
        },
        reminders: true,
      },
    });

    for (const booking of upcomingBookings) {
      // Calculate booking datetime
      const [hours, minutes] = booking.scheduledTime.split(":").map(Number);
      const bookingDateTime = new Date(booking.scheduledDate);
      bookingDateTime.setHours(hours, minutes, 0, 0);

      const minutesUntilBooking = Math.floor(
        (bookingDateTime.getTime() - now.getTime()) / (1000 * 60)
      );

      // Skip if booking is in the past
      if (minutesUntilBooking < 0) continue;

      // Process reminders for both customer and worker
      const users = [
        { user: booking.customer, role: "customer" as const },
        { user: booking.worker, role: "worker" as const },
      ];

      for (const { user, role } of users) {
        // Get user's reminder preferences (default: 24hr and 1hr before)
        const reminderTimes = user.reminderPreference?.enabled !== false
          ? (user.reminderPreference?.reminderTimes ?? [1440, 60])
          : [];

        for (const reminderMinutes of reminderTimes) {
          // Check if we should send this reminder now
          // Send if we're within 15 minutes of the reminder time
          const reminderWindow = 15; // minutes
          const shouldSendReminder =
            minutesUntilBooking <= reminderMinutes &&
            minutesUntilBooking > reminderMinutes - reminderWindow;

          if (!shouldSendReminder) continue;

          // Check if this reminder was already sent
          const alreadySent = booking.reminders.some(
            (r) =>
              r.userId === user.id &&
              r.reminderMinutes === reminderMinutes
          );

          if (alreadySent) continue;

          // Send the reminder
          const otherUser = role === "customer" ? booking.worker : booking.customer;
          const formattedDate = bookingDateTime.toLocaleDateString();
          const formattedTime = booking.scheduledTime;

          try {
            await sendNotification(user.id, "BOOKING_REMINDER", {
              bookingId: booking.id,
              serviceName: booking.service?.name || "Cleaning Service",
              scheduledDate: formattedDate,
              scheduledTime: formattedTime,
              otherPartyName: `${otherUser.firstName} ${otherUser.lastName}`,
              minutesUntil: minutesUntilBooking,
            });

            // Record that this reminder was sent
            await prisma.bookingReminder.create({
              data: {
                bookingId: booking.id,
                userId: user.id,
                reminderMinutes,
                channel: "EMAIL", // Primary channel
              },
            });

            remindersSent++;
          } catch (error) {
            console.error(
              `Failed to send reminder for booking ${booking.id} to user ${user.id}:`,
              error
            );
          }
        }
      }
    }

    return NextResponse.json({
      message: "Reminders processed successfully",
      remindersSent,
      bookingsChecked: upcomingBookings.length,
    });
  } catch (error) {
    console.error("Error sending reminders:", error);
    return NextResponse.json(
      { error: "Failed to send reminders" },
      { status: 500 }
    );
  }
}
