"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BackButton } from "@/components/ui/back-button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Star,
  MapPin,
  DollarSign,
  CheckCircle,
  Loader2,
  RefreshCw,
  Heart,
  Clock,
  Shield,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface WorkerMatch {
  worker: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    workerProfile?: {
      avgRating: number;
      totalReviews: number;
      hourlyRate: number;
      isVerified: boolean;
    };
  };
  matchScore: number;
  matchPercentage: number;
  matchReasons: string[];
  factors: {
    rating: number;
    experience: number;
    distance: number;
    price: number;
    availability: number;
    preferences: number;
    reliability: number;
    verification: number;
    responseTime: number;
    repeatCustomer: number;
  };
}

export default function SmartMatchPage() {
  const [matches, setMatches] = useState<WorkerMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Filters
  const [maxDistance, setMaxDistance] = useState(50);
  const [maxPrice, setMaxPrice] = useState(100);
  const [prioritizeRating, setPrioritizeRating] = useState(true);
  const [prioritizePrice, setPrioritizePrice] = useState(false);
  const [ecoFriendly, setEcoFriendly] = useState(false);
  const [petFriendly, setPetFriendly] = useState(false);

  const findMatches = async () => {
    setIsLoading(true);
    setHasSearched(true);

    try {
      // Get user location (mock for now - in production use geolocation API)
      const latitude = 52.52;
      const longitude = 13.405;

      const res = await fetch("/api/ai/smart-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude,
          longitude,
          maxDistance,
          maxPrice,
          ecoFriendly,
          petFriendly,
          preferences: {
            prioritizeRating,
            prioritizePrice,
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to find matches");

      const data = await res.json();
      setMatches(data.matches || []);

      if (data.matches?.length > 0) {
        toast.success(`Found ${data.matches.length} matches!`);
      } else {
        toast.info("No matches found. Try adjusting your filters.");
      }
    } catch (error) {
      toast.error("Failed to find matches");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex-1 bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <BackButton />

        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
            <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Smart Match</h1>
            <p className="text-muted-foreground">
              Find the perfect service provider with our 10-factor AI matching
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-lg">Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Distance */}
                <div>
                  <Label className="flex items-center justify-between mb-2">
                    <span>Max Distance</span>
                    <span className="text-muted-foreground">{maxDistance} km</span>
                  </Label>
                  <Slider
                    value={[maxDistance]}
                    onValueChange={([v]) => setMaxDistance(v)}
                    min={5}
                    max={100}
                    step={5}
                  />
                </div>

                {/* Price */}
                <div>
                  <Label className="flex items-center justify-between mb-2">
                    <span>Max Hourly Rate</span>
                    <span className="text-muted-foreground">${maxPrice}</span>
                  </Label>
                  <Slider
                    value={[maxPrice]}
                    onValueChange={([v]) => setMaxPrice(v)}
                    min={10}
                    max={200}
                    step={5}
                  />
                </div>

                {/* Priorities */}
                <div className="space-y-3">
                  <Label>Priorities</Label>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Prioritize Rating</span>
                    <Switch
                      checked={prioritizeRating}
                      onCheckedChange={setPrioritizeRating}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Prioritize Price</span>
                    <Switch
                      checked={prioritizePrice}
                      onCheckedChange={setPrioritizePrice}
                    />
                  </div>
                </div>

                {/* Special Requirements */}
                <div className="space-y-3">
                  <Label>Special Requirements</Label>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Eco-Friendly Products</span>
                    <Switch
                      checked={ecoFriendly}
                      onCheckedChange={setEcoFriendly}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Pet-Friendly</span>
                    <Switch
                      checked={petFriendly}
                      onCheckedChange={setPetFriendly}
                    />
                  </div>
                </div>

                <Button onClick={findMatches} disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Finding Matches...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Find Matches
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {!hasSearched ? (
              <Card className="h-96 flex items-center justify-center">
                <CardContent className="text-center">
                  <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-10 w-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">AI-Powered Matching</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    Our AI analyzes 10 different factors to find you the perfect service provider match.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    {["Rating", "Experience", "Distance", "Price", "Availability", "Reliability", "Verification", "Response Time"].map((factor) => (
                      <Badge key={factor} variant="outline">{factor}</Badge>
                    ))}
                  </div>
                  <Button onClick={findMatches} size="lg">
                    <Sparkles className="h-5 w-5 mr-2" />
                    Start Matching
                  </Button>
                </CardContent>
              </Card>
            ) : isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
                        <div className="flex-1 space-y-3">
                          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : matches.length === 0 ? (
              <Card className="h-96 flex items-center justify-center">
                <CardContent className="text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">No Matches Found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your filters or expanding your search area.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Found {matches.length} matches
                  </p>
                  <Button variant="outline" size="sm" onClick={findMatches}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>

                {matches.map((match, index) => (
                  <Card key={match.worker.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        {/* Match Score Ring */}
                        <div className="relative">
                          <div className="w-20 h-20">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle
                                cx="40"
                                cy="40"
                                r="36"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="6"
                                className="text-gray-200 dark:text-gray-700"
                              />
                              <circle
                                cx="40"
                                cy="40"
                                r="36"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="6"
                                strokeDasharray={`${(match.matchPercentage / 100) * 226} 226`}
                                strokeLinecap="round"
                                className="text-primary"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-lg font-bold">{match.matchPercentage}%</span>
                            </div>
                          </div>
                          {index === 0 && (
                            <Badge className="absolute -top-2 -right-2 bg-yellow-500">
                              #1
                            </Badge>
                          )}
                        </div>

                        {/* Worker Info */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg">
                                  {match.worker.firstName} {match.worker.lastName}
                                </h3>
                                {match.worker.workerProfile?.isVerified && (
                                  <Shield className="h-4 w-4 text-blue-500" />
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Star className="h-4 w-4 text-yellow-500" />
                                  {match.worker.workerProfile?.avgRating.toFixed(1) || "New"}
                                  {match.worker.workerProfile?.totalReviews && (
                                    <span>({match.worker.workerProfile.totalReviews})</span>
                                  )}
                                </span>
                                {match.worker.workerProfile?.hourlyRate && (
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="h-4 w-4" />
                                    {match.worker.workerProfile.hourlyRate}/hr
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button asChild>
                              <Link href={`/workers/${match.worker.id}`}>
                                View Profile
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </Link>
                            </Button>
                          </div>

                          {/* Match Reasons */}
                          <div className="flex flex-wrap gap-2 mt-3">
                            {match.matchReasons.slice(0, 3).map((reason, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {reason}
                              </Badge>
                            ))}
                          </div>

                          {/* Factor Scores (simplified) */}
                          <div className="grid grid-cols-5 gap-2 mt-4">
                            {[
                              { label: "Rating", value: match.factors.rating },
                              { label: "Distance", value: match.factors.distance },
                              { label: "Price", value: match.factors.price },
                              { label: "Response", value: match.factors.responseTime },
                              { label: "Reliability", value: match.factors.reliability },
                            ].map((factor) => (
                              <div key={factor.label} className="text-center">
                                <div className="text-xs text-muted-foreground mb-1">
                                  {factor.label}
                                </div>
                                <Progress
                                  value={factor.value * 100}
                                  className="h-1.5"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
