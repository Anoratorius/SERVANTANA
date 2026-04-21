"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, AlertCircle, Sparkles } from "lucide-react";

interface QualityMetrics {
  cleanliness: number;
  organization: number;
  thoroughness: number;
  attentionToDetail: number;
}

interface QualityScoreProps {
  beforeScore: number;
  afterScore: number;
  improvementScore: number;
  metrics: QualityMetrics;
  qualityPassed: boolean;
  concerns: string[];
  highlights: string[];
  aiAnalysis?: string;
}

export function QualityScoreCard({
  beforeScore,
  afterScore,
  improvementScore,
  metrics,
  qualityPassed,
  concerns,
  highlights,
  aiAnalysis,
}: QualityScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    return "text-red-600";
  };

  const getProgressColor = (value: number) => {
    if (value >= 80) return "bg-green-500";
    if (value >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Quality Score
          </CardTitle>
          <Badge
            variant={qualityPassed ? "default" : "destructive"}
            className={qualityPassed ? "bg-green-600" : ""}
          >
            {qualityPassed ? (
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Passed
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                Needs Review
              </span>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Scores */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground">Before</p>
            <p className={`text-2xl font-bold ${getScoreColor(beforeScore)}`}>
              {beforeScore}/10
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">After</p>
            <p className={`text-2xl font-bold ${getScoreColor(afterScore)}`}>
              {afterScore}/10
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Improvement</p>
            <p
              className={`text-2xl font-bold ${
                improvementScore >= 70
                  ? "text-green-600"
                  : improvementScore >= 50
                    ? "text-yellow-600"
                    : "text-red-600"
              }`}
            >
              {improvementScore}%
            </p>
          </div>
        </div>

        {/* Metrics Breakdown */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Quality Metrics</h4>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Cleanliness</span>
              <span className="font-medium">{metrics.cleanliness}/10</span>
            </div>
            <Progress
              value={metrics.cleanliness * 10}
              className={`h-2 ${getProgressColor(metrics.cleanliness * 10)}`}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Organization</span>
              <span className="font-medium">{metrics.organization}/10</span>
            </div>
            <Progress
              value={metrics.organization * 10}
              className={`h-2 ${getProgressColor(metrics.organization * 10)}`}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Thoroughness</span>
              <span className="font-medium">{metrics.thoroughness}/10</span>
            </div>
            <Progress
              value={metrics.thoroughness * 10}
              className={`h-2 ${getProgressColor(metrics.thoroughness * 10)}`}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Attention to Detail</span>
              <span className="font-medium">{metrics.attentionToDetail}/10</span>
            </div>
            <Progress
              value={metrics.attentionToDetail * 10}
              className={`h-2 ${getProgressColor(metrics.attentionToDetail * 10)}`}
            />
          </div>
        </div>

        {/* AI Analysis */}
        {aiAnalysis && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">{aiAnalysis}</p>
          </div>
        )}

        {/* Highlights */}
        {highlights.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Highlights
            </h4>
            <ul className="space-y-1">
              {highlights.map((highlight, i) => (
                <li
                  key={i}
                  className="text-sm text-muted-foreground flex items-start gap-2"
                >
                  <span className="text-green-500 mt-1">+</span>
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Concerns */}
        {concerns.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              Areas for Improvement
            </h4>
            <ul className="space-y-1">
              {concerns.map((concern, i) => (
                <li
                  key={i}
                  className="text-sm text-muted-foreground flex items-start gap-2"
                >
                  <span className="text-yellow-500 mt-1">-</span>
                  {concern}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
