"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface GuaranteeClaimFormProps {
  bookingId: string;
  onSuccess?: () => void;
}

const CLAIM_REASONS = [
  "NO_SHOW",
  "INCOMPLETE_SERVICE",
  "POOR_QUALITY",
  "PROPERTY_DAMAGE",
  "LATE_ARRIVAL",
  "UNPROFESSIONAL",
  "OTHER",
] as const;

export function GuaranteeClaimForm({ bookingId, onSuccess }: GuaranteeClaimFormProps) {
  const t = useTranslations("guarantee");
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState("");

  const handleSubmit = async () => {
    if (!reason || description.length < 20) {
      toast.error("Please select a reason and provide a description (at least 20 characters)");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/guarantee/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          reason,
          description,
          evidence: [],
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(t("claimForm.submitSuccess"));
        setOpen(false);
        setReason("");
        setDescription("");
        onSuccess?.();
      } else {
        toast.error(data.error || t("claimForm.submitError"));
      }
    } catch {
      toast.error(t("claimForm.submitError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
          <Shield className="w-4 h-4 mr-2" />
          {t("claimForm.title")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            {t("claimForm.title")}
          </DialogTitle>
          <DialogDescription>{t("shortDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t("claimForm.selectReason")}</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder={t("claimForm.selectReason")} />
              </SelectTrigger>
              <SelectContent>
                {CLAIM_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`claimForm.reasons.${r}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("claimForm.descriptionLabel")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("claimForm.descriptionPlaceholder")}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/20 characters minimum
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("back")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !reason || description.length < 20}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("claimForm.submitting")}
              </>
            ) : (
              t("claimForm.submitClaim")
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
