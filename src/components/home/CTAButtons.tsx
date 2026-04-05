"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";

export function CTAButtons({
  customerLabel,
  workerLabel,
}: {
  customerLabel: string;
  workerLabel: string;
}) {
  const { status } = useSession();
  const router = useRouter();
  const locale = useLocale();

  const handleBookWorker = () => {
    if (status === "authenticated") {
      router.push("/search");
    } else {
      router.push(`/login?callbackUrl=/${locale}/search`);
    }
  };

  const handleBecomeWorker = () => {
    if (status === "authenticated") {
      router.push("/dashboard");
    } else {
      router.push(`/login?callbackUrl=/${locale}/dashboard`);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <Button
        size="lg"
        variant="outline"
        className="border-white text-white bg-transparent hover:bg-white hover:text-blue-600 transition-all duration-300"
        onClick={handleBookWorker}
      >
        {customerLabel}
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="border-white text-white bg-transparent hover:bg-white hover:text-green-600 transition-all duration-300"
        onClick={handleBecomeWorker}
      >
        {workerLabel}
      </Button>
    </div>
  );
}
