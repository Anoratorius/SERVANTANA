/**
 * Notification Message Templates
 */

import { NotificationType } from "@prisma/client";

interface NotificationTemplate {
  title: string;
  body: string;
}

interface TemplateData {
  customerName?: string;
  workerName?: string;
  serviceName?: string;
  bookingDate?: string;
  bookingTime?: string;
  amount?: string;
  documentType?: string;
  reason?: string;
  senderName?: string;
}

export function getNotificationTemplate(
  type: NotificationType,
  data: TemplateData
): NotificationTemplate {
  const templates: Record<NotificationType, NotificationTemplate> = {
    BOOKING_CREATED: {
      title: "New Booking Request",
      body: `${data.customerName} has requested a ${data.serviceName} on ${data.bookingDate} at ${data.bookingTime}.`,
    },
    BOOKING_CONFIRMED: {
      title: "Booking Confirmed",
      body: `Your booking for ${data.serviceName} on ${data.bookingDate} at ${data.bookingTime} has been confirmed by ${data.workerName}.`,
    },
    BOOKING_CANCELLED: {
      title: "Booking Cancelled",
      body: `Your ${data.serviceName} booking on ${data.bookingDate} has been cancelled.${data.reason ? ` Reason: ${data.reason}` : ""}`,
    },
    BOOKING_REMINDER: {
      title: "Upcoming Booking Reminder",
      body: `Reminder: Your ${data.serviceName} booking is scheduled for ${data.bookingDate} at ${data.bookingTime}.`,
    },
    BOOKING_COMPLETED: {
      title: "Booking Completed",
      body: `Your ${data.serviceName} has been completed. Please leave a review for ${data.workerName}.`,
    },
    PAYMENT_RECEIVED: {
      title: "Payment Received",
      body: `Payment of ${data.amount} has been received for your booking.`,
    },
    PAYOUT_SENT: {
      title: "Payout Sent",
      body: `A payout of ${data.amount} has been sent to your account.`,
    },
    DISPUTE_OPENED: {
      title: "Dispute Opened",
      body: `A dispute has been opened for your booking. Our support team will review it shortly.`,
    },
    DISPUTE_RESOLVED: {
      title: "Dispute Resolved",
      body: `Your dispute has been resolved.${data.amount ? ` Refund amount: ${data.amount}` : ""}`,
    },
    DOCUMENT_VERIFIED: {
      title: "Document Verified",
      body: `Your ${data.documentType} has been verified. Your profile is now verified.`,
    },
    DOCUMENT_REJECTED: {
      title: "Document Rejected",
      body: `Your ${data.documentType} has been rejected.${data.reason ? ` Reason: ${data.reason}` : " Please upload a valid document."}`,
    },
    MESSAGE_RECEIVED: {
      title: "New Message",
      body: `You have a new message from ${data.senderName}.`,
    },
    REVIEW_RECEIVED: {
      title: "New Review",
      body: `${data.customerName} has left a review for your service.`,
    },
    ADMIN_EMAIL: {
      title: "Message from Admin",
      body: "You have received a message from the Servantana team.",
    },
    ADMIN_ANNOUNCEMENT: {
      title: "Announcement",
      body: "You have received an announcement from Servantana.",
    },
  };

  return templates[type] || { title: "Notification", body: "You have a new notification." };
}

export function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, "");

  // Add country code if not present (assuming US)
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }

  if (!cleaned.startsWith("1") && cleaned.length === 10) {
    return `+1${cleaned}`;
  }

  return `+${cleaned}`;
}
