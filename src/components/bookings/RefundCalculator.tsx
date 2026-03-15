"use client";

import { AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import { FREE_CANCEL_HOURS, PARTIAL_REFUND_HOURS, PARTIAL_REFUND_PERCENT } from "@/lib/booking-policies";

interface RefundCalculatorProps {
  totalPrice: number;
  hoursUntilBooking: number;
  refundAmount: number;
  refundPercent: number;
  currency?: string;
}

export function RefundCalculator({
  totalPrice,
  hoursUntilBooking,
  refundAmount,
  refundPercent,
  currency = "USD",
}: RefundCalculatorProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const getRefundStatus = () => {
    if (hoursUntilBooking >= FREE_CANCEL_HOURS) {
      return {
        icon: <CheckCircle className="h-5 w-5 text-green-500" />,
        title: "Full Refund Available",
        description: `Cancel now to receive a full refund of ${formatCurrency(totalPrice)}.`,
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        textColor: "text-green-700",
      };
    }

    if (hoursUntilBooking >= PARTIAL_REFUND_HOURS) {
      return {
        icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
        title: `${PARTIAL_REFUND_PERCENT}% Refund`,
        description: `Late cancellation - you'll receive ${formatCurrency(refundAmount)} (${refundPercent}% of total).`,
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200",
        textColor: "text-yellow-700",
      };
    }

    return {
      icon: <XCircle className="h-5 w-5 text-red-500" />,
      title: "No Refund",
      description: "Cancellation within 12 hours of booking - no refund available.",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      textColor: "text-red-700",
    };
  };

  const status = getRefundStatus();

  return (
    <div className={`rounded-lg border p-4 ${status.bgColor} ${status.borderColor}`}>
      <div className="flex items-start gap-3">
        {status.icon}
        <div className="flex-1">
          <h4 className={`font-semibold ${status.textColor}`}>{status.title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{status.description}</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Clock className="h-4 w-4" />
          <span>{Math.round(hoursUntilBooking)} hours until booking</span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Booking Total</span>
            <span className="font-medium">{formatCurrency(totalPrice)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Refund Amount</span>
            <span className={`font-medium ${refundAmount > 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(refundAmount)}
            </span>
          </div>
          {refundPercent < 100 && refundPercent > 0 && (
            <div className="flex justify-between text-sm">
              <span>Cancellation Fee</span>
              <span className="font-medium text-red-600">
                {formatCurrency(totalPrice - refundAmount)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 p-3 bg-white/50 rounded text-xs text-muted-foreground">
        <strong>Cancellation Policy:</strong>
        <ul className="mt-1 space-y-1">
          <li>• {FREE_CANCEL_HOURS}+ hours notice: Full refund</li>
          <li>• {PARTIAL_REFUND_HOURS}-{FREE_CANCEL_HOURS} hours notice: {PARTIAL_REFUND_PERCENT}% refund</li>
          <li>• Under {PARTIAL_REFUND_HOURS} hours notice: No refund</li>
        </ul>
      </div>
    </div>
  );
}
