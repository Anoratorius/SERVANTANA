"use client";

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

// Service fee calculation: €0.99 fixed + 2.5% of base price
const SERVICE_FEE_FIXED = 0.99;
const SERVICE_FEE_PERCENT = 0.025;

function calculateTotalWithFees(basePrice: number): number {
  const percentageFee = Math.round(basePrice * SERVICE_FEE_PERCENT * 100) / 100;
  return Math.round((basePrice + SERVICE_FEE_FIXED + percentageFee) * 100) / 100;
}

import { useEffect, useState, use, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import {
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  CreditCard,
  AlertCircle,
  Loader2,
  Bitcoin,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ServiceGuaranteeBadge } from "@/components/guarantee";
import { toast } from "sonner";
import Script from "next/script";

interface Payment {
  id: string;
  status: string;
  amount: number;
  currency: string;
  receiptUrl?: string;
  provider?: string;
}

interface FeeBreakdown {
  bookingPrice: number;
  customerTotal: number;
  customerFixedFee: number;
  customerPercentageFee: number;
  workerReceives: number;
  currency: string;
  formatted: {
    bookingPrice: string;
    customerPays: string;
    customerFee: string;
    workerReceives: string;
  };
}

interface Booking {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  address: string | null;
  city: string | null;
  totalPrice: number;
  currency: string;
  status: string;
  worker: {
    firstName: string;
    lastName: string;
  };
  service: {
    name: string;
  } | null;
  payment?: Payment;
}

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: {
        style?: { layout?: string; color?: string; shape?: string; label?: string };
        createOrder: () => Promise<string>;
        onApprove: (data: { orderID: string }) => Promise<void>;
        onError: (err: Error) => void;
        onCancel: () => void;
      }) => { render: (selector: string) => void };
    };
  }
}

