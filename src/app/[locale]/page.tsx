import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Header, Footer } from "@/components/layout";
import { HeaderLocation } from "@/components/layout/HeaderLocation";
import { CTAButtons } from "@/components/home/CTAButtons";
import { ScrollIndicator } from "@/components/home/ScrollIndicator";
import { HeroSearch } from "@/components/home/HeroSearch";
import { HeroBackground } from "@/components/home/HeroBackground";
import {
  Search,
  UserCheck,
  CalendarCheck,
} from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
};

// Helper Components - defined before use
function FlowStep({
  icon,
  title,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  color: "blue" | "teal" | "green";
}) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600 shadow-blue-500/30",
    teal: "from-teal-500 to-teal-600 shadow-teal-500/30",
    green: "from-green-500 to-green-600 shadow-green-500/30",
  };

  const bgClasses = {
    blue: "bg-blue-50 border-blue-200",
    teal: "bg-teal-50 border-teal-200",
    green: "bg-green-50 border-green-200",
  };

  return (
    <div className="flex flex-col items-center text-center group">
      <div className={`w-10 h-10 mb-2 rounded-full bg-gradient-to-br ${colorClasses[color]} text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-110`}>
        {icon}
      </div>
      <div className={`w-full p-2 rounded-lg border ${bgClasses[color]} transition-all group-hover:shadow-md`}>
        <h3 className="font-bold text-sm text-gray-800">{title}</h3>
      </div>
    </div>
  );
}

// Main Page Component
export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations();

  return (
    <div className="min-h-screen flex flex-col items-center">
      <Header />

      <main className="flex-1 w-full flex flex-col items-center">
        {/* Hero Section */}
        <section className="relative py-6 md:py-8 overflow-hidden min-h-[400px] w-full flex justify-center">
          <HeroBackground />
          <div className="w-full max-w-5xl px-4 text-center flex flex-col items-center justify-center relative z-10">
            <h1 className="font-bold tracking-tight mb-6 md:mb-14 pb-1 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent leading-tight text-center max-w-3xl" style={{ fontSize: 'clamp(1.25rem, 4vw, 3rem)', fontFamily: 'var(--font-logo)' }}>
              {t("home.hero.title")}
            </h1>
            <p className="text-base md:text-2xl font-bold tracking-tight mb-8 md:mb-16 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent text-center max-w-2xl px-2">
              {t("home.hero.subtitle")}
            </p>
            <HeroSearch />

            {/* Scroll Indicator */}
            <ScrollIndicator />
          </div>
        </section>

        {/* Mobile Location - Only visible on mobile */}
        <div className="md:hidden py-4 bg-white w-full flex justify-center">
          <HeaderLocation />
        </div>

        {/* Flow Section */}
        <section className="py-12 bg-muted/30 overflow-hidden w-full">
          <div className="w-full px-4 max-w-xl mx-auto">
            <div className="relative">
              {/* Connecting Line */}
              <div className="absolute top-5 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-blue-500 via-teal-500 to-green-500 rounded-full" />

              <div className="grid grid-cols-3 gap-4 relative">
                <FlowStep
                  icon={<Search className="h-4 w-4" />}
                  title={t("home.howItWorks.step1.title")}
                  color="blue"
                />
                <FlowStep
                  icon={<UserCheck className="h-4 w-4" />}
                  title={t("home.howItWorks.step2.title")}
                  color="teal"
                />
                <FlowStep
                  icon={<CalendarCheck className="h-4 w-4" />}
                  title={t("home.howItWorks.step3.title")}
                  color="green"
                />
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 bg-gradient-to-r from-blue-600 to-green-600 text-white w-full">
          <div className="w-full px-4 text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-8" style={{ fontFamily: 'var(--font-logo)' }}>
              {t("home.cta.title")}
            </h2>
            <CTAButtons
              customerLabel={t("home.cta.customerButton")}
              cleanerLabel={t("home.cta.cleanerButton")}
            />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
