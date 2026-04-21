"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BackButton } from "@/components/ui/back-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calculator,
  Upload,
  X,
  Clock,
  Home,
  DollarSign,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { toast } from "sonner";

interface PriceEstimate {
  estimatedPrice: { low: number; mid: number; high: number; currency: string };
  breakdown: { basePrice: number; sizeMultiplier: number; difficultyMultiplier: number; specialtyAddons: number };
  spaceAnalysis: { estimatedSqMeters: number; roomCount: number; roomTypes: string[]; condition: string; difficulty: number };
  timeEstimate: { minMinutes: number; maxMinutes: number; recommended: number };
  specialRequirements: string[];
  confidence: number;
  notes: string;
}

export default function PriceEstimatePage() {
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [serviceType, setServiceType] = useState("cleaning");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [estimate, setEstimate] = useState<PriceEstimate | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.slice(0, 5 - images.length).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newImages]);
  }, [images.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 5 - images.length,
    disabled: images.length >= 5,
  });

  const removeImage = (index: number) => {
    setImages((prev) => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
    setEstimate(null);
  };

  const getEstimate = async () => {
    if (images.length === 0) {
      toast.error("Please upload at least one photo");
      return;
    }

    setIsLoading(true);
    setEstimate(null);

    try {
      // Convert images to base64
      const imageUrls = await Promise.all(
        images.map(async (img) => {
          const buffer = await img.file.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          return `data:${img.file.type};base64,${base64}`;
        })
      );

      const res = await fetch("/api/ai/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrls,
          serviceType,
          additionalInfo: additionalInfo || undefined,
          userCurrency: "USD",
        }),
      });

      if (!res.ok) throw new Error("Failed to get estimate");

      const data = await res.json();
      setEstimate(data.estimate);
      toast.success("Estimate generated successfully");
    } catch (error) {
      toast.error("Failed to generate estimate. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600";
    if (confidence >= 60) return "text-blue-600";
    if (confidence >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <main className="flex-1 bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <BackButton />

        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
            <Calculator className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Price Estimator</h1>
            <p className="text-muted-foreground">
              Upload photos to get an instant AI-powered price estimate
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            {/* Service Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Service Type</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={serviceType} onValueChange={setServiceType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cleaning">Standard Cleaning</SelectItem>
                    <SelectItem value="deep">Deep Cleaning</SelectItem>
                    <SelectItem value="moveInOut">Move In/Out Cleaning</SelectItem>
                    <SelectItem value="office">Office Cleaning</SelectItem>
                    <SelectItem value="post_construction">Post-Construction</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Photo Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upload Photos</CardTitle>
                <CardDescription>
                  Upload up to 5 photos of your space for accurate estimates
                </CardDescription>
              </CardHeader>
              <CardContent>
                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {images.map((img, index) => (
                      <div key={index} className="relative aspect-square">
                        <Image
                          src={img.preview}
                          alt={`Upload ${index + 1}`}
                          fill
                          className="object-cover rounded-lg"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {images.length < 5 && (
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      isDragActive
                        ? "border-primary bg-primary/5"
                        : "border-gray-300 hover:border-primary"
                    }`}
                  >
                    <input {...getInputProps()} />
                    <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {isDragActive
                        ? "Drop the images here..."
                        : "Drag & drop images here, or click to select"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {5 - images.length} more {5 - images.length === 1 ? "photo" : "photos"} allowed
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Additional Information</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="Any special requirements? (e.g., pet hair, recent renovation, specific areas needing attention...)"
                  rows={3}
                />
              </CardContent>
            </Card>

            <Button
              onClick={getEstimate}
              disabled={images.length === 0 || isLoading}
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
                  Get Price Estimate
                </>
              )}
            </Button>
          </div>

          {/* Results Section */}
          <div>
            {estimate ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Price Estimate</CardTitle>
                    <Badge className={getConfidenceColor(estimate.confidence)}>
                      {estimate.confidence}% confident
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Price Display */}
                  <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Estimated Price</p>
                    <p className="text-4xl font-bold text-primary">
                      {estimate.estimatedPrice.currency} {estimate.estimatedPrice.mid}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Range: {estimate.estimatedPrice.low} - {estimate.estimatedPrice.high}
                    </p>
                  </div>

                  {/* Space Analysis */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Space Analysis
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-2xl font-bold">{estimate.spaceAnalysis.estimatedSqMeters}</p>
                        <p className="text-xs text-muted-foreground">m² estimated</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-2xl font-bold">{estimate.spaceAnalysis.roomCount}</p>
                        <p className="text-xs text-muted-foreground">rooms</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-2xl font-bold capitalize">{estimate.spaceAnalysis.condition}</p>
                        <p className="text-xs text-muted-foreground">condition</p>
                      </div>
                    </div>

                    {estimate.spaceAnalysis.roomTypes.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {estimate.spaceAnalysis.roomTypes.map((room, i) => (
                          <Badge key={i} variant="outline">{room}</Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Time Estimate */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Time Estimate
                    </h3>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Duration</span>
                        <span className="font-medium">
                          {estimate.timeEstimate.minMinutes} - {estimate.timeEstimate.maxMinutes} minutes
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-muted-foreground">Recommended</span>
                        <span className="font-medium">{estimate.timeEstimate.recommended} minutes</span>
                      </div>
                    </div>
                  </div>

                  {/* Special Requirements */}
                  {estimate.specialRequirements.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        Special Requirements
                      </h3>
                      <ul className="space-y-2">
                        {estimate.specialRequirements.map((req, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Price Breakdown */}
                  <div>
                    <button
                      onClick={() => setShowBreakdown(!showBreakdown)}
                      className="flex items-center justify-between w-full py-2"
                    >
                      <span className="font-semibold flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Price Breakdown
                      </span>
                      {showBreakdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {showBreakdown && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Base Price</span>
                          <span>${estimate.breakdown.basePrice}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Size Multiplier</span>
                          <span>×{estimate.breakdown.sizeMultiplier}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Difficulty Multiplier</span>
                          <span>×{estimate.breakdown.difficultyMultiplier}</span>
                        </div>
                        {estimate.breakdown.specialtyAddons > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>Specialty Add-ons</span>
                            <span>+${estimate.breakdown.specialtyAddons}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {estimate.notes && (
                    <p className="text-sm text-muted-foreground italic">
                      {estimate.notes}
                    </p>
                  )}

                  {/* CTA */}
                  <Button className="w-full" asChild>
                    <a href="/search">Find Service Providers</a>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calculator className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">Upload Photos to Get Started</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Our AI will analyze your photos and provide an accurate price estimate based on room size, condition, and complexity.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
