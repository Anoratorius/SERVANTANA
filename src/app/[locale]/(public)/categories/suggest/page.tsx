"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Send, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function SuggestCategoryPage() {
  const t = useTranslations();
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [description, setDescription] = useState("");


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: categoryName,
          description,
        }),
      });
      if (response.ok) {
        setSubmitted(true);
      }
    } catch (error) {
      console.error("Failed to submit:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      

      <main className="flex-1 bg-gradient-to-br from-blue-50 via-white to-green-50 py-12">
        <div className="container mx-auto px-4 max-w-lg">


          {submitted ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mx-auto mb-6 shadow-xl">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                {t("categories.suggest.thankYou")}
              </h1>
              <p className="text-gray-600 mb-8">
                {t("categories.suggest.submitted")}
              </p>
              <Button onClick={() => router.push("/categories")}>
                {t("categories.suggest.backToCategories")}
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center mx-auto mb-4 shadow-xl">
                  <span className="text-4xl">➕</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">
                  {t("categories.suggest.title")}
                </h1>
                <p className="text-gray-600">
                  {t("categories.suggest.subtitle")}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-2xl shadow-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("categories.suggest.categoryName")}
                  </label>
                  <Input
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder={t("categories.suggest.categoryPlaceholder")}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("categories.suggest.description")}
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("categories.suggest.descriptionPlaceholder")}
                    rows={4}
                  />
                </div>

                <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-green-600">
                  <Send className="w-4 h-4 mr-2" />
                  {t("categories.suggest.submit")}
                </Button>
              </form>
            </>
          )}
        </div>
      </main>

      
    </div>
  );
}
