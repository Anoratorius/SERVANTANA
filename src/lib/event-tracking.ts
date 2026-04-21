/**
 * Servantana Event Tracking SDK
 *
 * Client-side event tracking for comprehensive analytics.
 * Tracks page views, clicks, searches, conversions, and more.
 */

import { UserEventType, EventCategory } from "@prisma/client";

// Re-export enums for convenience
export { UserEventType, EventCategory };

// Session management
let sessionId: string | null = null;
let sessionStartTime: number | null = null;
let lastActivityTime: number | null = null;
let currentPageLoadTime: number | null = null;
let eventQueue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const FLUSH_INTERVAL = 5000; // 5 seconds
const MAX_QUEUE_SIZE = 50;

interface AnalyticsEvent {
  eventType: UserEventType;
  eventCategory: EventCategory;
  eventAction?: string;
  eventLabel?: string;
  eventValue?: number;
  pageUrl?: string;
  pageTitle?: string;
  pagePath?: string;
  referrerUrl?: string;
  componentId?: string;
  targetId?: string;
  targetType?: string;
  searchQuery?: string;
  searchFilters?: Record<string, unknown>;
  sessionId?: string | null;
  timeOnPage?: number;
  scrollDepth?: number;
  funnelId?: string;
  funnelStep?: number;
  timestamp?: number;
}

interface DeviceInfo {
  deviceType: string;
  deviceModel?: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  screenWidth: number;
  screenHeight: number;
  timezone: string;
  language: string;
}

interface UTMParams {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

// Initialize analytics
export function initEventTracking(): void {
  if (typeof window === "undefined") return;

  // Generate or restore session ID
  sessionId = getOrCreateSession();
  sessionStartTime = Date.now();
  lastActivityTime = Date.now();

  // Set up automatic page view tracking
  trackPageView();

  // Set up scroll depth tracking
  setupScrollTracking();

  // Set up visibility change tracking
  setupVisibilityTracking();

  // Set up click tracking
  setupClickTracking();

  // Set up periodic flush
  flushTimer = setInterval(flushEvents, FLUSH_INTERVAL);

  // Flush on page unload
  window.addEventListener("beforeunload", () => {
    flushEvents(true);
  });

  // Track time on page
  window.addEventListener("beforeunload", () => {
    if (currentPageLoadTime) {
      const timeOnPage = Math.round((Date.now() - currentPageLoadTime) / 1000);
      trackEvent({
        eventType: UserEventType.PAGE_VIEW,
        eventCategory: EventCategory.ENGAGEMENT,
        eventAction: "page_exit",
        timeOnPage,
      });
    }
  });
}

// Get or create session
function getOrCreateSession(): string {
  if (typeof window === "undefined") return "";

  const stored = sessionStorage.getItem("analytics_session");
  const storedTime = sessionStorage.getItem("analytics_session_time");

  if (stored && storedTime) {
    const elapsed = Date.now() - parseInt(storedTime, 10);
    if (elapsed < SESSION_TIMEOUT) {
      sessionStorage.setItem("analytics_session_time", Date.now().toString());
      return stored;
    }
  }

  // Create new session
  const newSession = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  sessionStorage.setItem("analytics_session", newSession);
  sessionStorage.setItem("analytics_session_time", Date.now().toString());
  return newSession;
}

// Get device info
function getDeviceInfo(): DeviceInfo {
  if (typeof window === "undefined") {
    return {
      deviceType: "unknown",
      browser: "unknown",
      browserVersion: "unknown",
      os: "unknown",
      osVersion: "unknown",
      screenWidth: 0,
      screenHeight: 0,
      timezone: "UTC",
      language: "en",
    };
  }

  const ua = navigator.userAgent;
  let deviceType = "desktop";
  if (/mobile/i.test(ua)) deviceType = "mobile";
  else if (/tablet|ipad/i.test(ua)) deviceType = "tablet";

  let browser = "unknown";
  let browserVersion = "unknown";
  if (/chrome/i.test(ua) && !/edge/i.test(ua)) {
    browser = "Chrome";
    browserVersion = ua.match(/chrome\/(\d+)/i)?.[1] || "unknown";
  } else if (/firefox/i.test(ua)) {
    browser = "Firefox";
    browserVersion = ua.match(/firefox\/(\d+)/i)?.[1] || "unknown";
  } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
    browser = "Safari";
    browserVersion = ua.match(/version\/(\d+)/i)?.[1] || "unknown";
  } else if (/edge/i.test(ua)) {
    browser = "Edge";
    browserVersion = ua.match(/edge\/(\d+)/i)?.[1] || "unknown";
  }

