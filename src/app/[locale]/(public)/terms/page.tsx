"use client";

import { useTranslations } from "next-intl";
import { Header, Footer } from "@/components/layout";
import { BackButton } from "@/components/ui/back-button";

export default function TermsPage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-white py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <BackButton href="/" />
          <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent text-center" style={{ fontFamily: 'var(--font-logo)' }}>{t("legal.terms.title")}</h1>

          <div className="prose prose-gray max-w-none space-y-6">
            <p className="text-sm text-muted-foreground">{t("legal.terms.lastUpdated")}: March 2026</p>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">{t("legal.terms.acceptance.title")}</h2>
              <p>{t("legal.terms.acceptance.content")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">{t("legal.terms.service.title")}</h2>
              <p>{t("legal.terms.service.content")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">{t("legal.terms.accounts.title")}</h2>
              <p>{t("legal.terms.accounts.content")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">{t("legal.terms.payments.title")}</h2>
              <p>{t("legal.terms.payments.content")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">{t("legal.terms.liability.title")}</h2>
              <p>{t("legal.terms.liability.content")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">{t("legal.terms.termination.title")}</h2>
              <p>{t("legal.terms.termination.content")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">{t("legal.terms.changes.title")}</h2>
              <p>{t("legal.terms.changes.content")}</p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
