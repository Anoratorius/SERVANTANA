"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { type Locale } from "@/i18n/config";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const otherLocale: Locale = locale === "en" ? "de" : "en";
  const otherName = otherLocale === "en" ? "English" : "Deutsch";

  const handleSwitch = () => {
    // Preserve search params during language switch
    const searchParams = window.location.search;
    router.push(pathname + searchParams, { locale: otherLocale });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSwitch}
      className="font-semibold border-2 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-600 transition-all"
    >
      {otherName}
    </Button>
  );
}
