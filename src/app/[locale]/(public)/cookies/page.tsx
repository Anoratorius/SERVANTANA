"use client";

import { useTranslations } from "next-intl";
import { Header, Footer } from "@/components/layout";
import { BackButton } from "@/components/ui/back-button";

export default function CookiePolicyPage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-white py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <BackButton />
          <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent text-center" style={{ fontFamily: 'var(--font-logo)' }}>{t("legal.cookies.title")}</h1>

          <div className="prose prose-gray max-w-none space-y-6">
            <p className="text-sm text-muted-foreground">{t("legal.cookies.lastUpdated")}: March 2026</p>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">{t("legal.cookies.what.title")}</h2>
              <p>{t("legal.cookies.what.content")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">{t("legal.cookies.types.title")}</h2>
              <p>{t("legal.cookies.types.content")}</p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li><strong>{t("legal.cookies.types.essential.title")}:</strong> {t("legal.cookies.types.essential.content")}</li>
                <li><strong>{t("legal.cookies.types.functional.title")}:</strong> {t("legal.cookies.types.functional.content")}</li>
                <li><strong>{t("legal.cookies.types.analytics.title")}:</strong> {t("legal.cookies.types.analytics.content")}</li>
                <li><strong>{t("legal.cookies.types.marketing.title")}:</strong> {t("legal.cookies.types.marketing.content")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">{t("legal.cookies.manage.title")}</h2>
              <p>{t("legal.cookies.manage.content")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">{t("legal.cookies.thirdParty.title")}</h2>
              <p>{t("legal.cookies.thirdParty.content")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">{t("legal.cookies.contact.title")}</h2>
              <p>{t("legal.cookies.contact.content")}</p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
