/**
 * Performance Monitoring Utilities
 * Tracks Core Web Vitals and custom metrics
 */

// Types for web vitals
interface WebVitalMetric {
  id: string;
  name: "CLS" | "FCP" | "FID" | "INP" | "LCP" | "TTFB";
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  navigationType: string;
}

// Store for aggregating metrics
const metricsBuffer: WebVitalMetric[] = [];
const API_TIMES: { endpoint: string; duration: number; timestamp: number }[] = [];

// Thresholds for web vitals ratings
const THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  FID: { good: 100, poor: 300 },
  INP: { good: 200, poor: 500 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
};

/**
 * Get rating for a metric value
 */
function getRating(
  name: keyof typeof THRESHOLDS,
  value: number
): "good" | "needs-improvement" | "poor" {
  const threshold = THRESHOLDS[name];
  if (value <= threshold.good) return "good";
  if (value <= threshold.poor) return "needs-improvement";
  return "poor";
}

/**
 * Report web vital to analytics
 */
export function reportWebVital(metric: WebVitalMetric) {
  // Add to buffer
  metricsBuffer.push(metric);

  // Log in development
  if (process.env.NODE_ENV === "development") {
    const color =
      metric.rating === "good"
        ? "\x1b[32m"
        : metric.rating === "needs-improvement"
          ? "\x1b[33m"
          : "\x1b[31m";
    console.log(
      `${color}[Web Vital] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})\x1b[0m`
    );
  }

  // Send to analytics endpoint (batched)
  if (metricsBuffer.length >= 5) {
    sendMetricsToServer();
  }
}

/**
 * Track API response time
 */
export function trackApiTime(endpoint: string, duration: number) {
  API_TIMES.push({
    endpoint,
    duration,
    timestamp: Date.now(),
  });

  // Keep only last 100 entries
  if (API_TIMES.length > 100) {
    API_TIMES.shift();
  }

  // Log slow APIs in development
  if (process.env.NODE_ENV === "development" && duration > 1000) {
    console.warn(`[Slow API] ${endpoint}: ${duration}ms`);
  }
}

/**
 * Get performance summary
 */
export function getPerformanceSummary() {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  // Filter to last hour
  const recentMetrics = metricsBuffer.filter(
    (m) => parseInt(m.id.split("-")[0]) > oneHourAgo
  );
  const recentApiTimes = API_TIMES.filter((a) => a.timestamp > oneHourAgo);

  // Calculate averages per metric type
  const webVitals: Record<string, { avg: number; count: number; rating: string }> = {};
  for (const metric of recentMetrics) {
    if (!webVitals[metric.name]) {
      webVitals[metric.name] = { avg: 0, count: 0, rating: "good" };
    }
    webVitals[metric.name].count++;
    webVitals[metric.name].avg =
      (webVitals[metric.name].avg * (webVitals[metric.name].count - 1) + metric.value) /
      webVitals[metric.name].count;
    webVitals[metric.name].rating = getRating(
      metric.name as keyof typeof THRESHOLDS,
      webVitals[metric.name].avg
    );
  }

  // Calculate API stats
  const apiStats = {
    totalRequests: recentApiTimes.length,
    avgResponseTime:
      recentApiTimes.length > 0
        ? recentApiTimes.reduce((sum, a) => sum + a.duration, 0) / recentApiTimes.length
        : 0,
    slowRequests: recentApiTimes.filter((a) => a.duration > 1000).length,
    slowestEndpoints: getTopSlowEndpoints(recentApiTimes, 5),
  };

  return {
    webVitals,
    apiStats,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get top N slowest endpoints
 */
function getTopSlowEndpoints(
  times: typeof API_TIMES,
  n: number
): { endpoint: string; avgTime: number }[] {
  const byEndpoint: Record<string, number[]> = {};
  for (const t of times) {
    if (!byEndpoint[t.endpoint]) {
      byEndpoint[t.endpoint] = [];
    }
    byEndpoint[t.endpoint].push(t.duration);
  }

  return Object.entries(byEndpoint)
    .map(([endpoint, durations]) => ({
      endpoint,
      avgTime: durations.reduce((a, b) => a + b, 0) / durations.length,
    }))
    .sort((a, b) => b.avgTime - a.avgTime)
    .slice(0, n);
}

/**
 * Send metrics to server
 */
async function sendMetricsToServer() {
  if (metricsBuffer.length === 0) return;
  if (typeof window === "undefined") return;

  const metrics = [...metricsBuffer];
  metricsBuffer.length = 0; // Clear buffer

  try {
    await fetch("/api/analytics/performance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metrics }),
      // Use beacon API for reliability
      keepalive: true,
    });
  } catch {
    // Silently fail - don't break user experience for analytics
  }
}

// Send remaining metrics on page unload
if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      sendMetricsToServer();
    }
  });
}
