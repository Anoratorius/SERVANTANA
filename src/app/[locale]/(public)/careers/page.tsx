"use client";

import { useTranslations } from "next-intl";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, MapPin, Clock } from "lucide-react";

const POSITIONS = [
  { id: "frontend", department: "engineering", location: "remote", type: "fullTime" },
  { id: "backend", department: "engineering", location: "remote", type: "fullTime" },
  { id: "designer", department: "design", location: "remote", type: "fullTime" },
  { id: "marketing", department: "marketing", location: "hybrid", type: "fullTime" },
  { id: "support", department: "support", location: "remote", type: "partTime" },
];

export default function CareersPage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-blue-50 via-white to-green-50 py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <BackButton href="/" />
            <div className="text-center">
              <h1 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-logo)' }}>
                {t("careers.title")}
              </h1>
              <p className="text-lg md:text-xl text-gray-600 mb-8">
                {t("careers.subtitle")}
              </p>
            </div>
          </div>
        </section>

        {/* Why Join */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-logo)' }}>{t("careers.why.title")}</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🚀</span>
                </div>
                <h3 className="font-bold mb-2">{t("careers.why.growth.title")}</h3>
                <p className="text-gray-600 text-sm">{t("careers.why.growth.content")}</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🏠</span>
                </div>
                <h3 className="font-bold mb-2">{t("careers.why.remote.title")}</h3>
                <p className="text-gray-600 text-sm">{t("careers.why.remote.content")}</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💰</span>
                </div>
                <h3 className="font-bold mb-2">{t("careers.why.benefits.title")}</h3>
                <p className="text-gray-600 text-sm">{t("careers.why.benefits.content")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Open Positions */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center">{t("careers.positions.title")}</h2>
            <div className="space-y-4">
              {POSITIONS.map((position) => (
                <Card key={position.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-lg">{t(`careers.positions.${position.id}.title`)}</h3>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-4 w-4" />
                            {t(`careers.departments.${position.department}`)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {t(`careers.locations.${position.location}`)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {t(`careers.types.${position.type}`)}
                          </span>
                        </div>
                      </div>
                      <Button>{t("careers.apply")}</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* No Position */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <h2 className="text-xl font-bold mb-4">{t("careers.noPosition.title")}</h2>
            <p className="text-gray-600 mb-6">{t("careers.noPosition.content")}</p>
            <Button variant="outline">{t("careers.noPosition.button")}</Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