  let os = "unknown";
  let osVersion = "unknown";
  if (/windows/i.test(ua)) {
    os = "Windows";
    osVersion = ua.match(/windows nt (\d+\.\d+)/i)?.[1] || "unknown";
  } else if (/mac os/i.test(ua)) {
    os = "macOS";
    osVersion = ua.match(/mac os x (\d+[._]\d+)/i)?.[1]?.replace("_", ".") || "unknown";
  } else if (/linux/i.test(ua) && !/android/i.test(ua)) {
    os = "Linux";
  } else if (/android/i.test(ua)) {
    os = "Android";
    osVersion = ua.match(/android (\d+\.?\d*)/i)?.[1] || "unknown";
  } else if (/ios|iphone|ipad/i.test(ua)) {
    os = "iOS";
    osVersion = ua.match(/os (\d+[._]\d+)/i)?.[1]?.replace("_", ".") || "unknown";
  }

  return {
    deviceType,
    browser,
    browserVersion,
    os,
    osVersion,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
  };
}

// Get UTM params from URL
function getUTMParams(): UTMParams {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get("utm_source") || undefined,
    utmMedium: params.get("utm_medium") || undefined,
    utmCampaign: params.get("utm_campaign") || undefined,
    utmTerm: params.get("utm_term") || undefined,
    utmContent: params.get("utm_content") || undefined,
  };
}

// Main tracking function
export function trackEvent(event: AnalyticsEvent): void {
  if (typeof window === "undefined") return;

  // Update last activity
  lastActivityTime = Date.now();
  sessionStorage.setItem("analytics_session_time", lastActivityTime.toString());

  // Add session and context
  const enrichedEvent: AnalyticsEvent = {
    ...event,
    sessionId,
    pageUrl: event.pageUrl || window.location.href,
    pagePath: event.pagePath || window.location.pathname,
    pageTitle: event.pageTitle || document.title,
    referrerUrl: event.referrerUrl || document.referrer,
    timestamp: Date.now(),
  };

  // Add to queue
  eventQueue.push(enrichedEvent);

  // Flush if queue is full
  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    flushEvents();
  }
}

