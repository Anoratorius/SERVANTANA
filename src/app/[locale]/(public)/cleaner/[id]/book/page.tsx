"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  Star,
  CreditCard,
  RotateCcw,
} from "lucide-react";
import { Link } from "@/i18n/navigation";

interface Service {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  duration: number;
}

interface CleanerService {
  id: string;
  customPrice: number | null;
  service: Service;
}

interface CleanerProfile {
  id: string;
  hourlyRate: number;
  currency: string;
  verified: boolean;
  averageRating: number;
  services: CleanerService[];
}

interface Cleaner {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  cleanerProfile: CleanerProfile | null;
}

export default function BookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const rebookId = searchParams.get("rebook");

  const [cleaner, setCleaner] = useState<Cleaner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRebooking, setIsRebooking] = useState(false);

  // Form state
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [notes, setNotes] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/cleaner/${id}/book`);
    }
  }, [status, router, id]);

  useEffect(() => {
    async function fetchCleaner() {
      try {
        const response = await fetch(`/api/cleaners/${id}`);
        if (!response.ok) {
          setError("Cleaner not found");
          return;
        }
        const data = await response.json();
        setCleaner(data.cleaner);
      } catch {
        setError("Failed to load cleaner");
      } finally {
        setIsLoading(false);
      }
    }
    fetchCleaner();
  }, [id]);

  // Pre-fill form with previous booking details when rebooking
  useEffect(() => {
    async function fetchPreviousBooking() {
      if (!rebookId) return;
      setIsRebooking(true);
      try {
        const response = await fetch(`/api/bookings/${rebookId}`);
        if (response.ok) {
          const data = await response.json();
          const booking = data.booking;
          if (booking) {
            setSelectedService(booking.service?.id || "");
            setAddress(booking.address || "");
            setCity(booking.city || "");
            setPostalCode(booking.postalCode || "");
            setNotes(booking.notes || "");
          }
        }
      } catch {
        console.error("Failed to fetch previous booking for rebooking");
      }
    }
    fetchPreviousBooking();
  }, [rebookId]);

  const selectedServiceData = cleaner?.cleanerProfile?.services.find(
    (s) => s.service.id === selectedService
  );

  const servicePrice = selectedServiceData
    ? selectedServiceData.customPrice ?? selectedServiceData.service.basePrice
    : 0;

  const serviceDuration = selectedServiceData?.service.duration ?? 0;

  // Generate available time slots
  const timeSlots = [
    "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00"
  ];

  // Get minimum date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedDate || !selectedTime || !address) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cleanerId: id,
          serviceId: selectedService,
          scheduledDate: selectedDate,
          scheduledTime: selectedTime,
          duration: serviceDuration,
          address,
          city,
          postalCode,
          notes,
          totalPrice: servicePrice,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create booking");
      }

      const data = await response.json();
      router.push(`/bookings/${data.booking.id}/confirmation`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading" || isLoading) {
    return <BookingPageSkeleton />;
  }

  if (error || !cleaner || !cleaner.cleanerProfile) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">{error || "Cleaner not found"}</h1>
            <Link href="/search">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("common.back")}
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const profile = cleaner.cleanerProfile;
  const initials = `${cleaner.firstName[0]}${cleaner.lastName[0]}`;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4">
          {/* Back button */}
          <Link
            href={`/cleaner/${id}`}
            className="inline-flex items-center text-muted-foreground hover:text-blue-600 mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("common.back")}
          </Link>

          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            {t("booking.title")}
          </h1>

          {isRebooking && (
            <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <RotateCcw className="h-5 w-5 text-green-600" />
              <span className="text-green-800 font-medium">{t("booking.rebookingInfo")}</span>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Booking Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Service Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">1</span>
                      {t("booking.selectService")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {profile.services.map((s) => {
                        const price = s.customPrice ?? s.service.basePrice;
                        const isSelected = selectedService === s.service.id;
                        return (
                          <div
                            key={s.service.id}
                            onClick={() => setSelectedService(s.service.id)}
                            className={`p-4 border rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                                : "hover:border-blue-300 hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold">
                                  {t(`cleaner.services.${s.service.name}` as Parameters<typeof t>[0])}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  ~{s.service.duration} min
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-lg text-green-600">${price}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Date & Time Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">2</span>
                      {t("booking.selectDate")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="date" className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-blue-500" />
                          Date
                        </Label>
                        <Input
                          id="date"
                          type="date"
                          min={minDate}
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          required
                          className="border-gray-300 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="time" className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          Time
                        </Label>
                        <Select value={selectedTime} onValueChange={setSelectedTime}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent>
                            {timeSlots.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Address */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">3</span>
                      {t("booking.address")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="address" className="flex items-center gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-blue-500" />
                          Street Address
                        </Label>
                        <Input
                          id="address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="123 Main Street, Apt 4B"
                          required
                        />
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="New York"
                          />
                        </div>
                        <div>
                          <Label htmlFor="postalCode">Postal Code</Label>
                          <Input
                            id="postalCode"
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value)}
                            placeholder="10001"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">4</span>
                      {t("booking.notes")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t("booking.notesPlaceholder")}
                      rows={4}
                    />
                  </CardContent>
                </Card>

                {/* Submit Button (mobile) */}
                <div className="lg:hidden">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                    disabled={!selectedService || !selectedDate || !selectedTime || !address || isSubmitting}
                  >
                    {isSubmitting ? t("common.loading") : t("booking.confirmBooking")}
                  </Button>
                </div>
              </form>
            </div>

            {/* Booking Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <Card className="border-t-4 border-t-green-500">
                  <CardHeader>
                    <CardTitle>{t("booking.summary")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Cleaner Info */}
                    <div className="flex items-center gap-3 pb-4 border-b">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={cleaner.avatar || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-green-500 text-white">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold">
                          {cleaner.firstName} {cleaner.lastName}
                        </h4>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {profile.averageRating.toFixed(1)}
                          {profile.verified && (
                            <CheckCircle className="h-3 w-3 text-green-500 ml-1" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Booking Details */}
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("booking.service")}</span>
                        <span className="font-medium">
                          {selectedServiceData
                            ? t(`cleaner.services.${selectedServiceData.service.name}` as Parameters<typeof t>[0])
                            : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("booking.dateTime")}</span>
                        <span className="font-medium">
                          {selectedDate && selectedTime
                            ? `${new Date(selectedDate).toLocaleDateString()} ${selectedTime}`
                            : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("booking.duration")}</span>
                        <span className="font-medium">
                          {serviceDuration > 0 ? `${serviceDuration} min` : "-"}
                        </span>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">{t("booking.total")}</span>
                        <span className="text-2xl font-bold text-green-600">
                          ${servicePrice}
                        </span>
                      </div>
                    </div>

                    {/* Submit Button (desktop) */}
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hidden lg:flex"
                      disabled={!selectedService || !selectedDate || !selectedTime || !address || isSubmitting}
                      onClick={handleSubmit}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      {isSubmitting ? t("common.loading") : t("booking.confirmBooking")}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function BookingPageSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4">
          <Skeleton className="h-6 w-20 mb-6" />
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
            <div>
              <Skeleton className="h-80 w-full" />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
