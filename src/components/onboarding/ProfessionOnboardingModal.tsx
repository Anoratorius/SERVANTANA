"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Briefcase, Check, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  nameDE: string | null;
  emoji: string;
}

interface Profession {
  id: string;
  name: string;
  nameDE: string | null;
  emoji: string;
  category: Category | null;
}

interface ProfessionOnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export default function ProfessionOnboardingModal({
  isOpen,
  onComplete,
}: ProfessionOnboardingModalProps) {
  const t = useTranslations();
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfessions, setSelectedProfessions] = useState<string[]>([]);
  const [primaryProfession, setPrimaryProfession] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestForm, setShowSuggestForm] = useState(false);
  const [newProfessionName, setNewProfessionName] = useState("");
  const [suggestingProfession, setSuggestingProfession] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProfessions();
    }
  }, [isOpen]);

  const fetchProfessions = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/professions");
      if (response.ok) {
        const data = await response.json();
        setProfessions(data);
      }
    } catch (error) {
      console.error("Error fetching professions:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleProfession = (professionId: string) => {
    setSelectedProfessions((prev) => {
      if (prev.includes(professionId)) {
        // Removing profession
        const newSelection = prev.filter((id) => id !== professionId);
        // If we removed the primary, clear it
        if (primaryProfession === professionId) {
          setPrimaryProfession(newSelection[0] || null);
        }
        return newSelection;
      } else {
        // Adding profession
        const newSelection = [...prev, professionId];
        // If this is the first one, make it primary
        if (newSelection.length === 1) {
          setPrimaryProfession(professionId);
        }
        return newSelection;
      }
    });
  };

  const setPrimary = (professionId: string) => {
    if (selectedProfessions.includes(professionId)) {
      setPrimaryProfession(professionId);
    }
  };

  const handleSave = async () => {
    if (selectedProfessions.length === 0) {
      toast.error(t("professionOnboarding.selectAtLeastOne"));
      return;
    }

    setSaving(true);
    try {
      // Add all selected professions
      for (let i = 0; i < selectedProfessions.length; i++) {
        const professionId = selectedProfessions[i];
        const isPrimary = professionId === primaryProfession;

        const response = await fetch("/api/worker/professions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ professionId, isPrimary }),
        });

        if (!response.ok) {
          const data = await response.json();
          // Ignore "already added" errors
          if (!data.error?.includes("already added")) {
            throw new Error(data.error || "Failed to add profession");
          }
        }
      }

      toast.success(t("professionOnboarding.saved"));
      onComplete();
    } catch (error) {
      console.error("Error saving professions:", error);
      toast.error(t("professionOnboarding.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleSuggestProfession = async () => {
    if (!newProfessionName.trim()) {
      toast.error(t("professionOnboarding.enterProfessionName"));
      return;
    }

    setSuggestingProfession(true);
    try {
      const response = await fetch("/api/professions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProfessionName.trim() }),
      });

      if (response.ok) {
        toast.success(t("professionOnboarding.suggestionSubmitted"));
        setNewProfessionName("");
        setShowSuggestForm(false);
        // Refresh professions list
        fetchProfessions();
      } else {
        const data = await response.json();
        toast.error(data.error || t("professionOnboarding.suggestionFailed"));
      }
    } catch (error) {
      console.error("Error suggesting profession:", error);
      toast.error(t("professionOnboarding.suggestionFailed"));
    } finally {
      setSuggestingProfession(false);
    }
  };

  // Group professions by category
  const groupedProfessions = professions.reduce((acc, profession) => {
    const categoryName = profession.category?.name || "Other";
    if (!acc[categoryName]) {
      acc[categoryName] = {
        category: profession.category,
        professions: [],
      };
    }
    acc[categoryName].professions.push(profession);
    return acc;
  }, {} as Record<string, { category: Category | null; professions: Profession[] }>);

  // Filter professions by search query
  const filteredGroups = Object.entries(groupedProfessions).reduce((acc, [key, value]) => {
    const filtered = value.professions.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.nameDE?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[key] = { ...value, professions: filtered };
    }
    return acc;
  }, {} as typeof groupedProfessions);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-full">
              <Briefcase className="h-6 w-6 text-purple-600" />
            </div>
            <DialogTitle className="text-xl">{t("professionOnboarding.title")}</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            {t("professionOnboarding.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("professionOnboarding.searchProfessions")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Selected count */}
          {selectedProfessions.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary">
                {selectedProfessions.length} {t("professionOnboarding.selected")}
              </Badge>
              <span className="text-muted-foreground">
                {t("professionOnboarding.clickToSetPrimary")}
              </span>
            </div>
          )}

          {/* Professions list */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : Object.keys(filteredGroups).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery
                ? t("professionOnboarding.noResults")
                : t("professionOnboarding.noProfessions")}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(filteredGroups).map(([categoryName, { category, professions: profs }]) => (
                <div key={categoryName}>
                  <h3 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    {category?.emoji || "📁"} {categoryName}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {profs.map((profession) => {
                      const isSelected = selectedProfessions.includes(profession.id);
                      const isPrimary = primaryProfession === profession.id;

                      return (
                        <button
                          key={profession.id}
                          type="button"
                          onClick={() => toggleProfession(profession.id)}
                          onDoubleClick={() => setPrimary(profession.id)}
                          className={cn(
                            "p-3 rounded-lg border text-left transition-all",
                            isSelected
                              ? isPrimary
                                ? "border-purple-500 bg-purple-50 ring-2 ring-purple-500"
                                : "border-purple-300 bg-purple-50"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{profession.emoji}</span>
                              <span className="font-medium text-sm">{profession.name}</span>
                            </div>
                            {isSelected && (
                              <div className="flex items-center gap-1">
                                {isPrimary && (
                                  <Badge variant="default" className="text-xs px-1.5 py-0">
                                    {t("professionOnboarding.primary")}
                                  </Badge>
                                )}
                                <Check className="h-4 w-4 text-purple-600" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Suggest new profession */}
          <div className="border-t pt-4 mt-4">
            {!showSuggestForm ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowSuggestForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("professionOnboarding.suggestNew")}
              </Button>
            ) : (
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <Label>{t("professionOnboarding.newProfessionName")}</Label>
                <div className="flex gap-2">
                  <Input
                    value={newProfessionName}
                    onChange={(e) => setNewProfessionName(e.target.value)}
                    placeholder={t("professionOnboarding.enterProfessionName")}
                  />
                  <Button
                    onClick={handleSuggestProfession}
                    disabled={suggestingProfession || !newProfessionName.trim()}
                  >
                    {suggestingProfession ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t("common.submit")
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("professionOnboarding.suggestionNote")}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSuggestForm(false)}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={selectedProfessions.length === 0 || saving}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Briefcase className="h-4 w-4 mr-2" />
            )}
            {t("professionOnboarding.continue")} ({selectedProfessions.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
