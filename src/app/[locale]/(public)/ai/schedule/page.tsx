"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  Clock,
  TrendingUp,
  TrendingDown,
  Loader2,
  Sparkles,
  DollarSign,
  Users,
  Zap,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";

interface TimeSlot {
  date: string;
  time: string;
  dayName: string;
  score: number;
  priceModifier: number;
  demandLevel: "low" | "medium" | "high" | "peak";
  reasons: string[];
  estimatedWaitTime: number;
  availableWorkers: number;
}

interface ScheduleCategories {
  bestValue: TimeSlot[];
  quickestConfirmation: TimeSlot[];
  mostAvailable: TimeSlot[];
}

export default function SmartSchedulePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [duration, setDuration] = useState("120");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<TimeSlot[]>([]);
  const [categories, setCategories] = useState<ScheduleCategories | null>(null);

  const findSlots = async () => {
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: format(selectedDate, "yyyy-MM-dd"),
          duration: parseInt(duration),
          daysAhead: 14,
        }),
      });

      if (!res.ok) throw new Error("Failed to get schedule");

      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setCategories(data.categories || null);
      toast.success("Found available time slots!");
    } catch (error) {
      toast.error("Failed to find time slots");
    } finally {
      setIsLoading(false);
    }
  };

  const getDemandColor = (level: string) => {
    switch (level) {
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "peak":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "";
    }
  };

  const TimeSlotCard = ({ slot, highlight }: { slot: TimeSlot; highlight?: string }) => (
    <Card className={`hover:shadow-md transition-shadow ${highlight ? "border-primary" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{slot.dayName}</span>
              <Badge className={getDemandColor(slot.demandLevel)}>
                {slot.demandLevel}
              </Badge>
            </div>
            <p className="text-lg font-bold mt-1">{slot.time}</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(slot.date), "MMM d, yyyy")}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-sm">
              {slot.priceModifier < 1 ? (
                <>
                  <TrendingDown className="h-4 w-4 text-green-600" />
                  <span className="text-green-600 font-medium">
                    {((1 - slot.priceModifier) * 100).toFixed(0)}% off
                  </span>
                </>
              ) : slot.priceModifier > 1 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-red-600" />
                  <span className="text-red-600 font-medium">
                    +{((slot.priceModifier - 1) * 100).toFixed(0)}%
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">Standard rate</span>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <Users className="h-3 w-3" />
              {slot.availableWorkers} available
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              ~{slot.estimatedWaitTime}min wait
            </div>
          </div>
        </div>
        {slot.reasons.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {slot.reasons.slice(0, 2).map((reason, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {reason}
              </Badge>
            ))}
          </div>
        )}
        <Button className="w-full mt-3" size="sm">
          Select This Slot
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <main className="flex-1 bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-6xl">


        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-teal-100 dark:bg-teal-900 rounded-full">
            <CalendarDays className="h-8 w-8 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Smart Scheduling</h1>
            <p className="text-muted-foreground">
              Find the best time slots with AI-powered demand forecasting
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Selection Panel */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Date Range</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Service Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="180">3 hours</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Button onClick={findSlots} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Finding Slots...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Find Best Slots
                </>
              )}
            </Button>
          </div>

          {/* Results */}
          <div className="lg:col-span-2">
            {!suggestions.length && !isLoading ? (
              <Card className="h-96 flex items-center justify-center">
                <CardContent className="text-center">
                  <div className="w-20 h-20 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CalendarDays className="h-10 w-10 text-teal-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Smart Time Slot Finder</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Our AI analyzes demand patterns, worker availability, and pricing to recommend the best times for your booking.
                  </p>
                  <div className="flex justify-center gap-4 mt-6">
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span>Best Value</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Zap className="h-4 w-4 text-yellow-600" />
                      <span>Quick Confirm</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span>Most Available</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-8">
                {categories?.bestValue && categories.bestValue.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <h2 className="font-semibold">Best Value</h2>
                      <Badge variant="outline">Lowest prices</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {categories.bestValue.slice(0, 2).map((slot, i) => (
                        <TimeSlotCard key={i} slot={slot} highlight="value" />
                      ))}
                    </div>
                  </div>
                )}

                {categories?.quickestConfirmation && categories.quickestConfirmation.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="h-5 w-5 text-yellow-600" />
                      <h2 className="font-semibold">Quickest Confirmation</h2>
                      <Badge variant="outline">Fast booking</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {categories.quickestConfirmation.slice(0, 2).map((slot, i) => (
                        <TimeSlotCard key={i} slot={slot} highlight="quick" />
                      ))}
                    </div>
                  </div>
                )}

                {suggestions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <h2 className="font-semibold">All Available Slots</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {suggestions.slice(0, 6).map((slot, i) => (
                        <TimeSlotCard key={i} slot={slot} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
