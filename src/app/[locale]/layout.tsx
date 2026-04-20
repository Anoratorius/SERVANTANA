import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { CurrencyProvider } from "@/components/providers/CurrencyProvider";
import { Toaster } from "@/components/ui/sonner";
import { PermissionsOnboarding } from "@/components/onboarding/PermissionsOnboarding";
import { SplashController } from "@/components/layout/SplashController";
import LocationVerificationProvider from "@/components/location/LocationVerificationProvider";
import ProfessionOnboardingProvider from "@/components/onboarding/ProfessionOnboardingProvider";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as typeof routing.locales[number])) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <SessionProvider>
      <NextIntlClientProvider messages={messages}>
        <CurrencyProvider>
          <LocationVerificationProvider>
            <ProfessionOnboardingProvider>
              <SplashController />
              {children}
              <Toaster />
              <PermissionsOnboarding locale={locale} />
            </ProfessionOnboardingProvider>
          </LocationVerificationProvider>
        </CurrencyProvider>
      </NextIntlClientProvider>
    </SessionProvider>
  );
}
