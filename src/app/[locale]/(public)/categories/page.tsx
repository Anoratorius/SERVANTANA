"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const { data: session } = useSession();
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [isWorkerOnboarding, setIsWorkerOnboarding] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isContinuing, setIsContinuing] = useState(false);

  // Check if this is a worker who needs to select categories
  useEffect(() => {
    async function checkWorkerOnboarding() {
      if (session?.user?.role === "CLEANER") {
        try {
          const response = await fetch("/api/cleaner/professions");
          if (response.ok) {
            const professions = await response.json();
            // Worker needs onboarding if they have no professions
            setIsWorkerOnboarding(professions.length === 0);
          }
        } catch (error) {
          console.error("Failed to check worker professions:", error);
        }
      }
      setIsLoading(false);
    }

    if (session) {
      checkWorkerOnboarding();
    } else {
      setIsLoading(false);
    }
  }, [session]);

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
    if (isWorkerOnboarding) {
      // In worker onboarding mode, toggle selection
      toggleCategorySelection(categoryId, isCustom);
    } else {
      // Normal customer mode - navigate
      if (isSpecial) {
        router.push("/categories/suggest");
      } else if (isCustom) {
        router.push(`/categories/custom/${categoryId}`);
      } else {
        router.push(`/categories/${categoryId}`);
      }
    }
  };

  const toggleCategorySelection = (categoryId: string, isCustom?: boolean) => {
    const fullId = isCustom ? `custom:${categoryId}` : categoryId;
    setSelectedCategories((prev) =>
      prev.includes(fullId)
        ? prev.filter((id) => id !== fullId)
        : [...prev, fullId]
    );
  };

  const handleContinue = () => {
    if (selectedCategories.length === 0) return;
    setIsContinuing(true);
    // Navigate to profession selection with selected categories
    const categoryParams = selectedCategories.join(",");
    router.push(`/worker/setup?categories=${encodeURIComponent(categoryParams)}`);
  };

  const isCategorySelected = (categoryId: string, isCustom?: boolean) => {
    const fullId = isCustom ? `custom:${categoryId}` : categoryId;
    return selectedCategories.includes(fullId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-br from-blue-50 via-white to-green-50 py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Different header for workers vs customers */}
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-logo)' }}>
            {isWorkerOnboarding ? t("categories.workerTitle") : t("categories.pageTitle")}
          </h1>
          <p className="text-gray-600 text-center mb-8 max-w-2xl mx-auto">
            {isWorkerOnboarding ? t("categories.workerSubtitle") : t("categories.pageSubtitle")}
          </p>

          {/* Selected categories badge for workers */}
          {isWorkerOnboarding && selectedCategories.length > 0 && (
            <div className="flex justify-center mb-8">
              <Badge variant="secondary" className="text-sm px-4 py-2">
                {selectedCategories.length} {t("categories.categoriesSelected")}
              </Badge>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 max-w-5xl mx-auto">
            {/* Built-in categories (except Create Yours) */}
            {CATEGORIES.filter(c => !(c as { isSpecial?: boolean }).isSpecial).map((category) => {
              const isSelected = isCategorySelected(category.id);
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className={cn(
                    "group relative flex flex-col items-center p-6 bg-white rounded-2xl border shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2",
                    isWorkerOnboarding && isSelected
                      ? "border-green-500 ring-2 ring-green-500 bg-green-50"
                      : "border-gray-100"
                  )}
                >
                  {/* Selection checkmark for workers */}
                  {isWorkerOnboarding && isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
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
              );
            })}

            {/* Custom approved categories */}
            {customCategories.map((category) => {
              const isSelected = isCategorySelected(category.id, true);
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id, false, true)}
                  className={cn(
                    "group relative flex flex-col items-center p-6 bg-white rounded-2xl border shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2",
                    isWorkerOnboarding && isSelected
                      ? "border-green-500 ring-2 ring-green-500 bg-green-50"
                      : "border-gray-100"
                  )}
                >
                  {/* Selection checkmark for workers */}
                  {isWorkerOnboarding && isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
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
              );
            })}

            {/* Create Yours button - only for customers, not worker onboarding */}
            {!isWorkerOnboarding && CATEGORIES.filter(c => (c as { isSpecial?: boolean }).isSpecial).map((category) => (
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

          {/* Continue button for worker onboarding */}
          {isWorkerOnboarding && (
            <div className="mt-12 flex justify-center">
              <Button
                onClick={handleContinue}
                disabled={selectedCategories.length === 0 || isContinuing}
                size="lg"
                className="px-8"
              >
                {isContinuing ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="h-5 w-5 mr-2" />
                )}
                {t("categories.continueToSetup")}
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
