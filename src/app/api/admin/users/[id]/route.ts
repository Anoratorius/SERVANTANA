import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { writeAuditLog, AuditAction } from "@/lib/audit-log";
import { getClientIP } from "@/lib/rate-limit";

const updateUserSchema = z.object({
  role: z.enum(["CUSTOMER", "WORKER", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "BANNED"]).optional(),
  suspendedUntil: z.string().datetime().nullable().optional(),
  suspendedReason: z.string().max(500).nullable().optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
});

// Get single user details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (adminUser?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        workerProfile: {
          include: {
            services: { include: { service: true } },
            availability: true,
          },
        },
        bookingsAsCustomer: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            cleaner: { select: { firstName: true, lastName: true } },
            service: { select: { name: true } },
          },
        },
        bookingsAsCleaner: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            customer: { select: { firstName: true, lastName: true } },
            service: { select: { name: true } },
          },
        },
        reviewsReceived: {
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            reviewer: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// Update user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (adminUser?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const validationResult = updateUserSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    // Prevent admin from demoting themselves
    if (id === session.user.id && body.role && body.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Cannot change your own admin role" },
        { status: 400 }
      );
    }

    // Prevent admin from banning/suspending themselves
    if (id === session.user.id && body.status && body.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Cannot suspend or ban your own account" },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = { ...validationResult.data };

    // Handle suspendedUntil date conversion
    if (body.suspendedUntil) {
      updateData.suspendedUntil = new Date(body.suspendedUntil);
    } else if (body.suspendedUntil === null) {
      updateData.suspendedUntil = null;
    }

    // If status is ACTIVE, clear suspension fields
    if (body.status === "ACTIVE") {
      updateData.suspendedUntil = null;
      updateData.suspendedReason = null;
    }

    // If banning/suspending, increment tokenVersion to invalidate all sessions
    if (body.status && body.status !== "ACTIVE") {
      updateData.tokenVersion = { increment: 1 };
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        suspendedUntil: true,
        suspendedReason: true,
      },
    });

    // If role changed to WORKER, create worker profile if not exists
    if (body.role === "WORKER") {
      const existingProfile = await prisma.workerProfile.findUnique({
        where: { userId: id },
      });

      if (!existingProfile) {
        await prisma.workerProfile.create({
          data: {
            userId: id,
            hourlyRate: 25,
          },
        });
      }
    }

    // Audit log for role changes
    if (body.role) {
      writeAuditLog({
        action: "USER_ROLE_CHANGED",
        actorId: session.user.id,
        actorEmail: session.user.email,
        targetId: id,
        targetType: "User",
        details: { newRole: body.role, previousRole: "unknown" },
        ip: getClientIP(request),
        userAgent: request.headers.get("user-agent") || undefined,
      });
    }

    // Audit log for status changes (suspend/ban)
    if (body.status) {
      const actionMap: Record<string, AuditAction> = {
        SUSPENDED: "USER_SUSPENDED",
        BANNED: "USER_BANNED",
        ACTIVE: "USER_REACTIVATED",
      };
      writeAuditLog({
        action: actionMap[body.status] || "USER_UPDATED",
        actorId: session.user.id,
        actorEmail: session.user.email,
        targetId: id,
        targetType: "User",
        details: {
          newStatus: body.status,
          reason: body.suspendedReason || null,
          suspendedUntil: body.suspendedUntil || null,
        },
        ip: getClientIP(request),
        userAgent: request.headers.get("user-agent") || undefined,
        severity: body.status === "BANNED" ? "CRITICAL" : "WARNING",
      });
    }

    return NextResponse.json({
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (adminUser?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Prevent admin from deleting themselves
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Get user info before deletion for audit log
    const userToDelete = await prisma.user.findUnique({
      where: { id },
      select: { email: true },
    });

    if (!userToDelete) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Use a transaction to delete all related records
    // Many relations don't have onDelete: Cascade, so we must manually delete them
    await prisma.$transaction(async (tx) => {
      // Get all bookings where user is customer or worker
      const userBookings = await tx.booking.findMany({
        where: { OR: [{ customerId: id }, { cleanerId: id }] },
        select: { id: true },
      });
      const bookingIds = userBookings.map((b) => b.id);

      // Get all disputes where user is involved
      const userDisputes = await tx.dispute.findMany({
        where: { OR: [{ customerId: id }, { cleanerId: id }] },
        select: { id: true },
      });
      const disputeIds = userDisputes.map((d) => d.id);

      // Delete dispute-related records
      if (disputeIds.length > 0) {
        await tx.disputeMessage.deleteMany({ where: { disputeId: { in: disputeIds } } });
        await tx.disputeEvidence.deleteMany({ where: { disputeId: { in: disputeIds } } });
        await tx.dispute.deleteMany({ where: { id: { in: disputeIds } } });
      }

      // Delete booking-related records
      if (bookingIds.length > 0) {
        await tx.bookingReminder.deleteMany({ where: { bookingId: { in: bookingIds } } });
        await tx.bookingChange.deleteMany({ where: { bookingId: { in: bookingIds } } });
        await tx.bookingPhoto.deleteMany({ where: { bookingId: { in: bookingIds } } });
        await tx.bookingTeamMember.deleteMany({ where: { bookingId: { in: bookingIds } } });
        await tx.review.deleteMany({ where: { bookingId: { in: bookingIds } } });
        await tx.customerReview.deleteMany({ where: { bookingId: { in: bookingIds } } });
        await tx.payment.deleteMany({ where: { bookingId: { in: bookingIds } } });
        await tx.earning.deleteMany({ where: { bookingId: { in: bookingIds } } });
        await tx.invoice.deleteMany({ where: { bookingId: { in: bookingIds } } });
        await tx.calendarEvent.deleteMany({ where: { bookingId: { in: bookingIds } } });
      }

      // Delete messages where user is sender or receiver
      await tx.message.deleteMany({ where: { OR: [{ senderId: id }, { receiverId: id }] } });

      // Delete bookings
      if (bookingIds.length > 0) {
        await tx.booking.deleteMany({ where: { id: { in: bookingIds } } });
      }

      // Delete user-specific records
      await tx.payout.deleteMany({ where: { cleanerId: id } });
      await tx.earning.deleteMany({ where: { cleanerId: id } });
      await tx.workerDocument.deleteMany({ where: { cleanerId: id } });

      // Clear verified documents where this user was the verifier
      await tx.workerDocument.updateMany({
        where: { verifiedById: id },
        data: { verifiedById: null },
      });

      // Clear resolved disputes where this user was the resolver
      await tx.dispute.updateMany({
        where: { resolvedById: id },
        data: { resolvedById: null },
      });

      // Delete the user (remaining relations have onDelete: Cascade)
      await tx.user.delete({ where: { id } });
    });

    // Audit log user deletion
    writeAuditLog({
      action: "USER_DELETED",
      actorId: session.user.id,
      actorEmail: session.user.email,
      targetId: id,
      targetType: "User",
      details: { deletedUserEmail: userToDelete?.email },
      ip: getClientIP(request),
      userAgent: request.headers.get("user-agent") || undefined,
      severity: "CRITICAL",
    });

    return NextResponse.json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
