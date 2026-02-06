"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  User,
  Briefcase,
  Clock,
  MapPin,
  DollarSign,
  Save,
  Loader2,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  duration: number;
}

interface CleanerService {
  id: string;
  serviceId: string;
  customPrice: number | null;
  isActive: boolean;
  service: Service;
}

interface Availability {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const SERVICE_NAMES: Record<string, string> = {
  regular: "Regular Cleaning",
  deep: "Deep Cleaning",
  moveInOut: "Move In/Out Cleaning",
  office: "Office Cleaning",
  window: "Window Cleaning",
  carpet: "Carpet Cleaning",
  laundry: "Laundry Service",
  organizing: "Organizing",
};

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [allServices, setAllServices] = useState<Service[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    bio: "",
    hourlyRate: 25,
    experienceYears: 0,
    availableNow: false,
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    serviceRadius: 10,
  });

  const [selectedServices, setSelectedServices] = useState<
    Map<string, { selected: boolean; customPrice: number | null }>
  >(new Map());

  const [availability, setAvailability] = useState<
    Map<number, { enabled: boolean; startTime: string; endTime: string }>
  >(new Map());

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/dashboard/settings");
      return;
    }

    if (authStatus === "authenticated" && session?.user?.role !== "CLEANER") {
      router.push("/dashboard");
      return;
    }
  }, [authStatus, session, router]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [profileRes, servicesRes] = await Promise.all([
          fetch("/api/cleaner/profile"),
          fetch("/api/cleaner/services"),
        ]);

        if (profileRes.ok) {
          const profileData = await profileRes.json();

          if (profileData.user) {
            setFormData((prev) => ({
              ...prev,
              firstName: profileData.user.firstName || "",
              lastName: profileData.user.lastName || "",
              phone: profileData.user.phone || "",
            }));
          }

          if (profileData.profile) {
            setFormData((prev) => ({
              ...prev,
              bio: profileData.profile.bio || "",
              hourlyRate: profileData.profile.hourlyRate || 25,
              experienceYears: profileData.profile.experienceYears || 0,
              availableNow: profileData.profile.availableNow || false,
              address: profileData.profile.address || "",
              city: profileData.profile.city || "",
              state: profileData.profile.state || "",
              country: profileData.profile.country || "",
              postalCode: profileData.profile.postalCode || "",
              serviceRadius: profileData.profile.serviceRadius || 10,
            }));

            // Set availability
            const availMap = new Map<number, { enabled: boolean; startTime: string; endTime: string }>();
            DAYS.forEach((day) => {
              const existing = profileData.profile.availability?.find(
                (a: Availability) => a.dayOfWeek === day.value
              );
              availMap.set(day.value, {
                enabled: !!existing,
                startTime: existing?.startTime || "09:00",
                endTime: existing?.endTime || "17:00",
              });
            });
            setAvailability(availMap);
          }
        }

        if (servicesRes.ok) {
          const servicesData = await servicesRes.json();
          setAllServices(servicesData.allServices || []);

          // Set selected services
          const servMap = new Map<string, { selected: boolean; customPrice: number | null }>();
          servicesData.allServices?.forEach((s: Service) => {
            const existing = servicesData.cleanerServices?.find(
              (cs: CleanerService) => cs.serviceId === s.id
            );
            servMap.set(s.id, {
              selected: !!existing,
              customPrice: existing?.customPrice ?? null,
            });
          });
          setSelectedServices(servMap);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load profile data");
      } finally {
        setIsLoading(false);
      }
    }

    if (authStatus === "authenticated" && session?.user?.role === "CLEANER") {
      fetchData();
    }
  }, [authStatus, session]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/cleaner/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Profile updated successfully!");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update profile");
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveServices = async () => {
    setIsSaving(true);
    try {
      const services = Array.from(selectedServices.entries())
        .filter(([, value]) => value.selected)
        .map(([serviceId, value]) => ({
          serviceId,
          customPrice: value.customPrice,
          isActive: true,
        }));

      const response = await fetch("/api/cleaner/services", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ services }),
      });

      if (response.ok) {
        toast.success("Services updated successfully!");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update services");
      }
    } catch {
      toast.error("Failed to update services");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAvailability = async () => {
    setIsSaving(true);
    try {
      const availabilityData = Array.from(availability.entries())
        .filter(([, value]) => value.enabled)
        .map(([dayOfWeek, value]) => ({
          dayOfWeek,
          startTime: value.startTime,
          endTime: value.endTime,
          isActive: true,
        }));

      const response = await fetch("/api/cleaner/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability: availabilityData }),
      });

      if (response.ok) {
        toast.success("Availability updated successfully!");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update availability");
      }
    } catch {
      toast.error("Failed to update availability");
    } finally {
      setIsSaving(false);
    }
  };

  if (authStatus === "loading" || isLoading) {
    return <SettingsPageSkeleton />;
  }

  if (session?.user?.role !== "CLEANER") {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Profile Settings
              </h1>
              <p className="text-muted-foreground">
                Manage your cleaner profile, services, and availability
              </p>
            </div>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile" className="gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="services" className="gap-2">
                <Briefcase className="h-4 w-4" />
                Services
              </TabsTrigger>
              <TabsTrigger value="availability" className="gap-2">
                <Clock className="h-4 w-4" />
                Availability
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <div className="space-y-6">
                {/* Personal Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-500" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, firstName: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, lastName: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        placeholder="+1234567890"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, bio: e.target.value }))
                        }
                        placeholder="Tell customers about yourself, your experience, and what makes you a great cleaner..."
                        rows={4}
                        maxLength={1000}
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {formData.bio.length}/1000
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Rates & Experience */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-500" />
                      Rates & Experience
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                        <Input
                          id="hourlyRate"
                          type="number"
                          min="1"
                          max="500"
                          value={formData.hourlyRate}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              hourlyRate: parseFloat(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="experience">Years of Experience</Label>
                        <Input
                          id="experience"
                          type="number"
                          min="0"
                          max="50"
                          value={formData.experienceYears}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              experienceYears: parseInt(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                      <div>
                        <Label htmlFor="availableNow" className="text-base font-medium">
                          Available Now
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Show customers you&apos;re available for immediate bookings
                        </p>
                      </div>
                      <Switch
                        id="availableNow"
                        checked={formData.availableNow}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({ ...prev, availableNow: checked }))
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Location */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-red-500" />
                      Service Area
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, address: e.target.value }))
                        }
                        placeholder="Street address"
                      />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, city: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          value={formData.state}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, state: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input
                          id="country"
                          value={formData.country}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, country: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">Postal Code</Label>
                        <Input
                          id="postalCode"
                          value={formData.postalCode}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, postalCode: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="serviceRadius">Service Radius (km)</Label>
                      <Input
                        id="serviceRadius"
                        type="number"
                        min="1"
                        max="100"
                        value={formData.serviceRadius}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            serviceRadius: parseInt(e.target.value) || 10,
                          }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        How far you&apos;re willing to travel for jobs
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600"
                  size="lg"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Profile
                </Button>
              </div>
            </TabsContent>

            {/* Services Tab */}
            <TabsContent value="services">
              <Card>
                <CardHeader>
                  <CardTitle>Services You Offer</CardTitle>
                  <CardDescription>
                    Select the services you provide and optionally set custom prices
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {allServices.map((service) => {
                    const serviceState = selectedServices.get(service.id) || {
                      selected: false,
                      customPrice: null,
                    };

                    return (
                      <div
                        key={service.id}
                        className={`p-4 rounded-lg border transition-colors ${
                          serviceState.selected
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <Checkbox
                            id={`service-${service.id}`}
                            checked={serviceState.selected}
                            onCheckedChange={(checked) => {
                              const newMap = new Map(selectedServices);
                              newMap.set(service.id, {
                                ...serviceState,
                                selected: !!checked,
                              });
                              setSelectedServices(newMap);
                            }}
                          />
                          <div className="flex-1">
                            <label
                              htmlFor={`service-${service.id}`}
                              className="font-medium cursor-pointer"
                            >
                              {SERVICE_NAMES[service.name] || service.name}
                            </label>
                            <p className="text-sm text-muted-foreground">
                              {service.description || `~${service.duration} minutes`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Base price: ${service.basePrice}
                            </p>
                          </div>
                          {serviceState.selected && (
                            <div className="w-32">
                              <Label className="text-xs">Custom Price ($)</Label>
                              <Input
                                type="number"
                                min="0"
                                placeholder={service.basePrice.toString()}
                                value={serviceState.customPrice || ""}
                                onChange={(e) => {
                                  const newMap = new Map(selectedServices);
                                  newMap.set(service.id, {
                                    ...serviceState,
                                    customPrice: e.target.value
                                      ? parseFloat(e.target.value)
                                      : null,
                                  });
                                  setSelectedServices(newMap);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <Button
                    onClick={handleSaveServices}
                    disabled={isSaving}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600"
                    size="lg"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Services
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Availability Tab */}
            <TabsContent value="availability">
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Availability</CardTitle>
                  <CardDescription>
                    Set your working hours for each day of the week
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {DAYS.map((day) => {
                    const dayState = availability.get(day.value) || {
                      enabled: false,
                      startTime: "09:00",
                      endTime: "17:00",
                    };

                    return (
                      <div
                        key={day.value}
                        className={`p-4 rounded-lg border transition-colors ${
                          dayState.enabled
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <Switch
                            checked={dayState.enabled}
                            onCheckedChange={(checked) => {
                              const newMap = new Map(availability);
                              newMap.set(day.value, { ...dayState, enabled: checked });
                              setAvailability(newMap);
                            }}
                          />
                          <span className="font-medium w-24">{day.label}</span>

                          {dayState.enabled ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                type="time"
                                value={dayState.startTime}
                                onChange={(e) => {
                                  const newMap = new Map(availability);
                                  newMap.set(day.value, {
                                    ...dayState,
                                    startTime: e.target.value,
                                  });
                                  setAvailability(newMap);
                                }}
                                className="w-32"
                              />
                              <span className="text-muted-foreground">to</span>
                              <Input
                                type="time"
                                value={dayState.endTime}
                                onChange={(e) => {
                                  const newMap = new Map(availability);
                                  newMap.set(day.value, {
                                    ...dayState,
                                    endTime: e.target.value,
                                  });
                                  setAvailability(newMap);
                                }}
                                className="w-32"
                              />
                              <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">Not available</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <Button
                    onClick={handleSaveAvailability}
                    disabled={isSaving}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600"
                    size="lg"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Availability
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function SettingsPageSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Skeleton className="h-10 w-64 mb-8" />
          <Skeleton className="h-12 w-full mb-6" />
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
