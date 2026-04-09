"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  href: string;
  className?: string;
}

export function BackButton({ href, className = "" }: BackButtonProps) {
  const t = useTranslations();

  return (
    <Link href={href}>
      <Button
        variant="ghost"
        className={`min-h-[44px] px-3 py-2 mb-4 -ml-3 ${className}`}
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        <span className="text-sm font-medium">{t("common.back")}</span>
      </Button>
    </Link>
  );
}
