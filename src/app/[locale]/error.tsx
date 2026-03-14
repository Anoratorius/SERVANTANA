"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();

  useEffect(() => {
    // Log error to monitoring service in production
    if (process.env.NODE_ENV === "production") {
      console.error("Application error:", error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-4">
        <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t("errors.somethingWentWrong")}
        </h1>
        <p className="text-gray-600 mb-6 max-w-md">
          {t("errors.tryAgainLater")}
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={reset} variant="default">
            {t("errors.tryAgain")}
          </Button>
          <Button onClick={() => window.location.href = "/"} variant="outline">
            {t("errors.goHome")}
          </Button>
        </div>
      </div>
    </div>
  );
}
