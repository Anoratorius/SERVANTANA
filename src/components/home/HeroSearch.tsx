"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function HeroSearch() {
  const t = useTranslations();
  const router = useRouter();

  const handleHomeServicesClick = () => {
    router.push("/categories/home_services");
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-xs sm:max-w-md mx-auto px-4 sm:px-0">
      <Button
        onClick={handleHomeServicesClick}
        className="w-full h-16 md:h-18 text-xl md:text-2xl bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all uppercase cursor-pointer"
        style={{ fontFamily: 'var(--font-logo)' }}
      >
        {t("categories.home_services")}
      </Button>
    </div>
  );
}
