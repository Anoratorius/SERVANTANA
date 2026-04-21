"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BackButton } from "@/components/ui/back-button";
import {
  Star,
  Search,
  Loader2,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Shield,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

interface ReviewInsight {
  workerId: string;
  workerName: string;
  overallSentiment: "positive" | "neutral" | "negative";
  trustScore: number;
  totalReviews: number;
  avgRating: number;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  themes: {
    theme: string;
    count: number;
    sentiment: "positive" | "neutral" | "negative";
  }[];
  strengths: string[];
  concerns: string[];
  recentTrend: "improving" | "stable" | "declining";
  flaggedReviews: number;
  verifiedReviewsPercentage: number;
  responseRate: number;
  summaryText: string;
}

export default function ReviewInsightsPage() {
  const [workerId, setWorkerId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<ReviewInsight | null>(null);

  const analyzeReviews = async () => {
    if (!workerId.trim()) {
      toast.error("Please enter a worker ID");
      return;
    }

    setIsLoading(true);
    setInsights(null);

    try {
      const res = await fetch("/api/ai/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId: workerId.trim() }),
      });

      if (!res.ok) throw new Error("Failed to analyze reviews");

      const data = await res.json();
      setInsights(data.insights);
      toast.success("Analysis complete!");
    } catch (error) {
      toast.error("Failed to analyze reviews. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "neutral":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "negative":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "";
    }
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "declining":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <span className="text-muted-foreground">→</span>;
    }
  };

  return (
    <main className="flex-1 bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <BackButton />

        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
            <Star className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Review Insights</h1>
            <p className="text-muted-foreground">
              Get AI analysis of service provider reviews and trust scores
            </p>
          </div>
        </div>

        {/* Search */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Analyze Worker Reviews</CardTitle>
            <CardDescription>
              Enter a worker ID to get AI-powered insights about their reviews
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                value={workerId}
                onChange={(e) => setWorkerId(e.target.value)}
                placeholder="Enter worker ID..."
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && analyzeReviews()}
              />
              <Button onClick={analyzeReviews} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {insights ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Stats */}
            <div className="lg:col-span-2 space-y-6">
              {/* Overview Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{insights.workerName}</CardTitle>
                    <Badge className={getSentimentColor(insights.overallSentiment)}>
                      {insights.overallSentiment} sentiment
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className={`text-2xl font-bold ${getTrustScoreColor(insights.trustScore)}`}>
                        {insights.trustScore}
                      </p>
                      <p className="text-xs text-muted-foreground">Trust Score</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-2xl font-bold">{insights.avgRating.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">Avg Rating</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-2xl font-bold">{insights.totalReviews}</p>
                      <p className="text-xs text-muted-foreground">Reviews</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-center gap-1">
                        {getTrendIcon(insights.recentTrend)}
                        <span className="text-sm font-medium capitalize">{insights.recentTrend}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Trend</p>
                    </div>
                  </div>

                  {/* Sentiment Breakdown */}
                  <div className="mb-6">
                    <h4 className="font-medium mb-3">Sentiment Distribution</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <ThumbsUp className="h-4 w-4 text-green-600" />
                        <div className="flex-1">
                          <Progress value={insights.sentimentBreakdown.positive} className="h-2" />
                        </div>
                        <span className="text-sm w-12 text-right">{insights.sentimentBreakdown.positive}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground w-4 text-center">—</span>
                        <div className="flex-1">
                          <Progress value={insights.sentimentBreakdown.neutral} className="h-2 [&>div]:bg-gray-400" />
                        </div>
                        <span className="text-sm w-12 text-right">{insights.sentimentBreakdown.neutral}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <ThumbsDown className="h-4 w-4 text-red-600" />
                        <div className="flex-1">
                          <Progress value={insights.sentimentBreakdown.negative} className="h-2 [&>div]:bg-red-500" />
                        </div>
                        <span className="text-sm w-12 text-right">{insights.sentimentBreakdown.negative}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      AI Summary
                    </h4>
                    <p className="text-sm text-muted-foreground">{insights.summaryText}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Themes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Common Themes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {insights.themes.map((theme, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className={`${getSentimentColor(theme.sentiment)} border-0`}
                      >
                        {theme.theme} ({theme.count})
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Strengths & Concerns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {insights.strengths.map((strength, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      Concerns
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {insights.concerns.length > 0 ? (
                      <ul className="space-y-2">
                        {insights.concerns.map((concern, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                            {concern}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No significant concerns identified</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Trust Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Trust Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Verified Reviews</span>
                      <span className="font-medium">{insights.verifiedReviewsPercentage}%</span>
                    </div>
                    <Progress value={insights.verifiedReviewsPercentage} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Response Rate</span>
                      <span className="font-medium">{insights.responseRate}%</span>
                    </div>
                    <Progress value={insights.responseRate} className="h-2" />
                  </div>
                  {insights.flaggedReviews > 0 && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {insights.flaggedReviews} flagged reviews
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Some reviews may need investigation
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardContent className="pt-6">
                  <Button className="w-full mb-3" asChild>
                    <a href={`/workers/${insights.workerId}`}>View Full Profile</a>
                  </Button>
                  <Button variant="outline" className="w-full">
                    Export Report
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card className="flex items-center justify-center py-16">
            <CardContent className="text-center">
              <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-10 w-10 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Review Intelligence</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Our AI analyzes reviews to extract insights about service quality, identify patterns, and calculate trust scores.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {["Sentiment Analysis", "Theme Extraction", "Trust Score", "Trend Detection", "Fraud Detection"].map((feature) => (
                  <Badge key={feature} variant="outline">{feature}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
