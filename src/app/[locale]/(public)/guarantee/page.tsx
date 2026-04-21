"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "@/i18n/navigation";
import { BackButton } from "@/components/ui/back-button";
import {
  Shield,
  CheckCircle,
  Clock,
  RefreshCw,
  MessageSquare,
  AlertTriangle,
  BadgeCheck,
} from "lucide-react";

export default function GuaranteePage() {
  const t = useTranslations("guarantee");
  const router = useRouter();

  const coverageItems = [
    { icon: AlertTriangle, key: "noShow" },
    { icon: CheckCircle, key: "incompleteWork" },
    { icon: BadgeCheck, key: "poorQuality" },
    { icon: Shield, key: "propertyDamage" },
    { icon: MessageSquare, key: "unprofessional" },
  ];

  const processSteps = [
    { icon: MessageSquare, key: "fileReport" },
    { icon: Clock, key: "review" },
    { icon: RefreshCw, key: "resolution" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      

      <main className="flex-1 bg-gradient-to-br from-emerald-50 via-white to-green-50 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <BackButton />

          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
              <Shield className="w-10 h-10 text-emerald-600" />
            </div>
            <h1
              className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent"
              style={{ fontFamily: "var(--font-logo)" }}
            >
              {t("pageTitle")}
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">{t("pageSubtitle")}</p>
          </div>

          {/* Main Promise */}
          <Card className="mb-8 border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold text-emerald-800 mb-3">{t("promiseTitle")}</h2>
              <p className="text-emerald-700">{t("promiseDescription")}</p>
            </CardContent>
          </Card>

          {/* What's Covered */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">{t("coverageTitle")}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {coverageItems.map((item) => (
                <Card key={item.key} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {t(`coverage.${item.key}.title`)}
                      </h3>
                      <p className="text-sm text-gray-600">{t(`coverage.${item.key}.description`)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* How It Works */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">{t("processTitle")}</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {processSteps.map((step, index) => (
                <Card key={step.key} className="text-center">
                  <CardContent className="p-6">
                    <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                      <span className="text-emerald-600 font-bold">{index + 1}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {t(`process.${step.key}.title`)}
                    </h3>
                    <p className="text-sm text-gray-600">{t(`process.${step.key}.description`)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Terms */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">{t("termsTitle")}</h2>
            <Card>
              <CardContent className="p-6">
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{t("terms.timeLimit")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{t("terms.bookingOnly")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{t("terms.evidence")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{t("terms.onePerBooking")}</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* CTA */}
          <div className="text-center">
            <p className="text-gray-600 mb-4">{t("ctaText")}</p>
            <Button
              onClick={() => router.push("/search")}
              size="lg"
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
            >
              {t("ctaButton")}
            </Button>
          </div>
        </div>
      </main>

      
    </div>
  );
}
