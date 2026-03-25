"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, Link } from "@/i18n/navigation";
import { Header, Footer } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FileText, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Booking {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
  totalPrice: number;
  status: string;
  service: { name: string };
  customer: { firstName: string; lastName: string };
  cleaner: { firstName: string; lastName: string };
}

const DISPUTE_TYPES = [
  { value: "SERVICE_QUALITY", label: "Service Quality Issue", description: "The service did not meet expectations" },
  { value: "PAYMENT_ISSUE", label: "Payment Issue", description: "Problem with payment or charges" },
  { value: "NO_SHOW", label: "No Show", description: "The worker did not arrive" },
  { value: "PROPERTY_DAMAGE", label: "Property Damage", description: "Damage caused during service" },
  { value: "UNPROFESSIONAL_BEHAVIOR", label: "Unprofessional Behavior", description: "Inappropriate conduct" },
  { value: "OTHER", label: "Other", description: "Other issues not listed above" },
];

export default function NewDisputePage() {
  const router = useRouter();
  const { status: authStatus } = useSession();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [type, setType] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus === "authenticated") {
      fetchBookings();
    }
  }, [authStatus]);

  const fetchBookings = async () => {
    try {
      const res = await fetch("/api/bookings?status=COMPLETED,CANCELLED");
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBookingId || !type || !subject || !description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedBookingId,
          type,
          subject,
          description,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Dispute created successfully");
        router.push(`/support/disputes/${data.dispute.id}`);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create dispute");
      }
    } catch {
      toast.error("Failed to create dispute");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedBooking = bookings.find((b) => b.id === selectedBookingId);

  if (authStatus === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
          <div className="container mx-auto px-4 max-w-2xl">
            <Skeleton className="h-8 w-48 mb-6" />
            <Skeleton className="h-64" />
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
          <div className="flex items-center gap-4 mb-6">
            <Link href="/support/disputes">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Open a Dispute
            </h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Dispute Details</CardTitle>
              <CardDescription>
                Describe your issue and we&apos;ll work to resolve it
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Booking Selection */}
                <div className="space-y-2">
                  <Label htmlFor="booking">Select Booking *</Label>
                  {bookings.length === 0 ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-800">
                        <AlertTriangle className="h-5 w-5" />
                        <p>No completed or cancelled bookings found to dispute.</p>
                      </div>
                    </div>
                  ) : (
                    <Select value={selectedBookingId} onValueChange={setSelectedBookingId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a booking" />
                      </SelectTrigger>
                      <SelectContent>
                        {bookings.map((booking) => (
                          <SelectItem key={booking.id} value={booking.id}>
                            {booking.service.name} -{" "}
                            {new Date(booking.scheduledDate).toLocaleDateString()} -
                            ${booking.totalPrice}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {selectedBooking && (
                    <div className="p-3 bg-muted rounded-lg text-sm">
                      <p>
                        <strong>Service:</strong> {selectedBooking.service.name}
                      </p>
                      <p>
                        <strong>Date:</strong>{" "}
                        {new Date(selectedBooking.scheduledDate).toLocaleDateString()} at{" "}
                        {selectedBooking.scheduledTime}
                      </p>
                      <p>
                        <strong>Amount:</strong> ${selectedBooking.totalPrice}
                      </p>
                      <p>
                        <strong>Status:</strong> {selectedBooking.status}
                      </p>
                    </div>
                  )}
                </div>

                {/* Dispute Type */}
                <div className="space-y-2">
                  <Label htmlFor="type">Issue Type *</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select issue type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DISPUTE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          <div>
                            <p className="font-medium">{t.label}</p>
                            <p className="text-xs text-muted-foreground">{t.description}</p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    placeholder="Brief summary of the issue"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    maxLength={100}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Provide details about what happened, when it happened, and what resolution you're seeking..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Be as specific as possible. You can upload evidence after creating the dispute.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || bookings.length === 0}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Dispute
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
