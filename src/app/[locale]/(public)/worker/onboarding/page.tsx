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
import { Check, Loader2, ArrowLeft, ArrowRight, Briefcase, Clock, User, CheckCircle, Plus, X, CreditCard, Camera, Building2, ChevronDown, ChevronRight } from "lucide-react";
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

// Schedule presets
const SCHEDULE_PRESETS = [
  { id: "weekdays", days: [1, 2, 3, 4, 5], startTime: "09:00", endTime: "17:00" },
  { id: "flexible", days: [1, 2, 3, 4, 5, 6, 0], startTime: "08:00", endTime: "20:00" },
  { id: "weekends", days: [6, 0], startTime: "10:00", endTime: "18:00" },
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

  // Current step: 1=What You Do, 2=Rates, 3=Schedule, 4=Get Paid, 5=Finish Up
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 5;

  // Step 1: What You Do (Categories + Professions)
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [selectedProfessions, setSelectedProfessions] = useState<string[]>([]);
  const [primaryProfession, setPrimaryProfession] = useState<string | null>(null);
  const [professionsFetched, setProfessionsFetched] = useState(false);

  // Step 2: Rates
  const [professionRates, setProfessionRates] = useState<Record<string, string>>({});

  // Step 3: Schedule
  const [availability, setAvailability] = useState<AvailabilitySlot[]>(
    DAYS_OF_WEEK.map((day) => ({
      dayOfWeek: day.value,
      startTime: "09:00",
      endTime: "17:00",
      isActive: day.value >= 1 && day.value <= 5,
    }))
  );

  // Step 4: Payment
  const [paypalEmail, setPaypalEmail] = useState("");
  const [iban, setIban] = useState("");
  const [accountHolder, setAccountHolder] = useState("");

  // Step 5: Finish Up
  const [bio, setBio] = useState("");
  const [experienceYears, setExperienceYears] = useState("1");
  const [ecoFriendly, setEcoFriendly] = useState(false);
  const [petFriendly, setPetFriendly] = useState(false);
  const [serviceRadius, setServiceRadius] = useState("10");

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingProfessions, setIsFetchingProfessions] = useState(false);

  // Suggestion dialogs
  const [showSuggestCategory, setShowSuggestCategory] = useState(false);
  const [suggestCategoryName, setSuggestCategoryName] = useState("");
  const [suggestCategoryEmoji, setSuggestCategoryEmoji] = useState("");
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);

  const [showSuggestProfession, setShowSuggestProfession] = useState(false);
  const [suggestProfessionName, setSuggestProfessionName] = useState("");
  const [suggestProfessionEmoji, setSuggestProfessionEmoji] = useState("");
  const [suggestProfessionCategoryId, setSuggestProfessionCategoryId] = useState<string | null>(null);
  const [isSubmittingProfessionSuggestion, setIsSubmittingProfessionSuggestion] = useState(false);

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

  // Fetch all professions once when first category is expanded
  const fetchProfessions = useCallback(async () => {
    if (professionsFetched) return;

    setIsFetchingProfessions(true);
    try {
      const response = await fetch("/api/professions");
      if (!response.ok) throw new Error("Failed to fetch professions");
      const allProfessions: Profession[] = await response.json();
      setProfessions(allProfessions);
      setProfessionsFetched(true);
    } catch (error) {
      console.error("Failed to fetch professions:", error);
      toast.error(t("workerOnboarding.fetchError"));
    } finally {
      setIsFetchingProfessions(false);
    }
  }, [professionsFetched, t]);

  // Fetch professions when first category is expanded
  useEffect(() => {
    if (expandedCategories.length > 0 && !professionsFetched) {
      fetchProfessions();
    }
  }, [expandedCategories, professionsFetched, fetchProfessions]);

  const toggleCategory = (categoryId: string, isCustom: boolean = false) => {
    const fullId = isCustom ? `custom:${categoryId}` : categoryId;
    setExpandedCategories((prev) =>
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
        setProfessionRates((rates) => ({
          ...rates,
          [professionId]: "",
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

  const applySchedulePreset = (presetId: string) => {
    const preset = SCHEDULE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setAvailability(
      DAYS_OF_WEEK.map((day) => ({
        dayOfWeek: day.value,
        startTime: preset.startTime,
        endTime: preset.endTime,
        isActive: preset.days.includes(day.value),
      }))
    );
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return selectedProfessions.length > 0;
      case 2:
        return selectedProfessions.every((profId) => {
          const rate = parseFloat(professionRates[profId] || "0");
          return !isNaN(rate) && rate > 0;
        });
      case 3:
        return availability.some((slot) => slot.isActive);
      case 4:
        return true; // Payment is optional
      case 5:
        return true; // Profile details are optional
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

  const handleSubmitCategorySuggestion = async () => {
    if (!suggestCategoryName.trim()) {
      toast.error(t("workerOnboarding.enterCategoryName"));
      return;
    }

    setIsSubmittingSuggestion(true);
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: suggestCategoryName.trim(),
          emoji: suggestCategoryEmoji || "📁",
        }),
      });

      if (response.ok) {
        toast.success(t("workerOnboarding.categorySuggestionSubmitted"));
        setShowSuggestCategory(false);
        setSuggestCategoryName("");
        setSuggestCategoryEmoji("");
      } else {
        const data = await response.json();
        toast.error(data.error || t("workerOnboarding.suggestionFailed"));
      }
    } catch {
      toast.error(t("workerOnboarding.suggestionFailed"));
    } finally {
      setIsSubmittingSuggestion(false);
    }
  };

  const handleSubmitProfessionSuggestion = async () => {
    if (!suggestProfessionName.trim()) {
      toast.error(t("workerOnboarding.enterProfessionName"));
      return;
    }

    setIsSubmittingProfessionSuggestion(true);
    try {
      const response = await fetch("/api/professions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: suggestProfessionName.trim(),
          emoji: suggestProfessionEmoji || "👤",
          categoryId: suggestProfessionCategoryId,
        }),
      });

      if (response.ok) {
        toast.success(t("workerOnboarding.professionSuggestionSubmitted"));
        setShowSuggestProfession(false);
        setSuggestProfessionName("");
        setSuggestProfessionEmoji("");
        setSuggestProfessionCategoryId(null);
      } else {
        const data = await response.json();
        toast.error(data.error || t("workerOnboarding.suggestionFailed"));
      }
    } catch {
      toast.error(t("workerOnboarding.suggestionFailed"));
    } finally {
      setIsSubmittingProfessionSuggestion(false);
    }
  };

  const openProfessionSuggestion = (categoryId: string) => {
    setSuggestProfessionCategoryId(categoryId);
    setShowSuggestProfession(true);
  };

  const handleComplete = async () => {
    setIsSubmitting(true);

    try {
      // Update profile with basic info
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
          paypalEmail: paypalEmail.trim() || undefined,
          iban: iban.trim() || undefined,
          accountHolder: accountHolder.trim() || undefined,
        }),
      });

      if (!profileResponse.ok) {
        throw new Error("Failed to update profile");
      }

      // Add professions with their rates
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

      // Set availability
      const activeSlots = availability.filter((slot) => slot.isActive);
      const availabilityResponse = await fetch("/api/cleaner/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability: activeSlots }),
      });

      if (!availabilityResponse.ok) {
        throw new Error("Failed to set availability");
      }

      // Complete onboarding
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
    if (categoryId.startsWith("custom:")) {
      const customId = categoryId.replace("custom:", "");
      const custom = customCategories.find((c) => c.id === customId);
      if (custom) {
        return locale === "de" && custom.nameDE ? custom.nameDE : custom.name;
      }
    }
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
          <div className="mb-6 sm:mb-8">
            <div className="flex justify-between items-center max-w-md mx-auto mb-2 px-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className="flex items-center">
                  <div
                    className={cn(
                      "w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-semibold text-sm transition-colors",
                      s < step
                        ? "bg-green-500 text-white"
                        : s === step
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-500"
                    )}
                  >
                    {s < step ? <Check className="h-4 w-4 sm:h-5 sm:w-5" /> : s}
                  </div>
                  {s < 5 && (
                    <div
                      className={cn(
                        "w-8 sm:w-12 md:w-16 h-1 mx-1",
                        s < step ? "bg-green-500" : "bg-gray-200"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
            <p className="text-center text-xs sm:text-sm text-gray-500">
              {t("workerOnboarding.step")} {step} {t("workerOnboarding.of")} {TOTAL_STEPS}
            </p>
          </div>

          {/* Step 1: What You Do (Categories + Professions) */}
          {step === 1 && (
            <div className="animate-in fade-in duration-300">
              <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">
                {t("workerOnboarding.step1TitleNew")}
              </h1>
              <p className="text-gray-600 text-center mb-6">
                {t("workerOnboarding.step1DescNew")}
              </p>

              {/* Accordion Categories */}
              <div className="space-y-3 max-w-2xl mx-auto">
                {CATEGORIES.map((category) => {
                  const catId = category.id;
                  const isExpanded = expandedCategories.includes(catId);
                  const categoryProfessions = professions.filter((p) =>
                    p.category?.name?.toLowerCase().replace(/[^a-z]/g, "_").includes(catId.replace(/_/g, "")) ||
                    p.categoryId === catId
                  );
                  const selectedInCategory = categoryProfessions.filter((p) =>
                    selectedProfessions.includes(p.id)
                  ).length;

                  return (
                    <div key={catId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      {/* Category Header */}
                      <button
                        onClick={() => toggleCategory(catId)}
                        className={cn(
                          "w-full flex items-center justify-between p-4 transition-colors",
                          isExpanded ? "bg-blue-50" : "hover:bg-gray-50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{category.emoji}</span>
                          <span className="font-medium">{t(`categories.${category.id}`)}</span>
                          {selectedInCategory > 0 && (
                            <Badge variant="default" className="bg-blue-500">
                              {selectedInCategory}
                            </Badge>
                          )}
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500" />
                        )}
                      </button>

                      {/* Professions (expanded) */}
                      {isExpanded && (
                        <div className="p-4 pt-0 border-t border-gray-100">
                          {isFetchingProfessions ? (
                            <div className="flex justify-center py-6">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                          ) : categoryProfessions.length === 0 ? (
                            <div className="py-4 text-center text-gray-500 text-sm">
                              {t("workerOnboarding.noProfessionsInCategory")}
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3">
                              {categoryProfessions.map((profession) => {
                                const isSelected = selectedProfessions.includes(profession.id);
                                return (
                                  <button
                                    key={profession.id}
                                    onClick={() => toggleProfession(profession.id)}
                                    className={cn(
                                      "relative flex flex-col items-center p-3 rounded-lg border-2 transition-all",
                                      isSelected
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-gray-200 bg-gray-50 hover:border-gray-300"
                                    )}
                                  >
                                    {isSelected && (
                                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                                        <Check className="h-3 w-3 text-white" />
                                      </div>
                                    )}
                                    <span className="text-xl mb-1">{profession.emoji}</span>
                                    <span className="text-xs font-medium text-center leading-tight">
                                      {getProfessionName(profession)}
                                    </span>
                                  </button>
                                );
                              })}
                              {/* Add yours button */}
                              <button
                                onClick={() => openProfessionSuggestion(catId)}
                                className="flex flex-col items-center p-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all"
                              >
                                <span className="text-xl mb-1">➕</span>
                                <span className="text-xs font-medium text-gray-500">
                                  {t("workerOnboarding.addYours")}
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Custom Categories */}
                {customCategories
                  .filter((category) => !CATEGORIES.some((c) => c.id === category.id))
                  .map((category) => {
                    const catId = `custom:${category.id}`;
                    const isExpanded = expandedCategories.includes(catId);
                    const categoryProfessions = professions.filter((p) => p.categoryId === category.id);
                    const selectedInCategory = categoryProfessions.filter((p) =>
                      selectedProfessions.includes(p.id)
                    ).length;

                    return (
                      <div key={catId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <button
                          onClick={() => toggleCategory(category.id, true)}
                          className={cn(
                            "w-full flex items-center justify-between p-4 transition-colors",
                            isExpanded ? "bg-blue-50" : "hover:bg-gray-50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{category.emoji}</span>
                            <span className="font-medium">
                              {locale === "de" && category.nameDE ? category.nameDE : category.name}
                            </span>
                            {selectedInCategory > 0 && (
                              <Badge variant="default" className="bg-blue-500">
                                {selectedInCategory}
                              </Badge>
                            )}
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-500" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="p-4 pt-0 border-t border-gray-100">
                            {isFetchingProfessions ? (
                              <div className="flex justify-center py-6">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3">
                                {categoryProfessions.map((profession) => {
                                  const isSelected = selectedProfessions.includes(profession.id);
                                  return (
                                    <button
                                      key={profession.id}
                                      onClick={() => toggleProfession(profession.id)}
                                      className={cn(
                                        "relative flex flex-col items-center p-3 rounded-lg border-2 transition-all",
                                        isSelected
                                          ? "border-blue-500 bg-blue-50"
                                          : "border-gray-200 bg-gray-50 hover:border-gray-300"
                                      )}
                                    >
                                      {isSelected && (
                                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                                          <Check className="h-3 w-3 text-white" />
                                        </div>
                                      )}
                                      <span className="text-xl mb-1">{profession.emoji}</span>
                                      <span className="text-xs font-medium text-center leading-tight">
                                        {getProfessionName(profession)}
                                      </span>
                                    </button>
                                  );
                                })}
                                <button
                                  onClick={() => openProfessionSuggestion(category.id)}
                                  className="flex flex-col items-center p-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all"
                                >
                                  <span className="text-xl mb-1">➕</span>
                                  <span className="text-xs font-medium text-gray-500">
                                    {t("workerOnboarding.addYours")}
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                {/* Suggest new category */}
                <button
                  onClick={() => setShowSuggestCategory(true)}
                  className="w-full flex items-center justify-center gap-2 p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all"
                >
                  <Plus className="h-5 w-5 text-gray-400" />
                  <span className="font-medium text-gray-600">
                    {t("workerOnboarding.createYours")}
                  </span>
                </button>
              </div>

              {/* Selected count */}
              {selectedProfessions.length > 0 && (
                <p className="text-center text-sm text-blue-600 mt-6">
                  {selectedProfessions.length} {t("workerOnboarding.professionsSelected")}
                </p>
              )}

              {/* Suggestion Dialogs */}
              {showSuggestCategory && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">{t("workerOnboarding.suggestCategory")}</h3>
                      <button onClick={() => setShowSuggestCategory(false)} className="p-1 hover:bg-gray-100 rounded-full">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="categoryName">{t("workerOnboarding.categoryName")}</Label>
                        <Input
                          id="categoryName"
                          value={suggestCategoryName}
                          onChange={(e) => setSuggestCategoryName(e.target.value)}
                          placeholder={t("workerOnboarding.categoryNamePlaceholder")}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="categoryEmoji">{t("workerOnboarding.categoryEmoji")}</Label>
                        <Input
                          id="categoryEmoji"
                          value={suggestCategoryEmoji}
                          onChange={(e) => setSuggestCategoryEmoji(e.target.value)}
                          placeholder="📁"
                          className="mt-1 w-20"
                          maxLength={4}
                        />
                      </div>
                      <p className="text-sm text-gray-500">{t("workerOnboarding.suggestionNote")}</p>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setShowSuggestCategory(false)} className="flex-1">
                          {t("common.cancel")}
                        </Button>
                        <Button onClick={handleSubmitCategorySuggestion} disabled={isSubmittingSuggestion || !suggestCategoryName.trim()} className="flex-1">
                          {isSubmittingSuggestion ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.submit")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showSuggestProfession && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">{t("workerOnboarding.suggestProfession")}</h3>
                      <button onClick={() => setShowSuggestProfession(false)} className="p-1 hover:bg-gray-100 rounded-full">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="professionName">{t("workerOnboarding.professionName")}</Label>
                        <Input
                          id="professionName"
                          value={suggestProfessionName}
                          onChange={(e) => setSuggestProfessionName(e.target.value)}
                          placeholder={t("workerOnboarding.professionNamePlaceholder")}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="professionEmoji">{t("workerOnboarding.professionEmoji")}</Label>
                        <Input
                          id="professionEmoji"
                          value={suggestProfessionEmoji}
                          onChange={(e) => setSuggestProfessionEmoji(e.target.value)}
                          placeholder="👤"
                          className="mt-1 w-20"
                          maxLength={4}
                        />
                      </div>
                      <p className="text-sm text-gray-500">{t("workerOnboarding.professionSuggestionNote")}</p>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setShowSuggestProfession(false)} className="flex-1">
                          {t("common.cancel")}
                        </Button>
                        <Button onClick={handleSubmitProfessionSuggestion} disabled={isSubmittingProfessionSuggestion || !suggestProfessionName.trim()} className="flex-1">
                          {isSubmittingProfessionSuggestion ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.submit")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Your Rates */}
          {step === 2 && (
            <div className="animate-in fade-in duration-300">
              <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">
                {t("workerOnboarding.step2TitleNew")}
              </h1>
              <p className="text-gray-600 text-center mb-8">
                {t("workerOnboarding.step2DescNew")}
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
                            value={professionRates[profId] || ""}
                            onChange={(e) => setProfessionRates((prev) => ({
                              ...prev,
                              [profId]: e.target.value,
                            }))}
                            placeholder="0"
                            className="w-20 text-center font-semibold"
                            min="1"
                          />
                          <span className="text-gray-500">/{t("workerOnboarding.hour")}</span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Your Schedule */}
          {step === 3 && (
            <div className="animate-in fade-in duration-300">
              <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">
                {t("workerOnboarding.step3TitleNew")}
              </h1>
              <p className="text-gray-600 text-center mb-6">
                {t("workerOnboarding.step3DescNew")}
              </p>

              {/* Schedule Presets */}
              <div className="flex justify-center gap-2 mb-6 flex-wrap">
                {SCHEDULE_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    variant="outline"
                    size="sm"
                    onClick={() => applySchedulePreset(preset.id)}
                  >
                    {t(`workerOnboarding.preset${preset.id.charAt(0).toUpperCase() + preset.id.slice(1)}`)}
                  </Button>
                ))}
              </div>

              <Card className="max-w-lg mx-auto">
                <CardContent className="pt-6 space-y-3">
                  {DAYS_OF_WEEK.map((day) => {
                    const slot = availability.find((s) => s.dayOfWeek === day.value);
                    if (!slot) return null;

                    return (
                      <div
                        key={day.value}
                        className={cn(
                          "p-3 rounded-lg transition-colors",
                          slot.isActive ? "bg-blue-50" : "bg-gray-50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={slot.isActive}
                            onCheckedChange={() => toggleAvailability(day.value)}
                          />
                          <span className="font-medium text-sm sm:text-base">
                            {t(`days.${day.key}`)}
                          </span>
                        </div>
                        {slot.isActive && (
                          <div className="flex items-center gap-2 mt-2 ml-12">
                            <Input
                              type="time"
                              value={slot.startTime}
                              onChange={(e) => updateAvailabilityTime(day.value, "startTime", e.target.value)}
                              className="w-24 sm:w-28 text-sm"
                            />
                            <span className="text-gray-400 text-sm">-</span>
                            <Input
                              type="time"
                              value={slot.endTime}
                              onChange={(e) => updateAvailabilityTime(day.value, "endTime", e.target.value)}
                              className="w-24 sm:w-28 text-sm"
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

          {/* Step 4: Get Paid */}
          {step === 4 && (
            <div className="animate-in fade-in duration-300">
              <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">
                {t("workerOnboarding.step4TitleNew")}
              </h1>
              <p className="text-gray-600 text-center mb-8">
                {t("workerOnboarding.step4DescNew")}
              </p>

              <Card className="max-w-lg mx-auto">
                <CardContent className="pt-6 space-y-6">
                  {/* PayPal */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-white rounded-lg">
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="#003087">
                          <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold">PayPal</h3>
                        <p className="text-xs text-gray-600">{t("workerOnboarding.paypalDesc")}</p>
                      </div>
                    </div>
                    <Input
                      type="email"
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                      placeholder={t("workerOnboarding.paypalEmailPlaceholder")}
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-sm text-gray-500">{t("workerOnboarding.or")}</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  {/* Bank Account */}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-white rounded-lg">
                        <Building2 className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{t("workerOnboarding.bankAccount")}</h3>
                        <p className="text-xs text-gray-600">{t("workerOnboarding.bankDesc")}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Input
                        value={iban}
                        onChange={(e) => setIban(e.target.value.toUpperCase())}
                        placeholder={t("workerOnboarding.ibanPlaceholder")}
                      />
                      <Input
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(e.target.value)}
                        placeholder={t("workerOnboarding.accountHolderPlaceholder")}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-center text-gray-500">
                    {t("workerOnboarding.paymentSkipNote")}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 5: Finish Up */}
          {step === 5 && (
            <div className="animate-in fade-in duration-300">
              <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">
                {t("workerOnboarding.step5TitleNew")}
              </h1>
              <p className="text-gray-600 text-center mb-6">
                {t("workerOnboarding.step5DescNew")}
              </p>

              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {/* Profile Form */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {t("workerOnboarding.aboutYou")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="bio">{t("workerOnboarding.bio")}</Label>
                      <Textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder={t("workerOnboarding.bioPlaceholder")}
                        rows={3}
                        className="mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="experience">{t("workerOnboarding.experience")}</Label>
                        <Input
                          id="experience"
                          type="number"
                          value={experienceYears}
                          onChange={(e) => {
                            const val = Math.min(50, Math.max(0, parseInt(e.target.value) || 0));
                            setExperienceYears(String(val));
                          }}
                          min="0"
                          max="50"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="radius">{t("workerOnboarding.serviceRadius")}</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            id="radius"
                            type="number"
                            value={serviceRadius}
                            onChange={(e) => {
                              const val = Math.min(100, Math.max(1, parseInt(e.target.value) || 1));
                              setServiceRadius(String(val));
                            }}
                            min="1"
                            max="100"
                          />
                          <span className="text-gray-500 text-sm">km</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">{t("workerOnboarding.ecoFriendly")}</Label>
                        <Switch checked={ecoFriendly} onCheckedChange={setEcoFriendly} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">{t("workerOnboarding.petFriendly")}</Label>
                        <Switch checked={petFriendly} onCheckedChange={setPetFriendly} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Preview */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      {t("workerOnboarding.preview")}
                    </CardTitle>
                    <CardDescription>{t("workerOnboarding.previewDesc")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                      <div>
                        <span className="text-xs text-gray-500">{t("workerOnboarding.reviewProfessions")}</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedProfessions.slice(0, 3).map((profId) => {
                            const prof = professions.find((p) => p.id === profId);
                            return (
                              <Badge key={profId} variant="secondary" className="text-xs">
                                {prof?.emoji} {prof ? getProfessionName(prof) : profId}
                              </Badge>
                            );
                          })}
                          {selectedProfessions.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{selectedProfessions.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-xs text-gray-500">{t("workerOnboarding.experience")}</span>
                          <p className="font-medium">{experienceYears} {t("workerOnboarding.years")}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">{t("workerOnboarding.serviceRadius")}</span>
                          <p className="font-medium">{serviceRadius} km</p>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs text-gray-500">{t("workerOnboarding.workingDays")}</span>
                        <p className="text-sm font-medium">
                          {availability
                            .filter((s) => s.isActive)
                            .map((s) => t(`days.${DAYS_OF_WEEK.find((d) => d.value === s.dayOfWeek)?.key}`).slice(0, 3))
                            .join(", ")}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        {ecoFriendly && <Badge variant="outline" className="text-xs">🌱 Eco</Badge>}
                        {petFriendly && <Badge variant="outline" className="text-xs">🐾 Pets</Badge>}
                        {(paypalEmail || iban) && <Badge variant="outline" className="text-xs text-green-600">💳 Payment</Badge>}
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-1" />
                      <p className="text-green-800 font-medium text-sm">
                        {t("workerOnboarding.readyToGo")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="mt-6 sm:mt-8 flex justify-between gap-4 max-w-lg mx-auto px-2">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1 || isSubmitting}
              className="flex-1 sm:flex-none h-12 sm:h-10"
            >
              <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
              {t("common.back")}
            </Button>

            {step < TOTAL_STEPS ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex-1 sm:flex-none h-12 sm:h-10"
              >
                {t("common.next")}
                <ArrowRight className="h-4 w-4 ml-1 sm:ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none h-12 sm:h-10 bg-green-600 hover:bg-green-700"
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
