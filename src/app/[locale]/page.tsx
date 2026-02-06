import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Header, Footer } from "@/components/layout";
import { CTAButtons } from "@/components/home/CTAButtons";
import { ScrollIndicator } from "@/components/home/ScrollIndicator";
import {
  Search,
  Shield,
  DollarSign,
  Calendar,
  Lock,
  ChevronRight,
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
    <Card className="text-center border shadow-sm hover:shadow-lg transition-all duration-300 ease-out bg-white cursor-pointer transform-gpu hover:scale-105 will-change-transform" style={{ backfaceVisibility: "hidden", WebkitFontSmoothing: "subpixel-antialiased" }}>
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
  color
}: {
  icon: React.ReactNode;
  title: string;
  color: "blue" | "teal" | "green" | "emerald";
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
      <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${colorClasses[color]} text-white flex items-center justify-center mb-6 shadow-xl transition-transform group-hover:scale-110`}>
        {icon}
      </div>
      <div className={`w-full p-5 rounded-xl border ${bgClasses[color]} transition-all group-hover:shadow-md`}>
        <h3 className="font-bold text-xl text-gray-800">{title}</h3>
      </div>
    </div>
  );
}

function MobileFlowStep({
  icon,
  title,
  color,
  isLast
}: {
  icon: React.ReactNode;
  title: string;
  color: "blue" | "teal" | "green" | "emerald";
  isLast: boolean;
}) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    teal: "from-teal-500 to-teal-600",
    green: "from-green-500 to-green-600",
    emerald: "from-emerald-500 to-emerald-600",
  };

  return (
    <div className="relative flex gap-4 items-center">
      <div className="flex flex-col items-center">
        <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${colorClasses[color]} text-white flex items-center justify-center shadow-lg flex-shrink-0`}>
          {icon}
        </div>
        {!isLast && (
          <div
            className="w-1 h-8 my-2 rounded-full"
            style={{
              backgroundImage: `linear-gradient(to bottom, ${color === "blue" ? "#3b82f6, #14b8a6" : color === "teal" ? "#14b8a6, #22c55e" : "#22c55e, #10b981"})`,
            }}
          />
        )}
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-xl text-gray-800">{title}</h3>
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
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-50 via-white to-green-50 py-4 md:py-8">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-5xl md:text-8xl font-bold tracking-tight mb-14 pb-1 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent leading-tight">
              {t("home.hero.title")}
            </h1>
            <p className="text-xl md:text-2xl font-bold tracking-tight mb-16 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              {t("home.hero.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder={t("home.hero.searchPlaceholder")}
                  className="pl-10 h-12"
                />
              </div>
              <Link href="/search">
                <Button size="lg" className="h-12 w-full sm:w-auto bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700">
                  {t("home.hero.searchButton")}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Scroll Indicator */}
            <ScrollIndicator />
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
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
        <section className="py-20 bg-muted/30 overflow-hidden">
          <div className="container mx-auto px-4">
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

            {/* Mobile Flow - Vertical Timeline */}
            <div className="lg:hidden relative">
              <div className="space-y-0">
                <MobileFlowStep
                  icon={<Search className="h-6 w-6" />}
                  title={t("home.howItWorks.step1.title")}
                  color="blue"
                  isLast={false}
                />
                <MobileFlowStep
                  icon={<UserCheck className="h-6 w-6" />}
                  title={t("home.howItWorks.step2.title")}
                  color="teal"
                  isLast={false}
                />
                <MobileFlowStep
                  icon={<CalendarCheck className="h-6 w-6" />}
                  title={t("home.howItWorks.step3.title")}
                  color="green"
                  isLast={false}
                />
                <MobileFlowStep
                  icon={<Sparkles className="h-6 w-6" />}
                  title={t("home.howItWorks.step4.title")}
                  color="emerald"
                  isLast={true}
                />
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 bg-gradient-to-r from-blue-600 to-green-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-8">
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
