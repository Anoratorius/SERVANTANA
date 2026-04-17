"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  MessageSquare,
  Users,
  Calculator,
  Camera,
  Calendar,
  Star,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export default function AIFeaturesPage() {
  const t = useTranslations("aiHub");

  const aiFeatures = [
    {
      key: "chat",
      icon: MessageSquare,
      href: "/ai/chat",
      color: "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400",
    },
    {
      key: "smartMatch",
      icon: Users,
      href: "/ai/smart-match",
      color: "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400",
    },
    {
      key: "estimate",
      icon: Calculator,
      href: "/ai/estimate",
      color: "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400",
    },
    {
      key: "photo",
      icon: Camera,
      href: "/ai/photo-analysis",
      color: "bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400",
    },
    {
      key: "schedule",
      icon: Calendar,
      href: "/ai/schedule",
      color: "bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-400",
    },
    {
      key: "reviews",
      icon: Star,
      href: "/ai/reviews",
      color: "bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400",
    },
  ];

  return (
    <main className="flex-1 bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-purple-100 dark:bg-purple-900 rounded-full mb-4">
            <Sparkles className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t("title")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aiFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.href} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-4`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">{t(`features.${feature.key}.title`)}</CardTitle>
                  <CardDescription>{t(`features.${feature.key}.desc`)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={feature.href}>
                    <Button variant="outline" className="w-full group">
                      {t("tryNow")}
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* How it works */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-8">{t("howItWorks.title")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="font-semibold mb-2">{t("howItWorks.step1.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("howItWorks.step1.desc")}
              </p>
            </div>
            <div className="p-6">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="font-semibold mb-2">{t("howItWorks.step2.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("howItWorks.step2.desc")}
              </p>
            </div>
            <div className="p-6">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="font-semibold mb-2">{t("howItWorks.step3.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("howItWorks.step3.desc")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
