"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import {
  Camera,
  Upload,
  X,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Sparkles,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  Minus,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { toast } from "sonner";

interface AnalysisResult {
  overallScore: number;
  verdict: "excellent" | "good" | "acceptable" | "needs_improvement" | "poor";
  categories: {
    name: string;
    score: number;
    status: "pass" | "warning" | "fail";
    details: string;
  }[];
  improvements: string[];
  highlights: string[];
  confidence: number;
}

export default function PhotoAnalysisPage() {
  const [beforeImage, setBeforeImage] = useState<{ file: File; preview: string } | null>(null);
  const [afterImage, setAfterImage] = useState<{ file: File; preview: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const onDropBefore = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setBeforeImage({
        file,
        preview: URL.createObjectURL(file),
      });
      setResult(null);
    }
  }, []);

  const onDropAfter = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setAfterImage({
        file,
        preview: URL.createObjectURL(file),
      });
      setResult(null);
    }
  }, []);

  const beforeDropzone = useDropzone({
    onDrop: onDropBefore,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 1,
    disabled: !!beforeImage,
  });

  const afterDropzone = useDropzone({
    onDrop: onDropAfter,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 1,
    disabled: !!afterImage,
  });

  const removeImage = (type: "before" | "after") => {
    if (type === "before" && beforeImage) {
      URL.revokeObjectURL(beforeImage.preview);
      setBeforeImage(null);
    } else if (type === "after" && afterImage) {
      URL.revokeObjectURL(afterImage.preview);
      setAfterImage(null);
    }
    setResult(null);
  };

  const analyzePhotos = async () => {
    if (!beforeImage || !afterImage) {
      toast.error("Please upload both before and after photos");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      // Convert images to base64
      const convertToBase64 = async (file: File): Promise<string> => {
        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        return `data:${file.type};base64,${base64}`;
      };

      const beforeUrl = await convertToBase64(beforeImage.file);
      const afterUrl = await convertToBase64(afterImage.file);

      const res = await fetch("/api/ai/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beforeImageUrl: beforeUrl,
          afterImageUrl: afterUrl,
        }),
      });

      if (!res.ok) throw new Error("Failed to analyze photos");

      const data = await res.json();
      setResult(data.analysis);
      toast.success("Analysis complete!");
    } catch (error) {
      toast.error("Failed to analyze photos. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case "excellent":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "good":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "acceptable":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "needs_improvement":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "poor":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass":
        return <ThumbsUp className="h-4 w-4 text-green-600" />;
      case "warning":
        return <Minus className="h-4 w-4 text-yellow-600" />;
      case "fail":
        return <ThumbsDown className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <main className="flex-1 bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-5xl">


        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full">
            <Camera className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Photo Analysis</h1>
            <p className="text-muted-foreground">
              Compare before/after photos to verify cleaning quality
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="space-y-6">
            {/* Before Photo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Before Photo</CardTitle>
                <CardDescription>
                  Upload a photo of the space before cleaning
                </CardDescription>
              </CardHeader>
              <CardContent>
                {beforeImage ? (
                  <div className="relative aspect-video">
                    <Image
                      src={beforeImage.preview}
                      alt="Before"
                      fill
                      className="object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeImage("before")}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <Badge className="absolute bottom-2 left-2">Before</Badge>
                  </div>
                ) : (
                  <div
                    {...beforeDropzone.getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      beforeDropzone.isDragActive
                        ? "border-primary bg-primary/5"
                        : "border-gray-300 hover:border-primary"
                    }`}
                  >
                    <input {...beforeDropzone.getInputProps()} />
                    <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {beforeDropzone.isDragActive
                        ? "Drop the image here..."
                        : "Drag & drop or click to select"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* After Photo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">After Photo</CardTitle>
                <CardDescription>
                  Upload a photo of the space after cleaning
                </CardDescription>
              </CardHeader>
              <CardContent>
                {afterImage ? (
                  <div className="relative aspect-video">
                    <Image
                      src={afterImage.preview}
                      alt="After"
                      fill
                      className="object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeImage("after")}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <Badge className="absolute bottom-2 left-2 bg-green-500">After</Badge>
                  </div>
                ) : (
                  <div
                    {...afterDropzone.getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      afterDropzone.isDragActive
                        ? "border-primary bg-primary/5"
                        : "border-gray-300 hover:border-primary"
                    }`}
                  >
                    <input {...afterDropzone.getInputProps()} />
                    <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {afterDropzone.isDragActive
                        ? "Drop the image here..."
                        : "Drag & drop or click to select"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              onClick={analyzePhotos}
              disabled={!beforeImage || !afterImage || isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Analyze Photos
                </>
              )}
            </Button>
          </div>

          {/* Results Section */}
          <div>
            {result ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Analysis Result</CardTitle>
                    <Badge className={getVerdictColor(result.verdict)}>
                      {result.verdict.replace("_", " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Overall Score */}
                  <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Overall Score</p>
                    <p className={`text-5xl font-bold ${getScoreColor(result.overallScore)}`}>
                      {result.overallScore}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">out of 100</p>
                    <div className="mt-3 px-8">
                      <Progress value={result.overallScore} className="h-2" />
                    </div>
                  </div>

                  {/* Categories */}
                  <div>
                    <h3 className="font-semibold mb-3">Category Breakdown</h3>
                    <div className="space-y-3">
                      {result.categories.map((category, i) => (
                        <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(category.status)}
                              <span className="font-medium">{category.name}</span>
                            </div>
                            <span className={`font-bold ${getScoreColor(category.score)}`}>
                              {category.score}%
                            </span>
                          </div>
                          <Progress value={category.score} className="h-1.5 mb-2" />
                          <p className="text-xs text-muted-foreground">{category.details}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Highlights */}
                  {result.highlights.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Highlights
                      </h3>
                      <ul className="space-y-2">
                        {result.highlights.map((highlight, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                            {highlight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Improvements */}
                  {result.improvements.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        Areas for Improvement
                      </h3>
                      <ul className="space-y-2">
                        {result.improvements.map((improvement, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <ArrowRight className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                            {improvement}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Confidence */}
                  <div className="text-center text-sm text-muted-foreground">
                    Analysis confidence: {result.confidence}%
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">Compare Before & After</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Upload before and after photos to get an AI-powered quality analysis of the cleaning work.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-6">
                    {["Cleanliness", "Organization", "Surface Quality", "Detail Work"].map((item) => (
                      <Badge key={item} variant="outline">{item}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
