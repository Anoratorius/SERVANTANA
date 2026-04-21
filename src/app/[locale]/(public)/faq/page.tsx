"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";


const FAQ_ITEMS = [
  "whatIsServantana",
  "howToBook",
  "paymentMethods",
  "cancellation",
  "workerVerification",
  "becomeWorker",
  "pricing",
  "safety",
];

export default function FAQPage() {
  const t = useTranslations();
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggleItem = (id: string) => {
    setOpenItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-blue-50 via-white to-green-50 py-16">
          <div className="container mx-auto px-4 max-w-4xl">

            <div className="text-center">
              <h1 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-logo)' }}>
                {t("faq.title")}
              </h1>
            <p className="text-lg md:text-xl text-gray-600">
              {t("faq.subtitle")}
            </p>
            </div>
          </div>
        </section>

        {/* FAQ Items */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="space-y-4">
              {FAQ_ITEMS.map((item) => (
                <div
                  key={item}
                  className="border rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => toggleItem(item)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium pr-4">{t(`faq.items.${item}.question`)}</span>
                    <ChevronDown
                      className={`h-5 w-5 text-gray-500 flex-shrink-0 transition-transform ${
                        openItems.includes(item) ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {openItems.includes(item) && (
                    <div className="px-5 pb-5 text-gray-600">
                      {t(`faq.items.${item}.answer`)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Still Have Questions */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <h2 className="text-xl font-bold mb-4">{t("faq.contact.title")}</h2>
            <p className="text-gray-600 mb-6">{t("faq.contact.content")}</p>
            <Link href="/contact">
              <span className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity">
                {t("faq.contact.button")}
              </span>
            </Link>
          </div>
        </section>
      </main>

      
    </div>
  );
}