// Flush events to server
async function flushEvents(sync = false): Promise<void> {
  if (eventQueue.length === 0) return;

  const eventsToSend = [...eventQueue];
  eventQueue = [];

  const deviceInfo = getDeviceInfo();
  const utmParams = getUTMParams();

  const payload = {
    events: eventsToSend.map((event) => ({
      ...event,
      ...deviceInfo,
      ...utmParams,
    })),
  };

  if (sync && typeof navigator !== "undefined" && navigator.sendBeacon) {
    // Use sendBeacon for page unload
    navigator.sendBeacon("/api/analytics/events", JSON.stringify(payload));
  } else {
    try {
      await fetch("/api/analytics/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      // Re-queue events on failure
      eventQueue = [...eventsToSend, ...eventQueue];
      console.error("Failed to flush analytics events:", error);
    }
  }
}

// Track page view
export function trackPageView(customData?: Partial<AnalyticsEvent>): void {
  currentPageLoadTime = Date.now();
  trackEvent({
    eventType: UserEventType.PAGE_VIEW,
    eventCategory: EventCategory.NAVIGATION,
    eventAction: "page_view",
    ...customData,
  });
}

// Track click
export function trackClick(
  elementId: string,
  elementLabel?: string,
  targetId?: string,
  targetType?: string
): void {
  trackEvent({
    eventType: UserEventType.CLICK,
    eventCategory: EventCategory.ENGAGEMENT,
    eventAction: "click",
    componentId: elementId,
    eventLabel: elementLabel,
    targetId,
    targetType,
  });
}

// Track search
export function trackSearchEvent(
  query: string,
  filters?: Record<string, unknown>,
  resultsCount?: number
): void {
  trackEvent({
    eventType: UserEventType.SEARCH,
    eventCategory: EventCategory.ENGAGEMENT,
    eventAction: "search",
    searchQuery: query,
    searchFilters: filters,
    eventValue: resultsCount,
  });
}

// Track form interactions
export function trackFormStart(formId: string): void {
  trackEvent({
    eventType: UserEventType.FORM_START,
    eventCategory: EventCategory.CONVERSION,
    eventAction: "form_start",
    componentId: formId,
  });
}

export function trackFormField(formId: string, fieldName: string): void {
  trackEvent({
    eventType: UserEventType.FORM_FIELD,
    eventCategory: EventCategory.CONVERSION,
    eventAction: "form_field",
    componentId: formId,
    eventLabel: fieldName,
  });
}

export function trackFormSubmit(formId: string, success: boolean): void {
  trackEvent({
    eventType: success ? UserEventType.FORM_SUBMIT : UserEventType.FORM_ERROR,
    eventCategory: EventCategory.CONVERSION,
    eventAction: success ? "form_submit" : "form_error",
    componentId: formId,
  });
}

export function trackFormAbandon(formId: string, lastField?: string): void {
  trackEvent({
    eventType: UserEventType.FORM_ABANDON,
    eventCategory: EventCategory.CONVERSION,
    eventAction: "form_abandon",
    componentId: formId,
    eventLabel: lastField,
  });
}

// Track booking funnel
export function trackBookingStart(workerId?: string): void {
  trackEvent({
    eventType: UserEventType.BOOKING_START,
    eventCategory: EventCategory.CONVERSION,
    eventAction: "booking_start",
    targetId: workerId,
    targetType: "worker",
    funnelId: "booking",
    funnelStep: 1,
  });
}

export function trackBookingStep(step: number, stepName: string, workerId?: string): void {
  trackEvent({
    eventType: UserEventType.BOOKING_STEP,
    eventCategory: EventCategory.CONVERSION,
    eventAction: `booking_step_${step}`,
    eventLabel: stepName,
    targetId: workerId,
    targetType: "worker",
    funnelId: "booking",
    funnelStep: step,
  });
}

export function trackBookingComplete(bookingId: string, value: number): void {
  trackEvent({
    eventType: UserEventType.BOOKING_COMPLETE,
    eventCategory: EventCategory.CONVERSION,
    eventAction: "booking_complete",
    targetId: bookingId,
    targetType: "booking",
    eventValue: value,
    funnelId: "booking",
    funnelStep: 99,
  });
}

export function trackBookingAbandon(step: number, reason?: string): void {
  trackEvent({
    eventType: UserEventType.BOOKING_ABANDON,
    eventCategory: EventCategory.CONVERSION,
    eventAction: "booking_abandon",
    eventLabel: reason,
    funnelId: "booking",
    funnelStep: step,
  });
}

// Track payments
export function trackPaymentStart(bookingId: string, amount: number): void {
  trackEvent({
    eventType: UserEventType.PAYMENT_START,
    eventCategory: EventCategory.REVENUE,
    eventAction: "payment_start",
    targetId: bookingId,
    targetType: "booking",
    eventValue: amount,
  });
}

export function trackPaymentSuccess(bookingId: string, amount: number): void {
  trackEvent({
    eventType: UserEventType.PAYMENT_SUCCESS,
    eventCategory: EventCategory.REVENUE,
    eventAction: "payment_success",
    targetId: bookingId,
    targetType: "booking",
    eventValue: amount,
  });
}

export function trackPaymentFailure(bookingId: string, reason?: string): void {
  trackEvent({
    eventType: UserEventType.PAYMENT_FAILURE,
    eventCategory: EventCategory.REVENUE,
    eventAction: "payment_failure",
    targetId: bookingId,
    targetType: "booking",
    eventLabel: reason,
  });
}

// Track profile views
export function trackProfileView(workerId: string): void {
  trackEvent({
    eventType: UserEventType.PROFILE_VIEW,
    eventCategory: EventCategory.ENGAGEMENT,
    eventAction: "profile_view",
    targetId: workerId,
    targetType: "worker",
  });
}

// Track feature usage
export function trackFeatureUse(featureName: string, details?: string): void {
  trackEvent({
    eventType: UserEventType.FEATURE_USE,
    eventCategory: EventCategory.ENGAGEMENT,
    eventAction: "feature_use",
    eventLabel: featureName,
    componentId: details,
  });
}

// Track errors
export function trackError(errorType: string, errorMessage: string, componentId?: string): void {
  trackEvent({
    eventType: UserEventType.ERROR,
    eventCategory: EventCategory.ERROR,
    eventAction: errorType,
    eventLabel: errorMessage,
    componentId,
  });
}

// Track auth events
export function trackLogin(method: string): void {
  trackEvent({
    eventType: UserEventType.LOGIN,
    eventCategory: EventCategory.ACQUISITION,
    eventAction: "login",
    eventLabel: method,
  });
}

export function trackSignup(method: string, role: string): void {
  trackEvent({
    eventType: UserEventType.SIGNUP,
    eventCategory: EventCategory.ACQUISITION,
    eventAction: "signup",
    eventLabel: `${method}_${role}`,
  });
}

// Track referrals
export function trackReferral(referralCode: string, referrerId?: string): void {
  trackEvent({
    eventType: UserEventType.CUSTOM,
    eventCategory: EventCategory.ACQUISITION,
    eventAction: "referral_signup",
    eventLabel: referralCode,
    targetId: referrerId,
    targetType: "user",
  });
}

// Track churn indicators
export function trackChurnIndicator(indicator: string, details?: string): void {
  trackEvent({
    eventType: UserEventType.CUSTOM,
    eventCategory: EventCategory.RETENTION,
    eventAction: "churn_indicator",
    eventLabel: indicator,
    componentId: details,
  });
}

export function trackLogout(): void {
  trackEvent({
    eventType: UserEventType.LOGOUT,
    eventCategory: EventCategory.ENGAGEMENT,
    eventAction: "logout",
  });
}

// Track messages
export function trackMessageSend(recipientId: string, bookingId?: string): void {
  trackEvent({
    eventType: UserEventType.MESSAGE_SEND,
    eventCategory: EventCategory.ENGAGEMENT,
    eventAction: "message_send",
    targetId: recipientId,
    targetType: "user",
    componentId: bookingId,
  });
}

// Track reviews
export function trackReviewSubmit(workerId: string, rating: number): void {
  trackEvent({
    eventType: UserEventType.REVIEW_SUBMIT,
    eventCategory: EventCategory.ENGAGEMENT,
    eventAction: "review_submit",
    targetId: workerId,
    targetType: "worker",
    eventValue: rating,
  });
}

// Scroll tracking
let maxScrollDepth = 0;

function setupScrollTracking(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("scroll", () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;

    const scrollPercent = Math.round((scrollTop / docHeight) * 100);

    if (scrollPercent > maxScrollDepth) {
      maxScrollDepth = scrollPercent;

      // Track at 25%, 50%, 75%, 100%
      if ([25, 50, 75, 100].includes(scrollPercent)) {
        trackEvent({
          eventType: UserEventType.SCROLL,
          eventCategory: EventCategory.ENGAGEMENT,
          eventAction: "scroll_depth",
          eventValue: scrollPercent,
          scrollDepth: scrollPercent,
        });
      }
    }
  });

  // Reset on page change
  window.addEventListener("popstate", () => {
    maxScrollDepth = 0;
  });
}

