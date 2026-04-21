"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { FREE_RESCHEDULE_HOURS, MAX_RESCHEDULES } from "@/lib/booking-policies";

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  workerId: string;
  currentDate: string;
  currentTime: string;
  onRescheduled?: () => void;
}

interface TimeSlot {
  date: string;
  time: string;
  available: boolean;
}

export function RescheduleDialog({
  open,
  onOpenChange,
  bookingId,
  workerId,
  currentDate,
  currentTime,
  onRescheduled,
}: RescheduleDialogProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get unique dates from available slots
  const availableDates = [...new Set(slots.filter((s) => s.available).map((s) => s.date))];

  // Get times for selected date
  const availableTimes = slots.filter(
    (s) => s.date === selectedDate && s.available
  );

  useEffect(() => {
    if (open && workerId) {
      fetchAvailableSlots();
    }
  }, [open, workerId]);

  useEffect(() => {
    // Reset time selection when date changes
    setSelectedTime("");
  }, [selectedDate]);

  const fetchAvailableSlots = async () => {
    setIsLoading(true);
    try {
      const startDate = new Date().toISOString().split("T")[0];
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const res = await fetch(
        `/api/worker/availability-slots?workerId=${workerId}&startDate=${startDate}&endDate=${endDate}`
      );

      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
      } else {
        toast.error("Failed to load available slots");
      }
    } catch {
      toast.error("Failed to load available slots");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select a new date and time");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newDate: selectedDate,
          newTime: selectedTime,
          reason,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || "Reschedule request submitted");
        onOpenChange(false);
        onRescheduled?.();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to reschedule");
      }
    } catch {
      toast.error("Failed to reschedule");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reschedule Booking</DialogTitle>
          <DialogDescription>
            Select a new date and time for your booking.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current booking info */}
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium">Current Booking</p>
              <div className="flex items-center gap-4 mt-1 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(currentDate)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {currentTime}
                </span>
              </div>
            </div>

            {/* Policy info */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
              <div className="text-blue-700">
                <p>Reschedule is free with {FREE_RESCHEDULE_HOURS}+ hours notice.</p>
                <p className="text-xs mt-1">Maximum {MAX_RESCHEDULES} reschedules per booking.</p>
              </div>
            </div>

            {/* Date selection */}
            <div className="space-y-2">
              <Label>Select New Date</Label>
              {availableDates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No available dates found. The worker may not have set their availability.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {availableDates.slice(0, 14).map((date) => (
                    <Button
                      key={date}
                      type="button"
                      variant={selectedDate === date ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedDate(date)}
                      className="text-xs"
                    >
                      {formatDate(date)}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Time selection */}
            {selectedDate && (
              <div className="space-y-2">
                <Label>Select New Time</Label>
                {availableTimes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No available times for this date.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {availableTimes.map((slot) => (
                      <Button
                        key={slot.time}
                        type="button"
                        variant={selectedTime === slot.time ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTime(slot.time)}
                        className="text-xs"
                      >
                        {slot.time}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for rescheduling (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Let the worker know why you're rescheduling..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleReschedule}
            disabled={isSubmitting || !selectedDate || !selectedTime}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Request Reschedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
