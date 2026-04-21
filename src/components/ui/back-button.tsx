"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  className?: string;
}

export function BackButton({ className = "" }: BackButtonProps) {
  const t = useTranslations();
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      onClick={() => router.back()}
      className={`min-h-[44px] px-3 py-2 mb-4 -ml-3 ${className}`}
    >
      <ArrowLeft className="h-5 w-5 mr-2" />
      <span className="text-sm font-medium">{t("common.back")}</span>
    </Button>
  );
}
