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
import { Input } from "@/components/ui/input";
import { Heart, Loader2, DollarSign, Check } from "lucide-react";
import { toast } from "sonner";

interface TipDialogProps {
  bookingId: string;
  cleanerName: string;
  totalPrice: number;
  onTipComplete?: (amount: number) => void;
}

const TIP_PRESETS = [5, 10, 15, 20];

export function TipDialog({
  bookingId,
  cleanerName,
  totalPrice,
  onTipComplete,
}: TipDialogProps) {
  const t = useTranslations("tip");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  const tipAmount = selectedAmount || (customAmount ? parseFloat(customAmount) : 0);

  const handleSubmit = async () => {
    if (!tipAmount || tipAmount <= 0) {
      toast.error(t("selectAmount"));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/tip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: tipAmount }),
      });

      if (response.ok) {
        setHasCompleted(true);
        toast.success(t("thankYou", { amount: tipAmount.toFixed(2) }));
        onTipComplete?.(tipAmount);
        setTimeout(() => setIsOpen(false), 2000);
      } else {
        const error = await response.json();
        toast.error(error.error || t("failed"));
      }
    } catch (error) {
      console.error("Error submitting tip:", error);
      toast.error(t("failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePresetClick = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const handleCustomChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  // Calculate percentage tips based on total price
  const percentageTips = [10, 15, 20].map((pct) => ({
    percent: pct,
    amount: Math.round(totalPrice * (pct / 100) * 100) / 100,
  }));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 border-pink-200 text-pink-600 hover:bg-pink-50 hover:text-pink-700"
        >
          <Heart className="h-4 w-4" />
          {t("addTip")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {t("description", { name: cleanerName })}
          </DialogDescription>
        </DialogHeader>

        {hasCompleted ? (
          <div className="py-8 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-lg font-medium text-green-600">
              {t("sent", { amount: tipAmount.toFixed(2) })}
            </p>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Percentage-based tips */}
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                {t("percentageOf", { price: totalPrice.toFixed(2) })}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {percentageTips.map(({ percent, amount }) => (
                  <Button
                    key={percent}
                    variant={selectedAmount === amount ? "default" : "outline"}
                    onClick={() => handlePresetClick(amount)}
                    className="flex-col h-auto py-3"
                  >
                    <span className="text-lg font-bold">{percent}%</span>
                    <span className="text-xs opacity-70">${amount.toFixed(2)}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Fixed amount tips */}
            <div>
              <p className="text-sm text-muted-foreground mb-3">{t("orFixed")}</p>
              <div className="grid grid-cols-4 gap-2">
                {TIP_PRESETS.map((amount) => (
                  <Button
                    key={amount}
                    variant={selectedAmount === amount ? "default" : "outline"}
                    onClick={() => handlePresetClick(amount)}
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom amount */}
            <div>
              <p className="text-sm text-muted-foreground mb-3">{t("orCustom")}</p>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  min="1"
                  max="500"
                  step="0.01"
                  placeholder="0.00"
                  value={customAmount}
                  onChange={(e) => handleCustomChange(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={!tipAmount || tipAmount <= 0 || isSubmitting}
              className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Heart className="h-4 w-4 mr-2" />
              )}
              {tipAmount > 0
                ? t("sendTip", { amount: tipAmount.toFixed(2) })
                : t("selectToTip")}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              {t("goesToCleaner")}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
