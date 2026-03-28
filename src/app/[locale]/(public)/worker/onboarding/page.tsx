"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Check, Loader2, ArrowLeft, ArrowRight, Briefcase, Clock, User, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Built-in categories
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
];

const DAYS_OF_WEEK = [
  { value: 1, key: "monday" },
  { value: 2, key: "tuesday" },
  { value: 3, key: "wednesday" },
  { value: 4, key: "thursday" },
  { value: 5, key: "friday" },
  { value: 6, key: "saturday" },
  { value: 0, key: "sunday" },
];

interface Profession {
  id: string;
  name: string;
  nameDE: string | null;
  emoji: string;
  categoryId: string | null;
  category: {
    id: string;
    name: string;
    nameDE: string | null;
    emoji: string;
  } | null;
}

interface CustomCategory {
  id: string;
  name: string;
  nameDE: string | null;
  emoji: string;
  gradient: string;
}

interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

function WorkerOnboardingContent() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { data: session, status } = useSession();

  // Current step: 1=Categories, 2=Professions, 3=Rate, 4=Availability, 5=Profile, 6=Review
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 6;

  // Step 1: Categories
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Step 2: Professions
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [selectedProfessions, setSelectedProfessions] = useState<string[]>([]);
  const [primaryProfession, setPrimaryProfession] = useState<string | null>(null);

  // Step 3: Rate per profession
  const [professionRates, setProfessionRates] = useState<Record<string, string>>({});
  const [currency] = useState("EUR");

  // Step 4: Availability
  const [availability, setAvailability] = useState<AvailabilitySlot[]>(
    DAYS_OF_WEEK.map((day) => ({
      dayOfWeek: day.value,
      startTime: "09:00",
      endTime: "17:00",
      isActive: day.value >= 1 && day.value <= 5, // Mon-Fri active by default
    }))
  );

  // Step 5: Profile
  const [bio, setBio] = useState("");
  const [experienceYears, setExperienceYears] = useState("1");
  const [ecoFriendly, setEcoFriendly] = useState(false);
  const [petFriendly, setPetFriendly] = useState(false);
  const [serviceRadius, setServiceRadius] = useState("10");

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingProfessions, setIsFetchingProfessions] = useState(false);

  // Redirect if not authenticated or not a worker
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/login");
      return;
    }
    if (session.user.role !== "CLEANER") {
      router.push("/");
      return;
    }
    setIsLoading(false);
  }, [session, status, router]);

  // Fetch custom categories
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

  // Fetch professions when categories are selected
  const fetchProfessions = useCallback(async () => {
    if (selectedCategories.length === 0) {
      setProfessions([]);
      return;
    }

    setIsFetchingProfessions(true);
    try {
      const response = await fetch("/api/professions");
      if (!response.ok) throw new Error("Failed to fetch professions");

      const allProfessions: Profession[] = await response.json();

      // For now, show all professions - the UI will group them
      setProfessions(allProfessions);
    } catch (error) {
      console.error("Failed to fetch professions:", error);
      toast.error(t("workerOnboarding.fetchError"));
    } finally {
      setIsFetchingProfessions(false);
    }
  }, [selectedCategories, t]);

  useEffect(() => {
    if (step === 2) {
      fetchProfessions();
    }
  }, [step, fetchProfessions]);

  const toggleCategory = (categoryId: string, isCustom: boolean = false) => {
    const fullId = isCustom ? `custom:${categoryId}` : categoryId;
    setSelectedCategories((prev) =>
      prev.includes(fullId)
        ? prev.filter((id) => id !== fullId)
        : [...prev, fullId]
    );
  };

  const toggleProfession = (professionId: string) => {
    setSelectedProfessions((prev) => {
      if (prev.includes(professionId)) {
        if (primaryProfession === professionId) {
          setPrimaryProfession(null);
        }
        // Remove rate when deselecting
        setProfessionRates((rates) => {
          const newRates = { ...rates };
          delete newRates[professionId];
          return newRates;
        });
        return prev.filter((id) => id !== professionId);
      } else {
        if (prev.length === 0) {
          setPrimaryProfession(professionId);
        }
        // Initialize rate with default
        setProfessionRates((rates) => ({
          ...rates,
          [professionId]: "25",
        }));
        return [...prev, professionId];
      }
    });
  };

  const toggleAvailability = (dayOfWeek: number) => {
    setAvailability((prev) =>
      prev.map((slot) =>
        slot.dayOfWeek === dayOfWeek
          ? { ...slot, isActive: !slot.isActive }
          : slot
      )
    );
  };

  const updateAvailabilityTime = (dayOfWeek: number, field: "startTime" | "endTime", value: string) => {
    setAvailability((prev) =>
      prev.map((slot) =>
        slot.dayOfWeek === dayOfWeek
          ? { ...slot, [field]: value }
          : slot
      )
    );
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return selectedCategories.length > 0;
      case 2:
        return selectedProfessions.length > 0;
      case 3:
        // Check all selected professions have valid rates
        return selectedProfessions.every((profId) => {
          const rate = parseFloat(professionRates[profId] || "0");
          return !isNaN(rate) && rate > 0;
        });
      case 4:
        return availability.some((slot) => slot.isActive);
      case 5:
        return true; // Bio is optional
      case 6:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) {
      toast.error(t("workerOnboarding.completeStep"));
      return;
    }
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);

    try {
      // Step 1: Update profile with basic info
      const profileResponse = await fetch("/api/cleaner/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hourlyRate: parseFloat(professionRates[primaryProfession || selectedProfessions[0]] || "25"),
          bio: bio.trim() || undefined,
          experienceYears: parseInt(experienceYears) || 0,
          ecoFriendly,
          petFriendly,
          serviceRadius: parseInt(serviceRadius) || 10,
        }),
      });

      if (!profileResponse.ok) {
        throw new Error("Failed to update profile");
      }

      // Step 2: Add professions with their rates
      for (let i = 0; i < selectedProfessions.length; i++) {
        const professionId = selectedProfessions[i];
        const isPrimary = professionId === primaryProfession || (i === 0 && !primaryProfession);
        const hourlyRate = parseFloat(professionRates[professionId] || "25");

        const response = await fetch("/api/cleaner/professions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ professionId, isPrimary, hourlyRate }),
        });

        if (!response.ok) {
          const error = await response.json();
          if (!error.error?.includes("already added")) {
            throw new Error(error.error || "Failed to add profession");
          }
        }
      }

      // Step 3: Set availability
      const activeSlots = availability.filter((slot) => slot.isActive);
      const availabilityResponse = await fetch("/api/cleaner/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability: activeSlots }),
      });

      if (!availabilityResponse.ok) {
        throw new Error("Failed to set availability");
      }

      // Step 4: Complete onboarding
      const completeResponse = await fetch("/api/cleaner/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!completeResponse.ok) {
        const error = await completeResponse.json();
        throw new Error(error.error || "Failed to complete onboarding");
      }

      toast.success(t("workerOnboarding.completed"));
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      toast.error(t("workerOnboarding.saveFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryName = (categoryId: string) => {
    // Check if it's a custom category
    if (categoryId.startsWith("custom:")) {
      const customId = categoryId.replace("custom:", "");
      const custom = customCategories.find((c) => c.id === customId);
      if (custom) {
        return locale === "de" && custom.nameDE ? custom.nameDE : custom.name;
      }
    }
    // Built-in category
    return t(`categories.${categoryId}`);
  };

  const getProfessionName = (profession: Profession) => {
    return locale === "de" && profession.nameDE ? profession.nameDE : profession.name;
  };

  if (status === "loading" || isLoading) {
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

      <main className="flex-1 bg-gradient-to-br from-blue-50 via-white to-green-50 py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex justify-between items-center max-w-2xl mx-auto mb-2">
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <div key={s} className="flex items-center">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors",
                      s < step
                        ? "bg-green-500 text-white"
                        : s === step
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-500"
                    )}
                  >
                    {s < step ? <Check className="h-5 w-5" /> : s}
                  </div>
                  {s < 6 && (
                    <div
                      className={cn(
                        "w-8 md:w-16 h-1 mx-1",
                        s < step ? "bg-green-500" : "bg-gray-200"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-gray-500">
              {t("workerOnboarding.step")} {step} {t("workerOnboarding.of")} {TOTAL_STEPS}
            </p>
          </div>

          {/* Step 1: Categories */}
          {step === 1 && (
            <div className="animate-in fade-in duration-300">
              <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">
                {t("workerOnboarding.step1Title")}
              </h1>
              <p className="text-gray-600 text-center mb-8">
                {t("workerOnboarding.step1Desc")}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {CATEGORIES.map((category) => {
                  const isSelected = selectedCategories.includes(category.id);
                  return (
                    <button
                      key={category.id}
                      onClick={() => toggleCategory(category.id)}
                      className={cn(
                        "relative flex flex-col items-center justify-center p-3 sm:p-4 min-h-[100px] sm:min-h-[120px] bg-white rounded-xl border-2 transition-all",
                        isSelected
                          ? "border-blue-500 ring-2 ring-blue-200 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      {isSelected && (
                        <Check className="absolute top-2 right-2 h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                      )}
                      <span className="text-3xl sm:text-4xl mb-2">{category.emoji}</span>
                      <span className="text-xs sm:text-sm font-medium text-center leading-tight">
                        {t(`categories.${category.id}`)}
                      </span>
                    </button>
                  );
                })}
                {/* Only show custom categories that don't match built-in category IDs */}
                {customCategories
                  .filter((category) => !CATEGORIES.some((c) => c.id === category.id || c.id === category.name.toLowerCase().replace(/[^a-z]/g, "_")))
                  .map((category) => {
                  const isSelected = selectedCategories.includes(`custom:${category.id}`);
                  return (
                    <button
                      key={category.id}
                      onClick={() => toggleCategory(category.id, true)}
                      className={cn(
                        "relative flex flex-col items-center justify-center p-3 sm:p-4 min-h-[100px] sm:min-h-[120px] bg-white rounded-xl border-2 transition-all",
                        isSelected
                          ? "border-blue-500 ring-2 ring-blue-200 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      {isSelected && (
                        <Check className="absolute top-2 right-2 h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                      )}
                      <span className="text-3xl sm:text-4xl mb-2">{category.emoji}</span>
                      <span className="text-xs sm:text-sm font-medium text-center leading-tight">
                        {locale === "de" && category.nameDE ? category.nameDE : category.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedCategories.length > 0 && (
                <p className="text-center text-sm text-blue-600 mt-4">
                  {selectedCategories.length} {t("workerOnboarding.categoriesSelected")}
                </p>
              )}
            </div>
          )}

          {/* Step 2: Professions grouped by category */}
          {step === 2 && (
            <div className="animate-in fade-in duration-300">
              <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">
                {t("workerOnboarding.step2Title")}
              </h1>
              <p className="text-gray-600 text-center mb-8">
                {t("workerOnboarding.step2Desc")}
              </p>

              {isFetchingProfessions ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : professions.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">{t("workerOnboarding.noProfessions")}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Group professions by category */}
                  {selectedCategories.map((catId) => {
                    const isCustomCategory = catId.startsWith("custom:");
                    const categoryKey = isCustomCategory ? catId.replace("custom:", "") : catId;

                    // Filter professions for this category
                    const categoryProfessions = professions.filter((p) => {
                      if (isCustomCategory) {
                        return p.categoryId === categoryKey;
                      }
                      // Match built-in categories by category name pattern
                      return p.category?.name?.toLowerCase().replace(/[^a-z]/g, "_").includes(catId.replace(/_/g, "")) ||
                             p.categoryId === catId;
                    });

                    if (categoryProfessions.length === 0) return null;

                    return (
                      <div key={catId} className="bg-white rounded-xl p-4 border border-gray-200">
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                          {CATEGORIES.find((c) => c.id === catId)?.emoji || "📁"}
                          {getCategoryName(catId)}
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {categoryProfessions.map((profession) => {
                            const isSelected = selectedProfessions.includes(profession.id);
                            const isPrimary = primaryProfession === profession.id;
                            return (
                              <button
                                key={profession.id}
                                onClick={() => toggleProfession(profession.id)}
                                className={cn(
                                  "relative flex flex-col items-center p-3 bg-gray-50 rounded-lg border-2 transition-all",
                                  isSelected
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 hover:border-gray-300"
                                )}
                              >
                                {isSelected && (
                                  <div className={cn(
                                    "absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center",
                                    isPrimary ? "bg-yellow-500" : "bg-blue-500"
                                  )}>
                                    <Check className="h-3 w-3 text-white" />
                                  </div>
                                )}
                                <span className="text-2xl mb-1">{profession.emoji}</span>
                                <span className="text-xs font-medium text-center">
                                  {getProfessionName(profession)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Show professions without category match */}
                  {professions.filter((p) => !selectedCategories.some((catId) => {
                    const isCustomCategory = catId.startsWith("custom:");
                    const categoryKey = isCustomCategory ? catId.replace("custom:", "") : catId;
                    if (isCustomCategory) return p.categoryId === categoryKey;
                    return p.category?.name?.toLowerCase().replace(/[^a-z]/g, "_").includes(catId.replace(/_/g, "")) ||
                           p.categoryId === catId;
                  })).length > 0 && (
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        📋 {t("workerOnboarding.otherProfessions")}
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {professions.filter((p) => !selectedCategories.some((catId) => {
                          const isCustomCategory = catId.startsWith("custom:");
                          const categoryKey = isCustomCategory ? catId.replace("custom:", "") : catId;
                          if (isCustomCategory) return p.categoryId === categoryKey;
                          return p.category?.name?.toLowerCase().replace(/[^a-z]/g, "_").includes(catId.replace(/_/g, "")) ||
                                 p.categoryId === catId;
                        })).map((profession) => {
                          const isSelected = selectedProfessions.includes(profession.id);
                          const isPrimary = primaryProfession === profession.id;
                          return (
                            <button
                              key={profession.id}
                              onClick={() => toggleProfession(profession.id)}
                              className={cn(
                                "relative flex flex-col items-center p-3 bg-gray-50 rounded-lg border-2 transition-all",
                                isSelected
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-200 hover:border-gray-300"
                              )}
                            >
                              {isSelected && (
                                <div className={cn(
                                  "absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center",
                                  isPrimary ? "bg-yellow-500" : "bg-blue-500"
                                )}>
                                  <Check className="h-3 w-3 text-white" />
                                </div>
                              )}
                              <span className="text-2xl mb-1">{profession.emoji}</span>
                              <span className="text-xs font-medium text-center">
                                {getProfessionName(profession)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedProfessions.length > 0 && (
                <p className="text-center text-sm text-blue-600 mt-4">
                  {selectedProfessions.length} {t("workerOnboarding.professionsSelected")}
                </p>
              )}
            </div>
          )}

          {/* Step 3: Hourly Rate per Profession */}
          {step === 3 && (
            <div className="animate-in fade-in duration-300">
              <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">
                {t("workerOnboarding.step3Title")}
              </h1>
              <p className="text-gray-600 text-center mb-8">
                {t("workerOnboarding.step3Desc")}
              </p>

              <Card className="max-w-lg mx-auto">
                <CardContent className="pt-6 space-y-4">
                  {selectedProfessions.map((profId) => {
                    const profession = professions.find((p) => p.id === profId);
                    if (!profession) return null;

                    return (
                      <div
                        key={profId}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{profession.emoji}</span>
                          <span className="font-medium">{getProfessionName(profession)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-blue-600">€</span>
                          <Input
                            type="number"
                            value={professionRates[profId] || "25"}
                            onChange={(e) => setProfessionRates((prev) => ({
                              ...prev,
                              [profId]: e.target.value,
                            }))}
                            className="w-20 text-center font-semibold"
                            min="1"
                            max="500"
                          />
                          <span className="text-gray-500">/{t("workerOnboarding.hour")}</span>
                        </div>
                      </div>
                    );
                  })}

                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-500 text-center mb-3">
                      {t("workerOnboarding.quickSetAll")}
                    </p>
                    <div className="flex justify-center gap-2 flex-wrap">
                      {[15, 25, 35, 50, 75].map((rate) => (
                        <Button
                          key={rate}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newRates: Record<string, string> = {};
                            selectedProfessions.forEach((id) => {
                              newRates[id] = String(rate);
                            });
                            setProfessionRates(newRates);
                          }}
                        >
                          €{rate}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <p className="text-sm text-gray-500 text-center">
                    {t("workerOnboarding.rateHint")}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 4: Availability */}
          {step === 4 && (
            <div className="animate-in fade-in duration-300">
              <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">
                {t("workerOnboarding.step4Title")}
              </h1>
              <p className="text-gray-600 text-center mb-8">
                {t("workerOnboarding.step4Desc")}
              </p>

              <Card className="max-w-lg mx-auto">
                <CardContent className="pt-6 space-y-4">
                  {DAYS_OF_WEEK.map((day) => {
                    const slot = availability.find((s) => s.dayOfWeek === day.value);
                    if (!slot) return null;

                    return (
                      <div
                        key={day.value}
                        className={cn(
                          "flex items-center gap-4 p-3 rounded-lg transition-colors",
                          slot.isActive ? "bg-blue-50" : "bg-gray-50"
                        )}
                      >
                        <Switch
                          checked={slot.isActive}
                          onCheckedChange={() => toggleAvailability(day.value)}
                        />
                        <span className="w-24 font-medium">
                          {t(`days.${day.key}`)}
                        </span>
                        {slot.isActive && (
                          <div className="flex items-center gap-2 ml-auto">
                            <Input
                              type="time"
                              value={slot.startTime}
                              onChange={(e) => updateAvailabilityTime(day.value, "startTime", e.target.value)}
                              className="w-28"
                            />
                            <span className="text-gray-400">-</span>
                            <Input
                              type="time"
                              value={slot.endTime}
                              onChange={(e) => updateAvailabilityTime(day.value, "endTime", e.target.value)}
                              className="w-28"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 5: Profile Info */}
          {step === 5 && (
            <div className="animate-in fade-in duration-300">
              <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">
                {t("workerOnboarding.step5Title")}
              </h1>
              <p className="text-gray-600 text-center mb-8">
                {t("workerOnboarding.step5Desc")}
              </p>

              <Card className="max-w-lg mx-auto">
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="bio">{t("workerOnboarding.aboutYou")}</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder={t("workerOnboarding.bioPlaceholder")}
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="experience">{t("workerOnboarding.experience")}</Label>
                      <Input
                        id="experience"
                        type="number"
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(e.target.value)}
                        min="0"
                        max="50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="radius">{t("workerOnboarding.serviceRadius")}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="radius"
                          type="number"
                          value={serviceRadius}
                          onChange={(e) => setServiceRadius(e.target.value)}
                          min="1"
                          max="100"
                        />
                        <span className="text-gray-500">km</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>{t("workerOnboarding.ecoFriendly")}</Label>
                        <p className="text-sm text-gray-500">{t("workerOnboarding.ecoFriendlyDesc")}</p>
                      </div>
                      <Switch checked={ecoFriendly} onCheckedChange={setEcoFriendly} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>{t("workerOnboarding.petFriendly")}</Label>
                        <p className="text-sm text-gray-500">{t("workerOnboarding.petFriendlyDesc")}</p>
                      </div>
                      <Switch checked={petFriendly} onCheckedChange={setPetFriendly} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 6: Review */}
          {step === 6 && (
            <div className="animate-in fade-in duration-300">
              <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">
                {t("workerOnboarding.step6Title")}
              </h1>
              <p className="text-gray-600 text-center mb-8">
                {t("workerOnboarding.step6Desc")}
              </p>

              <div className="space-y-4 max-w-lg mx-auto">
                {/* Categories */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      {t("workerOnboarding.reviewCategories")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedCategories.map((catId) => (
                        <Badge key={catId} variant="secondary">
                          {getCategoryName(catId)}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Professions */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {t("workerOnboarding.reviewProfessions")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfessions.map((profId) => {
                        const prof = professions.find((p) => p.id === profId);
                        return (
                          <Badge key={profId} variant="secondary">
                            {prof?.emoji} {prof ? getProfessionName(prof) : profId}
                          </Badge>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Rates */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      {t("workerOnboarding.reviewRates")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedProfessions.map((profId) => {
                      const prof = professions.find((p) => p.id === profId);
                      return (
                        <div key={profId} className="flex justify-between items-center">
                          <span className="text-sm">
                            {prof?.emoji} {prof ? getProfessionName(prof) : profId}
                          </span>
                          <span className="font-medium">
                            €{professionRates[profId] || "25"}/{t("workerOnboarding.hour")}
                          </span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Availability */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      {t("workerOnboarding.reviewAvailability")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p>
                      <span className="font-medium">{t("workerOnboarding.workingDays")}:</span>{" "}
                      {availability
                        .filter((s) => s.isActive)
                        .map((s) => t(`days.${DAYS_OF_WEEK.find((d) => d.value === s.dayOfWeek)?.key}`))
                        .join(", ")}
                    </p>
                  </CardContent>
                </Card>

                {/* Profile Details */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {t("workerOnboarding.reviewProfile")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t("workerOnboarding.experience")}</span>
                      <span className="font-medium">{experienceYears} {t("workerOnboarding.years")}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t("workerOnboarding.serviceRadius")}</span>
                      <span className="font-medium">{serviceRadius} km</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t("workerOnboarding.ecoFriendly")}</span>
                      <Badge variant={ecoFriendly ? "default" : "secondary"}>
                        {ecoFriendly ? "✓" : "✗"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t("workerOnboarding.petFriendly")}</span>
                      <Badge variant={petFriendly ? "default" : "secondary"}>
                        {petFriendly ? "✓" : "✗"}
                      </Badge>
                    </div>
                    {bio && (
                      <div className="pt-2 border-t">
                        <span className="text-sm text-gray-500">{t("workerOnboarding.bio")}</span>
                        <p className="text-sm mt-1">{bio}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Ready message */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-green-800 font-medium">
                    {t("workerOnboarding.readyToGo")}
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    {t("workerOnboarding.profileWillBeVisible")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="mt-8 flex justify-between max-w-lg mx-auto">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1 || isSubmitting}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("common.back")}
            </Button>

            {step < TOTAL_STEPS ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                {t("common.next")}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {t("workerOnboarding.completeSetup")}
              </Button>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function WorkerOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <WorkerOnboardingContent />
    </Suspense>
  );
}
