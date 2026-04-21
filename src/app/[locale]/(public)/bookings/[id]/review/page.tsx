"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { BackButton } from "@/components/ui/back-button";
import { toast } from "sonner";

interface Booking {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
  address: string;
  totalPrice: number;
  status: string;
  worker: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
  service: {
    name: string;
  };
  review: {
    id: string;
    rating: number;
    comment: string | null;
  } | null;
}

export default function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations();
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push(`/login?callbackUrl=/bookings/${id}/review`);
    }
  }, [authStatus, router, id]);

  useEffect(() => {
    async function fetchBooking() {
      try {
        const response = await fetch(`/api/bookings/${id}`);
        if (response.ok) {
          const data = await response.json();
          setBooking(data.booking);

          // If review already exists, show it
          if (data.booking.review) {
            setRating(data.booking.review.rating);
            setComment(data.booking.review.comment || "");
            setIsSubmitted(true);
          }
        } else {
          setError("Booking not found");
        }
      } catch (err) {
        console.error("Error fetching booking:", err);
        setError("Failed to load booking");
      } finally {
        setIsLoading(false);
      }
    }

    if (authStatus === "authenticated") {
      fetchBooking();
    }
  }, [id, authStatus]);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: id,
          rating,
          comment: comment.trim() || undefined,
        }),
      });

      if (response.ok) {
        setIsSubmitted(true);
        toast.success(t("review.thankYou"));
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to submit review");
      }
    } catch (err) {
      console.error("Error submitting review:", err);
      toast.error("Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authStatus === "loading" || isLoading) {
    return <ReviewPageSkeleton />;
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-16">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">{error || "Booking not found"}</h1>
            <BackButton />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Check if user is the customer
  if (booking.worker.id === session?.user?.id) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-16">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">Cannot Review</h1>
            <p className="text-muted-foreground mb-6">
              Only customers can leave reviews for workers.
            </p>
            <BackButton />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Check if booking is completed
  if (booking.status !== "COMPLETED") {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-16">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">Cannot Review Yet</h1>
            <p className="text-muted-foreground mb-6">
              You can only review a booking after it has been completed.
            </p>
            <BackButton />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const workerInitials = `${booking.worker.firstName[0]}${booking.worker.lastName[0]}`;

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gradient-to-b from-green-50 to-white py-16">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-green-600 mb-2">
                {t("review.thankYou")}
              </h1>
              <p className="text-muted-foreground">
                Your feedback helps other customers find great workers.
              </p>
            </div>

            <Card className="text-left mb-8">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={booking.worker.avatar || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-green-500 text-white text-lg">
                      {workerInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {booking.worker.firstName} {booking.worker.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t(`cleaner.services.${booking.service.name}` as Parameters<typeof t>[0])}
                    </p>
                  </div>
                </div>

                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-6 w-6 ${
                        star <= rating
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>

                {comment && (
                  <p className="text-muted-foreground italic">&ldquo;{comment}&rdquo;</p>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/bookings">
                <Button size="lg" className="bg-gradient-to-r from-blue-500 to-blue-600">
                  View My Bookings
                </Button>
              </Link>
              <Link href={`/worker-profile/${booking.worker.id}`}>
                <Button size="lg" variant="outline">
                  View Worker Profile
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <BackButton />

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{t("review.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Worker Info */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={booking.worker.avatar || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-green-500 text-white text-xl">
                    {workerInitials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">
                    {booking.worker.firstName} {booking.worker.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t(`cleaner.services.${booking.service.name}` as Parameters<typeof t>[0])} •{" "}
                    {new Date(booking.scheduledDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Star Rating */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  {t("review.rating")} *
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-10 w-10 transition-colors ${
                          star <= (hoveredRating || rating)
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300 hover:text-yellow-200"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {rating === 1 && "Poor"}
                    {rating === 2 && "Fair"}
                    {rating === 3 && "Good"}
                    {rating === 4 && "Very Good"}
                    {rating === 5 && "Excellent"}
                  </p>
                )}
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("review.comment")}
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t("review.commentPlaceholder")}
                  rows={4}
                  maxLength={1000}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {comment.length}/1000
                </p>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || rating === 0}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Star className="h-4 w-4 mr-2" />
                    {t("review.submit")}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function ReviewPageSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Skeleton className="h-6 w-24 mb-6" />
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-48" />
            </CardHeader>
            <CardContent className="space-y-6">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-64" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
