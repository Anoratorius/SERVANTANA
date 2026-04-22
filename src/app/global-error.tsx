"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "20px",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#666", marginBottom: "24px", textAlign: "center" }}>
            We apologize for the inconvenience. Our team has been notified.
          </p>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => reset()}
              style={{
                padding: "12px 24px",
                backgroundColor: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Try again
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              style={{
                padding: "12px 24px",
                backgroundColor: "#f3f4f6",
                color: "#374151",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Go home
            </button>
          </div>
          {error.digest && (
            <p style={{ marginTop: "24px", fontSize: "12px", color: "#9ca3af" }}>
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
