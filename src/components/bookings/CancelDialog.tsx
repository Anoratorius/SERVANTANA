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
import { RefundCalculator } from "./RefundCalculator";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  onCancelled?: () => void;
}

interface CancellationPreview {
  canCancel: boolean;
  cancelReason?: string;
  hoursUntilBooking: number;
  refund: {
    amount: number;
    percent: number;
    reason: string;
  };
  totalPrice: number;
}

export function CancelDialog({
  open,
  onOpenChange,
  bookingId,
  onCancelled,
}: CancelDialogProps) {
  const [preview, setPreview] = useState<CancellationPreview | null>(null);
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (open && bookingId) {
      fetchCancellationPreview();
    }
  }, [open, bookingId]);

  const fetchCancellationPreview = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`);
      if (res.ok) {
        const data = await res.json();
        setPreview(data);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to load cancellation details");
        onOpenChange(false);
      }
    } catch {
      toast.error("Failed to load cancellation details");
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!preview?.canCancel) return;

    setIsCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || "Booking cancelled successfully");
        onOpenChange(false);
        onCancelled?.();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to cancel booking");
      }
    } catch {
      toast.error("Failed to cancel booking");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Booking</DialogTitle>
          <DialogDescription>
            Review the cancellation details and refund policy before confirming.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : preview ? (
          <div className="space-y-4">
            {!preview.canCancel ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <p className="font-medium">Cannot Cancel</p>
                <p className="text-sm mt-1">{preview.cancelReason}</p>
              </div>
            ) : (
              <>
                <RefundCalculator
                  totalPrice={preview.totalPrice}
                  hoursUntilBooking={preview.hoursUntilBooking}
                  refundAmount={preview.refund.amount}
                  refundPercent={preview.refund.percent}
                />

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for cancellation (optional)</Label>
                  <Textarea
                    id="reason"
                    placeholder="Let us know why you're cancelling..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep Booking
          </Button>
          {preview?.canCancel && (
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isCancelling}
            >
              {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel Booking
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
