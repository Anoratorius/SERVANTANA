"use client";

import { useTranslations } from "next-intl";
import { BackButton } from "@/components/ui/back-button";

export default function AboutPage() {
  const t = useTranslations();

  return (
    <>
        {/* Hero */}
        <section className="bg-gradient-to-br from-blue-50 via-white to-green-50 py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <BackButton />
            <div className="text-center">
            <h1 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-logo)' }}>
              {t("about.title")}
            </h1>
            <p className="text-lg md:text-xl text-gray-600">
              {t("about.subtitle")}
            </p>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">{t("about.mission.title")}</h2>
            <p className="text-gray-600 leading-relaxed">{t("about.mission.content")}</p>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center">{t("about.values.title")}</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🤝</span>
                </div>
                <h3 className="font-bold mb-2">{t("about.values.trust.title")}</h3>
                <p className="text-gray-600 text-sm">{t("about.values.trust.content")}</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⭐</span>
                </div>
                <h3 className="font-bold mb-2">{t("about.values.quality.title")}</h3>
                <p className="text-gray-600 text-sm">{t("about.values.quality.content")}</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💡</span>
                </div>
                <h3 className="font-bold mb-2">{t("about.values.innovation.title")}</h3>
                <p className="text-gray-600 text-sm">{t("about.values.innovation.content")}</p>
              </div>
            </div>
          </div>
        </section>
    </>
  );
}
