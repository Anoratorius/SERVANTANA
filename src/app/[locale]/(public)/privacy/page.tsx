"use client";

import { useTranslations } from "next-intl";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  const t = useTranslations();
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-white py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <Button variant="ghost" onClick={() => router.back()} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("common.back")}
          </Button>
          <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent text-center" style={{ fontFamily: 'var(--font-logo)' }}>{t("legal.privacy.title")}</h1>

          <div className="prose prose-gray max-w-none space-y-6">
            <p className="text-sm text-muted-foreground">{t("legal.privacy.lastUpdated")}: March 2026</p>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">{t("legal.privacy.collection.title")}</h2>
              <p>{t("legal.privacy.collection.content")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">{t("legal.privacy.use.title")}</h2>
              <p>{t("legal.privacy.use.content")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">{t("legal.privacy.sharing.title")}</h2>
              <p>{t("legal.privacy.sharing.content")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">{t("legal.privacy.security.title")}</h2>
              <p>{t("legal.privacy.security.content")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">{t("legal.privacy.rights.title")}</h2>
              <p>{t("legal.privacy.rights.content")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">{t("legal.privacy.contact.title")}</h2>
              <p>{t("legal.privacy.contact.content")}</p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
