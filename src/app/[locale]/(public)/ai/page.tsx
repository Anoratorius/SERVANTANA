"use client";

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

const aiFeatures = [
  {
    title: "AI Chat Assistant",
    description: "Get instant answers about services, bookings, and recommendations",
    icon: MessageSquare,
    href: "/ai/chat",
    color: "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400",
  },
  {
    title: "Smart Match",
    description: "Find the perfect service provider based on your needs and preferences",
    icon: Users,
    href: "/ai/smart-match",
    color: "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400",
  },
  {
    title: "Price Estimator",
    description: "Upload photos and get instant AI-powered price estimates",
    icon: Calculator,
    href: "/ai/estimate",
    color: "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400",
  },
  {
    title: "Photo Analysis",
    description: "Analyze before/after photos to verify cleaning quality",
    icon: Camera,
    href: "/ai/photo-analysis",
    color: "bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400",
  },
  {
    title: "Smart Scheduling",
    description: "Find the best time slots with AI-powered demand forecasting",
    icon: Calendar,
    href: "/ai/schedule",
    color: "bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-400",
  },
  {
    title: "Review Insights",
    description: "Get AI analysis of service provider reviews and trust scores",
    icon: Star,
    href: "/ai/reviews",
    color: "bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400",
  },
];

export default function AIFeaturesPage() {
  return (
    <main className="flex-1 bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-purple-100 dark:bg-purple-900 rounded-full mb-4">
            <Sparkles className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            AI-Powered Features
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Experience smarter service booking with our suite of AI tools designed to save you time and help you find the perfect match.
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
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={feature.href}>
                    <Button variant="outline" className="w-full group">
                      Try it now
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
          <h2 className="text-2xl font-bold mb-8">How Our AI Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="font-semibold mb-2">Share Your Needs</h3>
              <p className="text-sm text-muted-foreground">
                Tell us what you're looking for or upload photos of your space
              </p>
            </div>
            <div className="p-6">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="font-semibold mb-2">AI Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Our AI analyzes your request using advanced machine learning
              </p>
            </div>
            <div className="p-6">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="font-semibold mb-2">Get Results</h3>
              <p className="text-sm text-muted-foreground">
                Receive personalized recommendations, estimates, or matches instantly
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
