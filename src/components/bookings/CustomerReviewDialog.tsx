"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Loader2, Check, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

interface CustomerReviewDialogProps {
  bookingId: string;
  customerName: string;
  onReviewComplete?: () => void;
}

interface RatingCategory {
  key: string;
  label: string;
  value: number;
}

export function CustomerReviewDialog({
  bookingId,
  customerName,
  onReviewComplete,
}: CustomerReviewDialogProps) {
  const t = useTranslations("customerReview");
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [comment, setComment] = useState("");
  const [ratings, setRatings] = useState<RatingCategory[]>([
    { key: "punctuality", label: t("punctuality"), value: 0 },
    { key: "cleanliness", label: t("cleanliness"), value: 0 },
    { key: "communication", label: t("communication"), value: 0 },
    { key: "overall", label: t("overall"), value: 0 },
  ]);

  const handleRatingChange = (key: string, value: number) => {
    setRatings((prev) =>
      prev.map((r) => (r.key === key ? { ...r, value } : r))
    );
  };

  const handleSubmit = async () => {
    // Validate all ratings are set
    const allRated = ratings.every((r) => r.value > 0);
    if (!allRated) {
      toast.error(t("rateAll"));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/customer-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          punctuality: ratings.find((r) => r.key === "punctuality")?.value,
          cleanliness: ratings.find((r) => r.key === "cleanliness")?.value,
          communication: ratings.find((r) => r.key === "communication")?.value,
          overall: ratings.find((r) => r.key === "overall")?.value,
          comment: comment.trim() || null,
        }),
      });

      if (response.ok) {
        setHasCompleted(true);
        toast.success(t("submitted"));
        onReviewComplete?.();
        setTimeout(() => setIsOpen(false), 2000);
      } else {
        const error = await response.json();
        toast.error(error.error || t("failed"));
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error(t("failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ClipboardCheck className="h-4 w-4" />
          {t("rateCustomer")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-blue-500" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {t("description", { name: customerName })}
          </DialogDescription>
        </DialogHeader>

        {hasCompleted ? (
          <div className="py-8 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-lg font-medium text-green-600">{t("thankYou")}</p>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Rating categories */}
            {ratings.map((category) => (
              <div key={category.key}>
                <Label className="text-sm font-medium">{category.label}</Label>
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleRatingChange(category.key, star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          star <= category.value
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Comment */}
            <div>
              <Label htmlFor="comment">{t("commentLabel")}</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t("commentPlaceholder")}
                rows={3}
                className="mt-2"
              />
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ClipboardCheck className="h-4 w-4 mr-2" />
              )}
              {t("submit")}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              {t("onlyWorkers")}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
