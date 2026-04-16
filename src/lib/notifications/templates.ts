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
  scheduledDate?: string;
  scheduledTime?: string;
  amount?: string;
  documentType?: string;
  reason?: string;
  senderName?: string;
  otherPartyName?: string;
  etaStatus?: string;
  etaMinutes?: number;
}

export function getNotificationTemplate(
  type: NotificationType,
  data: TemplateData
): NotificationTemplate {
  // Use scheduledDate/scheduledTime as fallback for bookingDate/bookingTime
  const date = data.bookingDate || data.scheduledDate || "your scheduled date";
  const time = data.bookingTime || data.scheduledTime || "";

  const templates: Record<NotificationType, NotificationTemplate> = {
    BOOKING_CREATED: {
      title: "New Booking Request",
      body: `${data.customerName} has requested a ${data.serviceName} on ${date}${time ? ` at ${time}` : ""}.`,
    },
    BOOKING_CONFIRMED: {
      title: "Booking Confirmed",
      body: `Your booking for ${data.serviceName} on ${date}${time ? ` at ${time}` : ""} has been confirmed by ${data.workerName}.`,
    },
    BOOKING_CANCELLED: {
      title: "Booking Cancelled",
      body: `Your ${data.serviceName} booking on ${date} has been cancelled${data.otherPartyName ? ` by ${data.otherPartyName}` : ""}.${data.reason ? ` Reason: ${data.reason}` : ""}`,
    },
    BOOKING_REMINDER: {
      title: "Upcoming Booking Reminder",
      body: `Reminder: Your ${data.serviceName} booking is scheduled for ${date}${time ? ` at ${time}` : ""}.`,
    },
    BOOKING_COMPLETED: {
      title: "Booking Completed",
      body: `Your ${data.serviceName} has been completed. Please leave a review for ${data.workerName}.`,
    },
    BOOKING_ETA_UPDATE: {
      title: getEtaTitle(data.etaStatus),
      body: getEtaBody(data.etaStatus, data.workerName, data.etaMinutes),
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

function getEtaTitle(status?: string): string {
  switch (status) {
    case "ON_THE_WAY":
      return "Worker is on the way!";
    case "ARRIVED":
      return "Worker has arrived";
    case "STARTED":
      return "Service has started";
    case "COMPLETED":
      return "Service completed";
    default:
      return "Booking Update";
  }
}

function getEtaBody(status?: string, workerName?: string, etaMinutes?: number): string {
  const worker = workerName || "Your worker";
  switch (status) {
    case "ON_THE_WAY":
      return etaMinutes
        ? `${worker} is heading to your location. Estimated arrival in ${etaMinutes} minutes.`
        : `${worker} is heading to your location.`;
    case "ARRIVED":
      return `${worker} has arrived at your location.`;
    case "STARTED":
      return `${worker} has started working on your service.`;
    case "COMPLETED":
      return `${worker} has completed your service. Please leave a review!`;
    default:
      return "Your booking status has been updated.";
  }
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
