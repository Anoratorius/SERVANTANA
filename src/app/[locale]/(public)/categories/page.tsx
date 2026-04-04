"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const CATEGORIES = [
  { id: "home_services", emoji: "🏠", gradient: "from-blue-400 to-blue-600" },
  { id: "construction", emoji: "🔧", gradient: "from-orange-400 to-orange-600" },
  { id: "automotive", emoji: "🚗", gradient: "from-red-400 to-red-600" },
  { id: "personal_care", emoji: "💇", gradient: "from-pink-400 to-pink-600" },
  { id: "care_services", emoji: "👶", gradient: "from-rose-400 to-rose-600" },
  { id: "delivery_moving", emoji: "📦", gradient: "from-amber-400 to-amber-600" },
  { id: "tech_it", emoji: "💻", gradient: "from-cyan-400 to-cyan-600" },
  { id: "events_entertainment", emoji: "🎉", gradient: "from-purple-400 to-purple-600" },
  { id: "education_tutoring", emoji: "📚", gradient: "from-indigo-400 to-indigo-600" },
  { id: "professional_services", emoji: "💼", gradient: "from-slate-400 to-slate-600" },
  { id: "fashion_tailoring", emoji: "👔", gradient: "from-violet-400 to-violet-600" },
  { id: "food_cooking", emoji: "🍳", gradient: "from-yellow-400 to-yellow-600" },
  { id: "security", emoji: "🛡️", gradient: "from-emerald-400 to-emerald-600" },
  { id: "agriculture", emoji: "🌾", gradient: "from-green-400 to-green-600" },
  { id: "suggest_new", emoji: "➕", gradient: "from-gray-400 to-gray-600", isSpecial: true },
];

interface CustomCategory {
  id: string;
  name: string;
  nameDE: string | null;
  emoji: string;
  gradient: string;
}

export default function CategoriesPage() {
  const t = useTranslations();
  const router = useRouter();
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);

  useEffect(() => {
    async function fetchCustomCategories() {
      try {
        const response = await fetch("/api/categories");
        if (response.ok) {
          const data = await response.json();
          setCustomCategories(data);
        }
      } catch (error) {
        console.error("Failed to fetch custom categories:", error);
      }
    }
    fetchCustomCategories();
  }, []);

  const handleCategoryClick = (categoryId: string, isSpecial?: boolean, isCustom?: boolean) => {
    if (isSpecial) {
      router.push("/categories/suggest");
    } else if (isCustom) {
      router.push(`/categories/custom/${categoryId}`);
    } else {
      router.push(`/categories/${categoryId}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-br from-blue-50 via-white to-green-50 py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("common.back")}
          </Button>

          <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-logo)' }}>
            {t("categories.pageTitle")}
          </h1>
          <p className="text-gray-600 text-center mb-8 max-w-2xl mx-auto">
            {t("categories.pageSubtitle")}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 max-w-5xl mx-auto">
            {/* Built-in categories (except Create Yours) */}
            {CATEGORIES.filter(c => !(c as { isSpecial?: boolean }).isSpecial).map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className="group relative flex flex-col items-center p-6 bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${category.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                <div className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br ${category.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
                  <div className="absolute inset-1 rounded-xl bg-white/20" />
                  <span className="text-4xl relative z-10 drop-shadow-md">{category.emoji}</span>
                </div>
                <span className="text-sm font-semibold text-gray-700 text-center group-hover:text-gray-900 transition-colors">
                  {t(`categories.${category.id}`)}
                </span>
                <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-1 bg-gradient-to-r ${category.gradient} rounded-full group-hover:w-16 transition-all duration-300`} />
              </button>
            ))}

            {/* Custom approved categories */}
            {customCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id, false, true)}
                className="group relative flex flex-col items-center p-6 bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${category.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                <div className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br ${category.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
                  <div className="absolute inset-1 rounded-xl bg-white/20" />
                  <span className="text-4xl relative z-10 drop-shadow-md">{category.emoji}</span>
                </div>
                <span className="text-sm font-semibold text-gray-700 text-center group-hover:text-gray-900 transition-colors">
                  {category.name}
                </span>
                <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-1 bg-gradient-to-r ${category.gradient} rounded-full group-hover:w-16 transition-all duration-300`} />
              </button>
            ))}

            {/* Create Yours button */}
            {CATEGORIES.filter(c => (c as { isSpecial?: boolean }).isSpecial).map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id, true)}
                className="group relative flex flex-col items-center p-6 bg-white rounded-2xl border border-dashed border-gray-300 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${category.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                <div className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br ${category.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
                  <div className="absolute inset-1 rounded-xl bg-white/20" />
                  <span className="text-4xl relative z-10 drop-shadow-md">{category.emoji}</span>
                </div>
                <span className="text-sm font-semibold text-gray-700 text-center group-hover:text-gray-900 transition-colors">
                  {t(`categories.${category.id}`)}
                </span>
                <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-1 bg-gradient-to-r ${category.gradient} rounded-full group-hover:w-16 transition-all duration-300`} />
              </button>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