export default function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations();
  const searchParams = useSearchParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isProcessingCrypto, setIsProcessingCrypto] = useState(false);
  const [paypalReady, setPaypalReady] = useState(false);
  const [showCryptoOptions, setShowCryptoOptions] = useState(false);
  const [fees, setFees] = useState<FeeBreakdown | null>(null);

  const paymentStatus = searchParams.get("payment");
  const paymentMethod = searchParams.get("method");

  const isPaid = booking?.payment?.status === "SUCCEEDED";
  const isPaymentPending = booking?.payment?.status === "PROCESSING" || !booking?.payment;

  const fetchBooking = useCallback(async () => {
    try {
      const response = await fetch(`/api/bookings/${id}`);
      if (response.ok) {
        const data = await response.json();
        setBooking(data.booking);

        // Always fetch fee breakdown (for both paid and unpaid)
        if (data.booking) {
          const feesRes = await fetch(
            `/api/fees?price=${data.booking.totalPrice}&currency=${data.booking.currency || "EUR"}`
          );
          if (feesRes.ok) {
            const feesData = await feesRes.json();
            setFees(feesData);
          }
        }

      }
    } catch (error) {
      console.error("Error fetching booking:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  useEffect(() => {
    if (paymentStatus === "success") {
      if (paymentMethod === "crypto") {
        toast.success("Crypto payment initiated! Waiting for blockchain confirmation.");
      } else {
        toast.success("Payment successful! Your booking is confirmed.");
      }
      fetchBooking();
    } else if (paymentStatus === "cancelled") {
      toast.info("Payment was cancelled. You can pay anytime from your bookings.");
    }
  }, [paymentStatus, paymentMethod, fetchBooking]);

  // Initialize PayPal buttons
  useEffect(() => {
    if (paypalReady && booking && window.paypal && !isPaid) {
      const container = document.getElementById("paypal-button-container");
      if (container) {
        container.innerHTML = ""; // Clear previous buttons
        window.paypal
          .Buttons({
            style: {
              layout: "horizontal",
              color: "blue",
              shape: "rect",
              label: "paypal",
            },
            createOrder: async () => {
              const response = await fetch("/api/payments/paypal/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookingId: booking.id }),
              });
              const data = await response.json();
              if (!response.ok) {
                throw new Error(data.error || "Failed to create order");
              }
              return data.orderId;
            },
            onApprove: async (data) => {
              try {
                const response = await fetch("/api/payments/paypal/capture-order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    orderId: data.orderID,
                    bookingId: booking.id,
                  }),
                });
                const result = await response.json();
                if (response.ok) {
                  toast.success("Payment successful! Your booking is confirmed.");
                  fetchBooking(); // Refresh to show updated status
                } else {
                  toast.error(result.error || "Payment failed");
                }
              } catch {
                toast.error("Failed to capture payment");
              }
            },
            onError: (err) => {
              console.error("PayPal error:", err);
              toast.error("PayPal payment failed. Please try again.");
            },
            onCancel: () => {
              toast.info("PayPal payment cancelled.");
            },
          })
          .render("#paypal-button-container");
      }
    }
  }, [paypalReady, booking, isPaid, fetchBooking]);

  const handleStripePayment = async () => {
    if (!booking) return;

    setIsProcessingPayment(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      const message = error instanceof Error ? error.message : "Failed to process payment";
      toast.error(message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleCryptoPayment = async () => {
    if (!booking) return;

    setIsProcessingCrypto(true);
    try {
      const response = await fetch("/api/payments/crypto/create-charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create crypto charge");
      }

      // Redirect to Coinbase Commerce hosted checkout
      if (data.hostedUrl) {
        window.location.href = data.hostedUrl;
      }
    } catch (error) {
      console.error("Error processing crypto payment:", error);
      toast.error("Failed to process crypto payment. Please try again.");
    } finally {
      setIsProcessingCrypto(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      

      {/* PayPal Script */}
      {PAYPAL_CLIENT_ID && (
        <Script
          src={`https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`}
          strategy="afterInteractive"
          onLoad={() => {
            console.log("PayPal SDK loaded");
            setPaypalReady(true);
          }}
          onError={(e) => console.error("PayPal SDK failed to load", e)}
        />
      )}

      <main className="flex-1 bg-gradient-to-b from-green-50 to-white py-16">
        <div className="container mx-auto px-4 max-w-2xl text-center">

          {/* Success/Status Icon */}
          <div className="mb-8">
            {isPaid ? (
              <>
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 mb-4">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <h1 className="text-3xl font-bold text-green-600 mb-2">
                  Booking Confirmed & Paid!
                </h1>
                <p className="text-muted-foreground">
                  Your booking is confirmed and payment has been received.
                </p>
                <div className="mt-4">
                  <ServiceGuaranteeBadge variant="card" />
                </div>
              </>
            ) : (
              <>
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-amber-100 mb-4">
                  <AlertCircle className="h-12 w-12 text-amber-600" />
                </div>
                <h1 className="text-3xl font-bold text-amber-600 mb-2">
                  Booking Created - Payment Required
                </h1>
                <p className="text-muted-foreground">
                  Your booking has been created. Please complete payment to confirm.
                </p>
              </>
            )}
          </div>

          {/* Booking Details */}
          {booking && (
            <Card className={`text-left mb-8 border-t-4 ${isPaid ? "border-t-green-500" : "border-t-amber-500"}`}>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-lg">Booking Details</h2>
                  <span className={`text-sm px-3 py-1 rounded-full ${
                    isPaid
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {isPaid ? "Paid" : "Payment Pending"}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date & Time</p>
                      <p className="font-medium">
                        {new Date(booking.scheduledDate).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}{" "}
                        at {booking.scheduledTime}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-medium">
                        {booking.duration >= 60
                          ? `${Math.floor(booking.duration / 60)} hour${Math.floor(booking.duration / 60) > 1 ? 's' : ''}${booking.duration % 60 > 0 ? ` ${booking.duration % 60} min` : ''}`
                          : `${booking.duration} minutes`
                        }
                      </p>
                    </div>
                  </div>

                  {(booking.address || booking.city) && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Address</p>
                        <p className="font-medium">
                          {booking.address}
                          {booking.city && `, ${booking.city}`}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Worker</p>
                      <p className="font-medium">
                        {booking.worker.firstName} {booking.worker.lastName}
                        {booking.service && (
                          <> - {t(`cleaner.services.${booking.service.name}` as Parameters<typeof t>[0])}</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-between items-center">
                  <span className="text-muted-foreground">Total (incl. service fee)</span>
                  <span className={`text-2xl font-bold ${isPaid ? "text-green-600" : "text-amber-600"}`}>
                    {booking.currency === "EUR" ? "€" : "$"}
                    {calculateTotalWithFees(booking.totalPrice).toFixed(2)}
                  </span>
                </div>

                {/* Payment Options */}
                {isPaymentPending && (
                  <div className="pt-4 border-t space-y-4">
                    {/* Fee Breakdown */}
                    {fees && (
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Service price</span>
                          <span>{fees.formatted.bookingPrice}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Service fee</span>
                          <span>{fees.formatted.customerFee}</span>
                        </div>
                        <div className="flex justify-between font-semibold border-t pt-2">
                          <span>Total</span>
                          <span className="text-lg">{fees.formatted.customerPays}</span>
                        </div>
                      </div>
                    )}

                    <p className="text-sm font-medium text-center text-muted-foreground">
                      Choose your payment method
                    </p>

                    {/* Stripe Button */}
                    <Button
                      onClick={handleStripePayment}
                      disabled={isProcessingPayment}
                      className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                      size="lg"
                    >
                      {isProcessingPayment ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-5 w-5" />
                          Pay with Card {fees ? `- ${fees.formatted.customerPays}` : ""}
                        </>
                      )}
                    </Button>

                    {/* Divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-muted-foreground">Or</span>
                      </div>
                    </div>

                    {/* PayPal Button Container */}
                    {PAYPAL_CLIENT_ID && (
                      <div id="paypal-button-container" className="min-h-[45px]">
                        {!paypalReady && (
                          <div className="flex items-center justify-center py-3">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
                            <span className="text-sm text-muted-foreground">Loading PayPal...</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-muted-foreground">Or pay with Crypto</span>
                      </div>
                    </div>

                    {/* Crypto Payment Button */}
                    {!showCryptoOptions ? (
                      <Button
                        onClick={() => setShowCryptoOptions(true)}
                        variant="outline"
                        className="w-full border-2 border-orange-200 hover:border-orange-400 hover:bg-orange-50"
                        size="lg"
                      >
                        <Bitcoin className="mr-2 h-5 w-5 text-orange-500" />
                        Pay with Cryptocurrency
                      </Button>
                    ) : (
                      <div className="space-y-3 p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                        <p className="text-sm font-medium text-center">
                          Select cryptocurrency
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={handleCryptoPayment}
                            disabled={isProcessingCrypto}
                            className="flex flex-col items-center p-3 bg-white rounded-lg border hover:border-orange-400 hover:shadow-md transition-all disabled:opacity-50"
                          >
                            <span className="text-2xl mb-1">₿</span>
                            <span className="text-xs font-medium">Bitcoin</span>
                          </button>
                          <button
                            onClick={handleCryptoPayment}
                            disabled={isProcessingCrypto}
                            className="flex flex-col items-center p-3 bg-white rounded-lg border hover:border-blue-400 hover:shadow-md transition-all disabled:opacity-50"
                          >
                            <span className="text-2xl mb-1">Ξ</span>
                            <span className="text-xs font-medium">Ethereum</span>
                          </button>
                          <button
                            onClick={handleCryptoPayment}
                            disabled={isProcessingCrypto}
                            className="flex flex-col items-center p-3 bg-white rounded-lg border hover:border-gray-400 hover:shadow-md transition-all disabled:opacity-50"
                          >
                            <span className="text-2xl mb-1">Ł</span>
                            <span className="text-xs font-medium">Litecoin</span>
                          </button>
                        </div>
                        {isProcessingCrypto && (
                          <div className="flex items-center justify-center py-2">
                            <Loader2 className="h-5 w-5 animate-spin text-orange-500 mr-2" />
                            <span className="text-sm">Creating crypto payment...</span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground text-center">
                          You&apos;ll be redirected to complete payment
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground text-center">
                      Secure payments powered by Stripe, PayPal & Coinbase
                    </p>
                  </div>
                )}

                {/* Receipt Link */}
                {isPaid && booking.payment?.receiptUrl && (
                  <div className="pt-4 border-t text-center">
                    <a
                      href={booking.payment.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View Payment Receipt
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {isLoading && (
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/bookings">
              <Button size="lg" className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                View My Bookings
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/search">
              <Button size="lg" variant="outline">
                Book Another Worker
              </Button>
            </Link>
          </div>
        </div>
      </main>

      
    </div>
  );
}
