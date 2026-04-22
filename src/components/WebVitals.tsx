"use client";

import { useReportWebVitals } from "next/web-vitals";
import { reportWebVital } from "@/lib/performance";

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Map Next.js metric to our format
    const rating =
      metric.rating === "good"
        ? "good"
        : metric.rating === "needs-improvement"
          ? "needs-improvement"
          : "poor";

    reportWebVital({
      id: metric.id,
      name: metric.name as "CLS" | "FCP" | "FID" | "INP" | "LCP" | "TTFB",
      value: metric.value,
      rating,
      delta: metric.delta,
      navigationType: metric.navigationType,
    });
  });

  return null;
}
