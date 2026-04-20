"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/ui/back-button";
import {
  Crown,
  Check,
  Zap,
  Building2,
  Loader2,
  ArrowRight,
  CreditCard,
  Calendar,
  Percent,
  Star,
  Shield,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TierInfo {
  tier: string;
  name: string;
  description: string;
  platformFeePercent: number;
  prioritySearchBoost: number;
  maxEmployees: number;
  features: string[];
  pricing: {
    monthly: number;
    yearly: number;
    monthlyEquivalentYearly: number;
  } | null;
}

interface Subscription {
  id: string;
  tier: string;
  status: string;
  billingInterval: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  platformFeePercent: number;
  prioritySearchBoost: number;
}

interface SubscriptionData {
  subscription: Subscription | null;
  currentTier: string;
  availableTiers: TierInfo[];
}

export default function SubscriptionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();

  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<"MONTHLY" | "YEARLY">("YEARLY");

  // Check for success/canceled query params
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Subscription activated successfully!");
      // Remove query params
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (searchParams.get("canceled") === "true") {
      toast.info("Subscription checkout canceled");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const res = await fetch("/api/subscriptions");
      if (!res.ok) throw new Error("Failed to fetch subscription");
      const result = await res.json();
      setData(result);
    } catch {
      toast.error("Failed to load subscription data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (tier: string) => {
    setActionLoading(tier);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, billingInterval }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create checkout");
      }

      const { checkoutUrl } = await res.json();
      window.location.href = checkoutUrl;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start checkout");
    } finally {
      setActionLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setActionLoading("portal");
    try {
      const res = await fetch("/api/subscriptions/portal", {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to create portal session");

      const { portalUrl } = await res.json();
      window.location.href = portalUrl;
    } catch {
      toast.error("Failed to open subscription portal");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? You'll keep access until the end of your billing period.")) {
      return;
    }

    setActionLoading("cancel");
    try {
      const res = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) throw new Error("Failed to cancel subscription");

      toast.success("Subscription will be canceled at the end of your billing period");
      fetchSubscription();
    } catch {
      toast.error("Failed to cancel subscription");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async () => {
    setActionLoading("reactivate");
    try {
      const res = await fetch("/api/subscriptions/reactivate", {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to reactivate subscription");

      toast.success("Subscription reactivated successfully");
      fetchSubscription();
    } catch {
      toast.error("Failed to reactivate subscription");
    } finally {
      setActionLoading(null);
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "WORKER_PRO":
        return <Zap className="h-6 w-6" />;
      case "BUSINESS":
        return <Building2 className="h-6 w-6" />;
      case "ENTERPRISE":
        return <Crown className="h-6 w-6" />;
      default:
        return <Star className="h-6 w-6" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "WORKER_PRO":
        return "from-blue-500 to-indigo-600";
      case "BUSINESS":
        return "from-purple-500 to-pink-600";
      case "ENTERPRISE":
        return "from-amber-500 to-orange-600";
      default:
        return "from-gray-400 to-gray-500";
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto max-w-5xl px-4 py-8">
            <Skeleton className="h-8 w-48 mb-8" />
            <div className="grid gap-6 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-96" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { subscription, currentTier, availableTiers } = data;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto max-w-5xl px-4 py-8">
          <BackButton href="/dashboard" />

          <div className="mb-8">
            <h1 className="text-3xl font-bold">Subscription</h1>
            <p className="mt-2 text-muted-foreground">
              Choose a plan that works for you. Upgrade to reduce fees and boost your visibility.
            </p>
          </div>

          {/* Current Subscription Status */}
          {subscription && subscription.tier !== "FREE" && (
            <Card className="mb-8 border-2 border-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("rounded-lg bg-gradient-to-br p-2 text-white", getTierColor(subscription.tier))}>
                      {getTierIcon(subscription.tier)}
                    </div>
                    <div>
                      <CardTitle>
                        {availableTiers.find((t) => t.tier === subscription.tier)?.name || subscription.tier}
                      </CardTitle>
                      <CardDescription>
                        {subscription.status === "ACTIVE" && !subscription.cancelAtPeriodEnd && (
                          <span className="text-green-600">Active</span>
                        )}
                        {subscription.cancelAtPeriodEnd && (
                          <span className="text-amber-600">Cancels at period end</span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={subscription.status === "ACTIVE" ? "default" : "secondary"}>
                    {subscription.billingInterval}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>{subscription.platformFeePercent}%</strong> platform fee
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>+{subscription.prioritySearchBoost}</strong> search boost
                    </span>
                  </div>
                  {subscription.currentPeriodEnd && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleManageSubscription}
                  disabled={actionLoading === "portal"}
                >
                  {actionLoading === "portal" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 h-4 w-4" />
                  )}
                  Manage Billing
                </Button>
                {subscription.cancelAtPeriodEnd ? (
                  <Button
                    variant="default"
                    onClick={handleReactivate}
                    disabled={actionLoading === "reactivate"}
                  >
                    {actionLoading === "reactivate" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Reactivate Subscription
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                    onClick={handleCancel}
                    disabled={actionLoading === "cancel"}
                  >
                    {actionLoading === "cancel" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Cancel Subscription
                  </Button>
                )}
              </CardFooter>
            </Card>
          )}

          {/* Billing Toggle */}
          <div className="mb-6 flex justify-center">
            <div className="inline-flex rounded-lg bg-muted p-1">
              <button
                onClick={() => setBillingInterval("MONTHLY")}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  billingInterval === "MONTHLY"
                    ? "bg-background text-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval("YEARLY")}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  billingInterval === "YEARLY"
                    ? "bg-background text-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Yearly <span className="ml-1 text-green-600">Save 17%</span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            {availableTiers.map((tier) => {
              const isCurrentTier = currentTier === tier.tier;
              const isPopular = tier.tier === "WORKER_PRO";
              const price = tier.pricing
                ? billingInterval === "YEARLY"
                  ? tier.pricing.monthlyEquivalentYearly
                  : tier.pricing.monthly
                : 0;

              return (
                <Card
                  key={tier.tier}
                  className={cn(
                    "relative flex flex-col",
                    isPopular && "border-2 border-primary shadow-lg",
                    isCurrentTier && "ring-2 ring-green-500"
                  )}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary">Most Popular</Badge>
                    </div>
                  )}
                  {isCurrentTier && (
                    <div className="absolute -top-3 right-4">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Current Plan
                      </Badge>
                    </div>
                  )}

                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={cn("rounded-lg bg-gradient-to-br p-2 text-white", getTierColor(tier.tier))}>
                        {getTierIcon(tier.tier)}
                      </div>
                      <div>
                        <CardTitle>{tier.name}</CardTitle>
                        <CardDescription>{tier.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1">
                    {/* Pricing */}
                    <div className="mb-6">
                      {tier.pricing ? (
                        <div className="flex items-baseline">
                          <span className="text-4xl font-bold">{price.toFixed(2)}</span>
                          <span className="ml-1 text-muted-foreground">/month</span>
                        </div>
                      ) : (
                        <div className="text-2xl font-bold">Free</div>
                      )}
                      {tier.pricing && billingInterval === "YEARLY" && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Billed annually ({tier.pricing.yearly.toFixed(2)}/year)
                        </p>
                      )}
                    </div>

                    {/* Key Benefits */}
                    <div className="mb-6 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Percent className="h-4 w-4 text-green-600" />
                        <span>{tier.platformFeePercent}% platform fee</span>
                        {tier.tier !== "FREE" && (
                          <Badge variant="secondary" className="text-xs">
                            Save {15 - tier.platformFeePercent}%
                          </Badge>
                        )}
                      </div>
                      {tier.prioritySearchBoost > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Zap className="h-4 w-4 text-blue-600" />
                          <span>+{tier.prioritySearchBoost} search ranking boost</span>
                        </div>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-2">
                      {tier.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter>
                    {tier.tier === "FREE" ? (
                      <Button variant="outline" className="w-full" disabled>
                        {isCurrentTier ? "Current Plan" : "Free Plan"}
                      </Button>
                    ) : isCurrentTier ? (
                      <Button variant="outline" className="w-full" disabled>
                        <Check className="mr-2 h-4 w-4" />
                        Current Plan
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        variant={isPopular ? "default" : "outline"}
                        onClick={() => handleSubscribe(tier.tier)}
                        disabled={actionLoading === tier.tier}
                      >
                        {actionLoading === tier.tier ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowRight className="mr-2 h-4 w-4" />
                        )}
                        {subscription?.tier === "FREE" ? "Upgrade" : "Switch"} to {tier.name}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          {/* Enterprise CTA */}
          <Card className="mt-8 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200">
            <CardContent className="flex flex-col items-center justify-between gap-4 py-6 sm:flex-row">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-3 text-white">
                  <Crown className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Enterprise Plan</h3>
                  <p className="text-sm text-muted-foreground">
                    Custom solutions for large organizations. Get dedicated support, custom integrations, and special pricing.
                  </p>
                </div>
              </div>
              <Button variant="outline" className="shrink-0">
                Contact Sales
              </Button>
            </CardContent>
          </Card>

          {/* FAQ */}
          <div className="mt-12">
            <h2 className="mb-6 text-xl font-semibold">Frequently Asked Questions</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">What happens when I upgrade?</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Your new plan starts immediately. You'll be charged a prorated amount for the remainder of your current billing period.
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Can I cancel anytime?</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Yes! You can cancel your subscription at any time. You'll keep your benefits until the end of your current billing period.
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">How does the fee reduction work?</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  With a Pro subscription, your platform fee drops from 15% to 10%. This means you keep more of each booking payment.
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">What is search boost?</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Search boost increases your visibility in search results. Pro workers appear higher in listings, leading to more booking requests.
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
