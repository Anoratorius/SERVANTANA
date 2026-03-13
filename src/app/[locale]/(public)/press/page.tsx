import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function PressPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PressContent />;
}

function PressContent() {
  const t = useTranslations();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-blue-50 via-white to-green-50 py-16">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h1 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-logo)' }}>
              {t("press.title")}
            </h1>
            <p className="text-lg md:text-xl text-gray-600">
              {t("press.subtitle")}
            </p>
          </div>
        </section>

        {/* Company Facts */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center">{t("press.facts.title")}</h2>
            <div className="space-y-4">
              <div className="flex justify-between py-3 border-b">
                <span className="font-medium">{t("press.facts.founded")}</span>
                <span className="text-gray-600">2026</span>
              </div>
              <div className="flex justify-between py-3 border-b">
                <span className="font-medium">{t("press.facts.headquarters")}</span>
                <span className="text-gray-600">Flensburg, Germany</span>
              </div>
              <div className="flex justify-between py-3 border-b">
                <span className="font-medium">{t("press.facts.employees")}</span>
                <span className="text-gray-600">500+</span>
              </div>
              <div className="flex justify-between py-3 border-b">
                <span className="font-medium">{t("press.facts.users")}</span>
                <span className="text-gray-600">100,000+</span>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <h2 className="text-xl font-bold mb-4">{t("press.contact.title")}</h2>
            <p className="text-gray-600 mb-6">{t("press.contact.content")}</p>
            <a href="mailto:press@servantana.com">
              <Button>
                <Mail className="h-4 w-4 mr-2" />
                press@servantana.com
              </Button>
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
