"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { BackButton } from "@/components/ui/back-button";
import {
  AlertTriangle,
  Shield,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Eye,
  Users,
  Star,
  TrendingUp,
  Brain,
  Sparkles,
  Activity,
  UserX,
  Clock,
  Globe,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";

interface SafetyReport {
  overallRiskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  flags: Array<{
    type: string;
    severity: "info" | "warning" | "alert" | "critical";
    description: string;
    evidence: string[];
  }>;
  reviewAnalysis: {
    suspiciousReviews: number;
    patterns: string[];
    authenticityScore: number;
  };
  accountAnalysis: {
    ageInDays: number;
    activityPattern: string;
    locationConsistency: number;
    deviceConsistency: number;
  };
  bookingAnalysis: {
    cancellationRate: number;
    disputeRate: number;
    unusualPatterns: string[];
  };
  recommendations: string[];
}

interface HighRiskUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  riskScore: number;
  riskLevel: string;
  lastAnalyzed: string;
}

interface AIStats {
  totalAnalyses: number;
  highRiskUsers: number;
  flaggedReviews: number;
  fraudPreventedAmount: number;
  averageRiskScore: number;
}

export default function AIInsightsPage() {
  const [searchUserId, setSearchUserId] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<SafetyReport | null>(null);
  const [highRiskUsers, setHighRiskUsers] = useState<HighRiskUser[]>([]);
  const [aiStats, setAIStats] = useState<AIStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoadingStats(true);
    try {
      // Simulated data - in production would come from API
      setAIStats({
        totalAnalyses: 1247,
        highRiskUsers: 12,
        flaggedReviews: 34,
        fraudPreventedAmount: 8450,
        averageRiskScore: 18,
      });

      setHighRiskUsers([
        {
          id: "user1",
          email: "suspicious@example.com",
          firstName: "John",
          lastName: "Doe",
          role: "CUSTOMER",
          riskScore: 72,
          riskLevel: "high",
          lastAnalyzed: "2024-01-15T10:30:00Z",
        },
        {
          id: "user2",
          email: "flagged@example.com",
          firstName: "Jane",
          lastName: "Smith",
          role: "WORKER",
          riskScore: 65,
          riskLevel: "high",
          lastAnalyzed: "2024-01-14T14:20:00Z",
        },
      ]);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const analyzeUser = async () => {
    if (!searchUserId.trim()) {
      toast.error("Please enter a user ID");
      return;
    }

    setIsAnalyzing(true);
    setReport(null);

    try {
      const res = await fetch("/api/ai/safety", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: searchUserId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Analysis failed");
      }

      const data = await res.json();
      setReport(data.report);
      toast.success("Analysis complete");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "info":
        return "text-blue-600 bg-blue-50 dark:bg-blue-900/20";
      case "warning":
        return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20";
      case "alert":
        return "text-orange-600 bg-orange-50 dark:bg-orange-900/20";
      case "critical":
        return "text-red-600 bg-red-50 dark:bg-red-900/20";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <main className="flex-1 bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <BackButton href="/admin" />

        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
            <Brain className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              AI Insights & Fraud Detection
            </h1>
            <p className="text-muted-foreground">
              Monitor platform safety with AI-powered analysis
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Analyses</p>
                  <p className="text-2xl font-bold">{aiStats?.totalAnalyses || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                  <UserX className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">High Risk Users</p>
                  <p className="text-2xl font-bold">{aiStats?.highRiskUsers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Flagged Reviews</p>
                  <p className="text-2xl font-bold">{aiStats?.flaggedReviews || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fraud Prevented</p>
                  <p className="text-2xl font-bold">${aiStats?.fraudPreventedAmount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Risk Score</p>
                  <p className="text-2xl font-bold">{aiStats?.averageRiskScore || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="analyze" className="space-y-6">
          <TabsList>
            <TabsTrigger value="analyze">
              <Search className="h-4 w-4 mr-2" />
              Analyze User
            </TabsTrigger>
            <TabsTrigger value="high-risk">
              <AlertTriangle className="h-4 w-4 mr-2" />
              High Risk Users
            </TabsTrigger>
            <TabsTrigger value="ai-features">
              <Sparkles className="h-4 w-4 mr-2" />
              AI Features Usage
            </TabsTrigger>
          </TabsList>

          {/* Analyze User Tab */}
          <TabsContent value="analyze">
            <Card>
              <CardHeader>
                <CardTitle>User Safety Analysis</CardTitle>
                <CardDescription>
                  Enter a user ID to analyze their account for potential fraud or safety concerns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-6">
                  <Input
                    placeholder="Enter User ID"
                    value={searchUserId}
                    onChange={(e) => setSearchUserId(e.target.value)}
                    className="max-w-md"
                  />
                  <Button onClick={analyzeUser} disabled={isAnalyzing}>
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Analyze
                      </>
                    )}
                  </Button>
                </div>

                {report && (
                  <div className="space-y-6">
                    {/* Risk Score Overview */}
                    <div className="flex items-center gap-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="relative w-32 h-32">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="8"
                            className="text-gray-200 dark:text-gray-700"
                          />
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            fill="none"
                            stroke={
                              report.riskLevel === "low"
                                ? "#22c55e"
                                : report.riskLevel === "medium"
                                ? "#eab308"
                                : report.riskLevel === "high"
                                ? "#f97316"
                                : "#ef4444"
                            }
                            strokeWidth="8"
                            strokeDasharray={`${(report.overallRiskScore / 100) * 352} 352`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                          <span className="text-3xl font-bold">{report.overallRiskScore}</span>
                          <span className="text-sm text-muted-foreground">Risk Score</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={getRiskColor(report.riskLevel)}>
                            {report.riskLevel.toUpperCase()} RISK
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mb-4">
                          {report.flags.length} flags detected during analysis
                        </p>
                        {report.recommendations.length > 0 && (
                          <div>
                            <p className="font-medium mb-2">Recommendations:</p>
                            <ul className="list-disc list-inside text-sm text-muted-foreground">
                              {report.recommendations.map((rec, i) => (
                                <li key={i}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Flags */}
                    {report.flags.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3">Detected Flags</h3>
                        <div className="space-y-3">
                          {report.flags.map((flag, i) => (
                            <div
                              key={i}
                              className={`p-4 rounded-lg ${getSeverityColor(flag.severity)}`}
                            >
                              <div className="flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 mt-0.5" />
                                <div>
                                  <p className="font-medium">{flag.description}</p>
                                  <p className="text-sm opacity-80 mt-1">
                                    {flag.evidence.join(", ")}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Analysis Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Account Analysis */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Account Analysis
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Account Age</span>
                            <span className="font-medium">{report.accountAnalysis.ageInDays} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Activity</span>
                            <Badge variant="outline">{report.accountAnalysis.activityPattern}</Badge>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Location Consistency</span>
                              <span>{report.accountAnalysis.locationConsistency}%</span>
                            </div>
                            <Progress value={report.accountAnalysis.locationConsistency} />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Device Consistency</span>
                              <span>{report.accountAnalysis.deviceConsistency}%</span>
                            </div>
                            <Progress value={report.accountAnalysis.deviceConsistency} />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Review Analysis */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            Review Analysis
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Suspicious Reviews</span>
                            <span className={`font-medium ${report.reviewAnalysis.suspiciousReviews > 0 ? "text-red-600" : "text-green-600"}`}>
                              {report.reviewAnalysis.suspiciousReviews}
                            </span>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Authenticity Score</span>
                              <span>{report.reviewAnalysis.authenticityScore}%</span>
                            </div>
                            <Progress
                              value={report.reviewAnalysis.authenticityScore}
                              className={report.reviewAnalysis.authenticityScore < 50 ? "[&>div]:bg-red-500" : ""}
                            />
                          </div>
                          {report.reviewAnalysis.patterns.length > 0 && (
                            <div>
                              <span className="text-sm text-muted-foreground">Patterns:</span>
                              <ul className="text-sm mt-1">
                                {report.reviewAnalysis.patterns.map((p, i) => (
                                  <li key={i} className="text-orange-600">• {p}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Booking Analysis */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            Booking Analysis
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Cancellation Rate</span>
                              <span>{report.bookingAnalysis.cancellationRate}%</span>
                            </div>
                            <Progress
                              value={report.bookingAnalysis.cancellationRate}
                              className={report.bookingAnalysis.cancellationRate > 30 ? "[&>div]:bg-red-500" : ""}
                            />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Dispute Rate</span>
                              <span>{report.bookingAnalysis.disputeRate}%</span>
                            </div>
                            <Progress
                              value={report.bookingAnalysis.disputeRate}
                              className={report.bookingAnalysis.disputeRate > 10 ? "[&>div]:bg-red-500" : ""}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* High Risk Users Tab */}
          <TabsContent value="high-risk">
            <Card>
              <CardHeader>
                <CardTitle>High Risk Users</CardTitle>
                <CardDescription>
                  Users flagged by the AI safety system for potential fraud or policy violations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {highRiskUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>No high-risk users detected</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {highRiskUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            <Users className="h-6 w-6 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{user.role}</Badge>
                              <span className="text-xs text-muted-foreground">
                                Last analyzed: {new Date(user.lastAnalyzed).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-2xl font-bold">{user.riskScore}</p>
                            <Badge className={getRiskColor(user.riskLevel)}>
                              {user.riskLevel.toUpperCase()}
                            </Badge>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSearchUserId(user.id);
                              // Switch to analyze tab would need more state management
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Features Usage Tab */}
          <TabsContent value="ai-features">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    AI Features Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: "AI Chat Assistant", usage: 2847, trend: "+12%" },
                      { name: "Smart Matching", usage: 1523, trend: "+8%" },
                      { name: "Photo Analysis", usage: 892, trend: "+23%" },
                      { name: "Price Estimator", usage: 654, trend: "+45%" },
                      { name: "Review Insights", usage: 421, trend: "+5%" },
                      { name: "Smart Scheduling", usage: 387, trend: "+18%" },
                      { name: "Route Optimizer", usage: 156, trend: "+67%" },
                      { name: "Safety Analysis", usage: 89, trend: "+2%" },
                    ].map((feature) => (
                      <div key={feature.name} className="flex items-center justify-between">
                        <span>{feature.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{feature.usage.toLocaleString()}</span>
                          <Badge variant="outline" className="text-green-600">
                            {feature.trend}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    AI Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Smart Match Success Rate</span>
                        <span className="font-medium">94%</span>
                      </div>
                      <Progress value={94} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Price Estimate Accuracy</span>
                        <span className="font-medium">87%</span>
                      </div>
                      <Progress value={87} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Photo Analysis Confidence</span>
                        <span className="font-medium">91%</span>
                      </div>
                      <Progress value={91} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Fraud Detection Accuracy</span>
                        <span className="font-medium">96%</span>
                      </div>
                      <Progress value={96} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Review Authenticity Detection</span>
                        <span className="font-medium">89%</span>
                      </div>
                      <Progress value={89} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
