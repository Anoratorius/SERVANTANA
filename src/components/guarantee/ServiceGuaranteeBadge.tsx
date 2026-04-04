"use client";

import { Shield } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface ServiceGuaranteeBadgeProps {
  variant?: "default" | "compact" | "card";
  showLink?: boolean;
  className?: string;
}

export function ServiceGuaranteeBadge({
  variant = "default",
  showLink = true,
  className,
}: ServiceGuaranteeBadgeProps) {
  const t = useTranslations("guarantee");

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium",
          className
        )}
      >
        <Shield className="w-3 h-3" />
        <span>{t("badge")}</span>
      </div>
    );
  }

  if (variant === "card") {
    const content = (
      <div
        className={cn(
          "flex items-center gap-3 p-4 rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50",
          showLink && "hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer",
          className
        )}
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
          <Shield className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-emerald-800">{t("title")}</p>
          <p className="text-sm text-emerald-600 line-clamp-1">{t("shortDescription")}</p>
        </div>
      </div>
    );

    if (showLink) {
      return <Link href="/guarantee">{content}</Link>;
    }

    return content;
  }

  // Default variant
  const content = (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700",
        showLink && "hover:bg-emerald-200 transition-colors cursor-pointer",
        className
      )}
    >
      <Shield className="w-4 h-4" />
      <span className="text-sm font-medium">{t("badge")}</span>
    </div>
  );

  if (showLink) {
    return <Link href="/guarantee">{content}</Link>;
  }

  return content;
}
