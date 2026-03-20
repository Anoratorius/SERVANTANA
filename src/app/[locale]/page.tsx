import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Header, Footer } from "@/components/layout";
import { HeaderLocation } from "@/components/layout/HeaderLocation";
import { CTAButtons } from "@/components/home/CTAButtons";
import { ScrollIndicator } from "@/components/home/ScrollIndicator";
import { HeroSearch } from "@/components/home/HeroSearch";
import { HeroBackground } from "@/components/home/HeroBackground";
import {
  Search,
  Shield,
  DollarSign,
  Calendar,
  Lock,
  UserCheck,
  CalendarCheck,
  Sparkles,
} from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
};

// Helper Components - defined before use
function FeatureCard({ icon, title, color }: { icon: React.ReactNode; title: string; color: "blue" | "teal" | "green" | "emerald" }) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    teal: "from-teal-500 to-teal-600",
    green: "from-green-500 to-green-600",
    emerald: "from-emerald-500 to-emerald-600",
  };

  return (
    <Card className="text-center border shadow-sm hover:shadow-lg transition-all duration-300 ease-out bg-white cursor-pointer transform-gpu hover:scale-105 will-change-transform w-full max-w-xs" style={{ backfaceVisibility: "hidden", WebkitFontSmoothing: "subpixel-antialiased" }}>
      <CardContent className="pt-6">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br ${colorClasses[color]} text-white mb-4`}>
          {icon}
        </div>
        <h3 className="font-bold text-xl">{title}</h3>
      </CardContent>
    </Card>
  );
}

function FlowStep({
  icon,
  title,
  color,
  small = false
}: {
  icon: React.ReactNode;
  title: string;
  color: "blue" | "teal" | "green" | "emerald";
  small?: boolean;
}) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600 shadow-blue-500/30",
    teal: "from-teal-500 to-teal-600 shadow-teal-500/30",
    green: "from-green-500 to-green-600 shadow-green-500/30",
    emerald: "from-emerald-500 to-emerald-600 shadow-emerald-500/30",
  };

  const bgClasses = {
    blue: "bg-blue-50 border-blue-200",
    teal: "bg-teal-50 border-teal-200",
    green: "bg-green-50 border-green-200",
    emerald: "bg-emerald-50 border-emerald-200",
  };

  return (
    <div className="flex flex-col items-center text-center group">
      <div className={`${small ? 'w-12 h-12 mb-2' : 'w-20 h-20 mb-6'} rounded-full bg-gradient-to-br ${colorClasses[color]} text-white flex items-center justify-center shadow-xl transition-transform group-hover:scale-110`}>
        {icon}
      </div>
      <div className={`w-full ${small ? 'p-2' : 'p-5'} rounded-xl border ${bgClasses[color]} transition-all group-hover:shadow-md`}>
        <h3 className={`font-bold ${small ? 'text-xs' : 'text-xl'} text-gray-800`}>{title}</h3>
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

        {/* Features Section */}
        <section id="features" className="py-20 bg-white w-full">
          <div className="w-full px-4 flex flex-col items-center">
            {/* Mobile Location - Only visible on mobile */}
            <div className="md:hidden mb-8">
              <HeaderLocation />
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto justify-items-center">
              <FeatureCard
                icon={<Shield className="h-10 w-10" />}
                title={t("home.features.verified.title")}
                color="blue"
              />
              <FeatureCard
                icon={<Lock className="h-10 w-10" />}
                title={t("home.features.secure.title")}
                color="teal"
              />
              <FeatureCard
                icon={<Calendar className="h-10 w-10" />}
                title={t("home.features.flexible.title")}
                color="green"
              />
              <FeatureCard
                icon={<DollarSign className="h-10 w-10" />}
                title={t("home.features.transparent.title")}
                color="emerald"
              />
            </div>
          </div>
        </section>

        {/* Flow Section */}
        <section className="py-20 bg-muted/30 overflow-hidden w-full">
          <div className="w-full px-4 max-w-5xl mx-auto">
            {/* Desktop Flow - Horizontal Connected Timeline */}
            <div className="hidden lg:block relative max-w-5xl mx-auto">
              {/* Connecting Line */}
              <div className="absolute top-10 left-[12.5%] right-[12.5%] h-1 bg-gradient-to-r from-blue-500 via-teal-500 via-green-500 to-emerald-500 rounded-full" />

              
              <div className="grid grid-cols-4 gap-6 relative">
                <FlowStep
                  icon={<Search className="h-8 w-8" />}
                  title={t("home.howItWorks.step1.title")}
                  color="blue"
                />
                <FlowStep
                  icon={<UserCheck className="h-8 w-8" />}
                  title={t("home.howItWorks.step2.title")}
                  color="teal"
                />
                <FlowStep
                  icon={<CalendarCheck className="h-8 w-8" />}
                  title={t("home.howItWorks.step3.title")}
                  color="green"
                />
                <FlowStep
                  icon={<Sparkles className="h-8 w-8" />}
                  title={t("home.howItWorks.step4.title")}
                  color="emerald"
                />
              </div>
            </div>

            {/* Mobile Flow - Horizontal in one line */}
            <div className="lg:hidden relative flex flex-col items-center">
              {/* Connecting Line */}
              <div className="absolute top-6 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-blue-500 via-teal-500 via-green-500 to-emerald-500 rounded-full" />

              <div className="grid grid-cols-4 gap-2 relative">
                <FlowStep
                  icon={<Search className="h-5 w-5" />}
                  title={t("home.howItWorks.step1.title")}
                  color="blue"
                  small
                />
                <FlowStep
                  icon={<UserCheck className="h-5 w-5" />}
                  title={t("home.howItWorks.step2.title")}
                  color="teal"
                  small
                />
                <FlowStep
                  icon={<CalendarCheck className="h-5 w-5" />}
                  title={t("home.howItWorks.step3.title")}
                  color="green"
                  small
                />
                <FlowStep
                  icon={<Sparkles className="h-5 w-5" />}
                  title={t("home.howItWorks.step4.title")}
                  color="emerald"
                  small
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
