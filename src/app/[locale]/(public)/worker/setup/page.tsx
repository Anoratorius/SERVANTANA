"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2, ArrowLeft, ArrowRight, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Built-in category IDs mapping
const BUILTIN_CATEGORIES: Record<string, string> = {
  home_services: "home_services",
  construction: "construction",
  automotive: "automotive",
  personal_care: "personal_care",
  care_services: "care_services",
  delivery_moving: "delivery_moving",
  tech_it: "tech_it",
  events_entertainment: "events_entertainment",
  education_tutoring: "education_tutoring",
  professional_services: "professional_services",
  fashion_tailoring: "fashion_tailoring",
  food_cooking: "food_cooking",
  security: "security",
  agriculture: "agriculture",
};

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

function WorkerSetupContent() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [step, setStep] = useState(1); // 1 = Select professions, 2 = Profile info
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [selectedProfessions, setSelectedProfessions] = useState<string[]>([]);
  const [primaryProfession, setPrimaryProfession] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Profile info
  const [hourlyRate, setHourlyRate] = useState("25");
  const [bio, setBio] = useState("");
  const [experienceYears, setExperienceYears] = useState("1");

  // Parse selected categories from URL
  const selectedCategories = searchParams.get("categories")?.split(",") || [];

  // Redirect if not authenticated or not a worker
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/login");
      return;
    }
    if (session.user.role !== "WORKER") {
      router.push("/");
      return;
    }
  }, [session, status, router]);

  // Fetch professions for selected categories
  const fetchProfessions = useCallback(async () => {
    if (selectedCategories.length === 0) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch all approved professions
      const response = await fetch("/api/professions");
      if (!response.ok) throw new Error("Failed to fetch professions");

      const allProfessions: Profession[] = await response.json();

      // Filter professions by selected categories
      // For built-in categories, we need to match by category name or a mapping
      // For custom categories (custom:id), match by categoryId
      const filteredProfessions = allProfessions.filter((profession) => {
        if (!profession.categoryId) return false;

        // Check each selected category
        return selectedCategories.some((catId) => {
          if (catId.startsWith("custom:")) {
            // Custom category - match by database ID
            const customCategoryId = catId.replace("custom:", "");
            return profession.categoryId === customCategoryId;
          } else {
            // Built-in category - match by category name
            // The built-in categories map to category names in the database
            const builtinKey = BUILTIN_CATEGORIES[catId];
            if (builtinKey && profession.category) {
              // Match by category name (case-insensitive partial match)
              const categoryName = profession.category.name.toLowerCase().replace(/\s+/g, "_");
              return categoryName.includes(builtinKey) || builtinKey.includes(categoryName);
            }
            return false;
          }
        });
      });

      // If no filtered professions found, show all professions
      // This is a fallback for when category mapping isn't perfect
      setProfessions(filteredProfessions.length > 0 ? filteredProfessions : allProfessions);
    } catch (error) {
      console.error("Failed to fetch professions:", error);
      toast.error(t("professionOnboarding.saveFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategories, t]);

  useEffect(() => {
    fetchProfessions();
  }, [fetchProfessions]);

  const toggleProfession = (professionId: string) => {
    setSelectedProfessions((prev) => {
      if (prev.includes(professionId)) {
        // If removing the primary profession, clear it
        if (primaryProfession === professionId) {
          setPrimaryProfession(null);
        }
        return prev.filter((id) => id !== professionId);
      } else {
        // If this is the first selection, make it primary
        if (prev.length === 0) {
          setPrimaryProfession(professionId);
        }
        return [...prev, professionId];
      }
    });
  };

  const handleSetPrimary = (professionId: string) => {
    if (selectedProfessions.includes(professionId)) {
      setPrimaryProfession(professionId);
    }
  };

  const handleContinueToProfile = () => {
    if (selectedProfessions.length === 0) {
      toast.error(t("professionOnboarding.selectAtLeastOne"));
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (selectedProfessions.length === 0) {
      toast.error(t("professionOnboarding.selectAtLeastOne"));
      return;
    }

    const rate = parseFloat(hourlyRate);
    if (isNaN(rate) || rate <= 0) {
      toast.error(t("workerSetup.invalidRate"));
      return;
    }

    setIsSubmitting(true);

    try {
      // First, update the worker profile with basic info
      const profileResponse = await fetch("/api/worker/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hourlyRate: rate,
          bio: bio.trim() || undefined,
          experienceYears: parseInt(experienceYears) || 0,
        }),
      });

      if (!profileResponse.ok) {
        throw new Error("Failed to update profile");
      }

      // Then add each profession
      for (let i = 0; i < selectedProfessions.length; i++) {
        const professionId = selectedProfessions[i];
        const isPrimary = professionId === primaryProfession || (i === 0 && !primaryProfession);

        const response = await fetch("/api/worker/professions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            professionId,
            isPrimary,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          // Ignore "already added" errors
          if (!error.error?.includes("already added")) {
            throw new Error(error.error || "Failed to add profession");
          }
        }
      }

      toast.success(t("professionOnboarding.saved"));

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to save setup:", error);
      toast.error(t("professionOnboarding.saveFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProfessionName = (profession: Profession) => {
    if (locale === "de" && profession.nameDE) {
      return profession.nameDE;
    }
    return profession.name;
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
        
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      

      <main className="flex-1 bg-gradient-to-br from-blue-50 via-white to-green-50 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Progress indicator */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-semibold",
                step >= 1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
              )}>
                1
              </div>
              <div className={cn(
                "w-16 h-1 rounded",
                step >= 2 ? "bg-blue-600" : "bg-gray-200"
              )} />
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-semibold",
                step >= 2 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
              )}>
                2
              </div>
            </div>
          </div>

          {step === 1 && (
            <>
              <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                {t("workerSetup.selectProfessions")}
              </h1>
              <p className="text-gray-600 text-center mb-4 max-w-2xl mx-auto">
                {t("workerSetup.selectProfessionsDesc")}
              </p>
              <p className="text-sm text-gray-500 text-center mb-8">
                {t("workerSetup.doubleClickPrimary")}
              </p>

              {selectedProfessions.length > 0 && (
                <div className="flex justify-center mb-8">
                  <Badge variant="secondary" className="text-sm px-4 py-2">
                    {selectedProfessions.length} {t("professionOnboarding.selected")}
                  </Badge>
                </div>
              )}

              {professions.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">{t("professionOnboarding.noProfessions")}</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => router.push("/categories")}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t("common.back")}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                    {professions.map((profession) => {
                      const isSelected = selectedProfessions.includes(profession.id);
                      const isPrimary = primaryProfession === profession.id;
                      return (
                        <button
                          key={profession.id}
                          onClick={() => toggleProfession(profession.id)}
                          onDoubleClick={() => handleSetPrimary(profession.id)}
                          className={cn(
                            "group relative flex flex-col items-center p-4 bg-white rounded-xl border shadow-sm hover:shadow-lg transition-all duration-200",
                            isSelected
                              ? "border-blue-500 ring-2 ring-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          )}
                        >
                          {isSelected && (
                            <div className={cn(
                              "absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center",
                              isPrimary ? "bg-yellow-500" : "bg-blue-500"
                            )}>
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          )}
                          {isPrimary && (
                            <Badge className="absolute top-2 left-2 text-xs bg-yellow-500">
                              {t("professionOnboarding.primary")}
                            </Badge>
                          )}
                          <span className="text-3xl mb-2">{profession.emoji}</span>
                          <span className="text-sm font-medium text-center text-gray-700">
                            {getProfessionName(profession)}
                          </span>
                          {profession.category && (
                            <span className="text-xs text-gray-400 mt-1">
                              {locale === "de" && profession.category.nameDE
                                ? profession.category.nameDE
                                : profession.category.name}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-12 flex justify-center gap-4">
                    <Button
                      variant="outline"
                      onClick={() => router.push("/categories")}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      {t("common.back")}
                    </Button>
                    <Button
                      onClick={handleContinueToProfile}
                      disabled={selectedProfessions.length === 0}
                      className="px-8"
                    >
                      {t("common.next")}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                {t("workerSetup.completeProfile")}
              </h1>
              <p className="text-gray-600 text-center mb-8 max-w-2xl mx-auto">
                {t("workerSetup.completeProfileDesc")}
              </p>

              <Card className="max-w-lg mx-auto">
                <CardHeader>
                  <CardTitle>{t("workerSetup.basicInfo")}</CardTitle>
                  <CardDescription>{t("workerSetup.basicInfoDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">{t("worker.profile.hourlyRate")} (EUR)</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      min="1"
                      step="0.5"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      placeholder="25"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experienceYears">{t("worker.profile.experience")}</Label>
                    <Input
                      id="experienceYears"
                      type="number"
                      min="0"
                      max="50"
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(e.target.value)}
                      placeholder="1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">{t("worker.profile.about")}</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder={t("workerSetup.bioPlaceholder")}
                      rows={4}
                    />
                  </div>

                  <div className="pt-4 flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setStep(1)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      {t("common.back")}
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="px-8"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      ) : (
                        <Check className="h-5 w-5 mr-2" />
                      )}
                      {t("workerSetup.finishSetup")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>

      
    </div>
  );
}

export default function WorkerSetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    }>
      <WorkerSetupContent />
    </Suspense>
  );
}
