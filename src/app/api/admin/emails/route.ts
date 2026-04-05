import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { z } from "zod";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Servantana <onboarding@resend.dev>";

const sendEmailSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200),
  body: z.string().min(1, "Message body is required").max(10000),
  recipientType: z.enum(["individual", "all", "workers", "customers"]),
  recipientId: z.string().optional(), // Required if recipientType is "individual"
});

// GET: Fetch email history
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin
    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (adminUser?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Get admin emails from notification log
    const [emails, total] = await Promise.all([
      prisma.notificationLog.findMany({
        where: {
          type: { in: ["ADMIN_EMAIL", "ADMIN_ANNOUNCEMENT"] },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notificationLog.count({
        where: {
          type: { in: ["ADMIN_EMAIL", "ADMIN_ANNOUNCEMENT"] },
        },
      }),
    ]);

    return NextResponse.json({
      emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching email history:", error);
    return NextResponse.json(
      { error: "Failed to fetch email history" },
      { status: 500 }
    );
  }
}

// POST: Send email
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin
    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, firstName: true, lastName: true },
    });

    if (adminUser?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validation = sendEmailSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { subject, body: messageBody, recipientType, recipientId } = validation.data;

    // Validate individual recipient
    if (recipientType === "individual" && !recipientId) {
      return NextResponse.json(
        { error: "Recipient ID is required for individual emails" },
        { status: 400 }
      );
    }

    // Get recipients based on type
    let recipients: Array<{ id: string; email: string; firstName: string; lastName: string }> = [];

    if (recipientType === "individual") {
      const user = await prisma.user.findUnique({
        where: { id: recipientId },
        select: { id: true, email: true, firstName: true, lastName: true },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      recipients = [user];
    } else {
      const whereClause = recipientType === "workers"
        ? { role: "WORKER" as const }
        : recipientType === "customers"
          ? { role: "CUSTOMER" as const }
          : {}; // "all" - no filter

      recipients = await prisma.user.findMany({
        where: {
          ...whereClause,
          status: "ACTIVE",
          email: { not: "" },
        },
        select: { id: true, email: true, firstName: true, lastName: true },
      });
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "No recipients found" },
        { status: 400 }
      );
    }

    // Build email HTML
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="background: linear-gradient(to right, #2563eb, #16a34a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 28px; margin: 0;">SERVANTANA</h1>
        </div>

        <h2 style="color: #333; margin-bottom: 20px;">${subject}</h2>

        <div style="color: #555; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${messageBody}</div>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

        <p style="color: #aaa; font-size: 12px; text-align: center;">
          &copy; ${new Date().getFullYear()} Servantana. All rights reserved.
        </p>
      </div>
    `;

    // Send emails (in batches for bulk)
    const results: Array<{ userId: string; success: boolean; error?: string }> = [];
    const notificationType = recipientType === "individual" ? "ADMIN_EMAIL" : "ADMIN_ANNOUNCEMENT";

    // For bulk emails, batch the sends
    const batchSize = 50;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (recipient) => {
          try {
            if (process.env.RESEND_API_KEY) {
              const { error } = await resend.emails.send({
                from: FROM_EMAIL,
                to: recipient.email,
                subject,
                html: emailHtml,
              });

              if (error) {
                return { userId: recipient.id, success: false, error: error.message };
              }
            } else {
              // Dev mode - log instead of sending
              console.log(`[EMAIL DEV] To: ${recipient.email}, Subject: ${subject}`);
            }

            // Log the notification
            await prisma.notificationLog.create({
              data: {
                userId: recipient.id,
                type: notificationType,
                channel: "EMAIL",
                title: subject,
                body: messageBody,
                data: {
                  recipientType,
                  sentBy: session.user.id,
                  sentByName: `${adminUser.firstName} ${adminUser.lastName}`,
                },
                sent: true,
                sentAt: new Date(),
              },
            });

            return { userId: recipient.id, success: true };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";

            // Log failed attempt
            await prisma.notificationLog.create({
              data: {
                userId: recipient.id,
                type: notificationType,
                channel: "EMAIL",
                title: subject,
                body: messageBody,
                data: {
                  recipientType,
                  sentBy: session.user.id,
                },
                sent: false,
                error: errorMessage,
              },
            });

            return { userId: recipient.id, success: false, error: errorMessage };
          }
        })
      );

      results.push(...batchResults);
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    // Log to audit log
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: recipientType === "individual" ? "SEND_EMAIL" : "SEND_ANNOUNCEMENT",
        targetType: "EMAIL",
        details: {
          subject,
          recipientType,
          totalRecipients: recipients.length,
          successCount,
          failedCount,
        },
        severity: "INFO",
      },
    });

    return NextResponse.json({
      message: `Email sent successfully to ${successCount} recipient(s)`,
      stats: {
        total: recipients.length,
        success: successCount,
        failed: failedCount,
      },
      results: failedCount > 0 ? results.filter((r) => !r.success) : undefined,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