// Visibility tracking
function setupVisibilityTracking(): void {
  if (typeof window === "undefined") return;

  document.addEventListener("visibilitychange", () => {
    trackEvent({
      eventType: UserEventType.CUSTOM,
      eventCategory: EventCategory.ENGAGEMENT,
      eventAction: document.hidden ? "page_hidden" : "page_visible",
    });
  });
}

// Auto click tracking for data-track elements
function setupClickTracking(): void {
  if (typeof window === "undefined") return;

  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const trackElement = target.closest("[data-track]");

    if (trackElement) {
      const trackData = trackElement.getAttribute("data-track");
      const trackLabel = trackElement.getAttribute("data-track-label");
      const trackTarget = trackElement.getAttribute("data-track-target");
      const trackTargetType = trackElement.getAttribute("data-track-target-type");

      trackClick(
        trackData || "unknown",
        trackLabel || undefined,
        trackTarget || undefined,
        trackTargetType || undefined
      );
    }
  });
}

// Custom event
export function trackCustomEvent(
  action: string,
  label?: string,
  value?: number,
  customData?: Record<string, unknown>
): void {
  trackEvent({
    eventType: UserEventType.CUSTOM,
    eventCategory: EventCategory.ENGAGEMENT,
    eventAction: action,
    eventLabel: label,
    eventValue: value,
    searchFilters: customData,
  });
}

// Get session ID (for external use)
export function getEventSessionId(): string | null {
  return sessionId;
}

// Clean up (call on unmount if needed)
export function cleanupEventTracking(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  flushEvents(true);
}
