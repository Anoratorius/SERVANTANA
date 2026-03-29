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
  Camera,
  Upload,
  Trash2,
  Wallet,
  Copy,
  CreditCard,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

interface WorkerProfession {
  id: string;
  professionId: string;
  isPrimary: boolean;
  hourlyRate: number | null;
  profession: {
    id: string;
    name: string;
    nameDE: string | null;
    emoji: string;
    category: {
      id: string;
      name: string;
      nameDE: string | null;
      emoji: string;
    } | null;
  };
}

interface Profession {
  id: string;
  name: string;
  nameDE: string | null;
  emoji: string;
  category: {
    id: string;
    name: string;
    nameDE: string | null;
    emoji: string;
  } | null;
}

interface Availability {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface CryptoWallet {
  id: string;
  currency: string;
  address: string;
  balance: number;
}

interface StripeConnectStatus {
  status: "not_connected" | "pending" | "complete";
  stripeAccountId: string | null;
  onboardingComplete: boolean;
  dashboardUrl: string | null;
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


export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: authStatus } = useSession();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [workerProfessions, setWorkerProfessions] = useState<WorkerProfession[]>([]);
  const [allProfessions, setAllProfessions] = useState<Profession[]>([]);
  const [showAddProfession, setShowAddProfession] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    bio: "",
    hourlyRate: 25,
    experienceYears: 0,
    availableNow: false,
    ecoFriendly: false,
    petFriendly: false,
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    serviceRadius: 10,
    timezone: typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC",
    paypalEmail: "",
  });

  const [availability, setAvailability] = useState<
    Map<number, { enabled: boolean; startTime: string; endTime: string }>
  >(new Map());

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);

  // Crypto wallet state
  const [cryptoWallets, setCryptoWallets] = useState<CryptoWallet[]>([]);
  const [isCreatingWallets, setIsCreatingWallets] = useState(false);

  // Stripe Connect state
  const [stripeStatus, setStripeStatus] = useState<StripeConnectStatus | null>(null);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);

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

  // Handle Stripe Connect return URL params
  useEffect(() => {
    const stripeParam = searchParams.get("stripe");
    if (stripeParam === "success") {
      // Check and update Stripe status
      fetch("/api/stripe/connect", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check" }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.onboardingComplete) {
            toast.success("Stripe account connected successfully!");
            setStripeStatus((prev) => prev ? { ...prev, ...data, status: "complete" } : null);
          } else {
            toast.info("Stripe onboarding in progress. Complete all steps to receive payments.");
            setStripeStatus((prev) => prev ? { ...prev, status: "pending" } : null);
          }
        })
        .catch(() => {
          toast.error("Failed to verify Stripe connection");
        });
      // Clear the URL param
      window.history.replaceState({}, "", "/dashboard/settings");
    } else if (stripeParam === "refresh") {
      toast.info("Stripe onboarding link expired. Click to continue setup.");
      window.history.replaceState({}, "", "/dashboard/settings");
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [profileRes, professionsRes, allProfessionsRes, avatarRes, walletsRes, stripeRes] = await Promise.all([
          fetch("/api/cleaner/profile"),
          fetch("/api/cleaner/professions"),
          fetch("/api/professions"),
          fetch("/api/user/avatar"),
          fetch("/api/cleaner/wallets"),
          fetch("/api/stripe/connect"),
        ]);

        // Load avatar
        if (avatarRes.ok) {
          const avatarData = await avatarRes.json();
          setAvatarUrl(avatarData.avatarUrl);
        }

        // Load crypto wallets
        if (walletsRes.ok) {
          const walletsData = await walletsRes.json();
          setCryptoWallets(walletsData.wallets || []);
        }

        // Load Stripe Connect status
        if (stripeRes.ok) {
          const stripeData = await stripeRes.json();
          setStripeStatus(stripeData);
        }

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
              ecoFriendly: profileData.profile.ecoFriendly || false,
              petFriendly: profileData.profile.petFriendly || false,
              address: profileData.profile.address || "",
              city: profileData.profile.city || "",
              state: profileData.profile.state || "",
              country: profileData.profile.country || "",
              postalCode: profileData.profile.postalCode || "",
              serviceRadius: profileData.profile.serviceRadius || 10,
              timezone: profileData.profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
              paypalEmail: profileData.profile.paypalEmail || "",
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

        // Load worker's professions
        if (professionsRes.ok) {
          const professionsData = await professionsRes.json();
          setWorkerProfessions(professionsData || []);
        }

        // Load all available professions
        if (allProfessionsRes.ok) {
          const allProfessionsData = await allProfessionsRes.json();
          setAllProfessions(allProfessionsData || []);
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

  const handleUpdateProfessionRate = async (professionId: string, hourlyRate: number) => {
    try {
      const response = await fetch("/api/cleaner/professions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professionId, hourlyRate }),
      });

      if (response.ok) {
        const updated = await response.json();
        setWorkerProfessions((prev) =>
          prev.map((p) => (p.professionId === professionId ? updated : p))
        );
        toast.success("Rate updated!");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update rate");
      }
    } catch {
      toast.error("Failed to update rate");
    }
  };

  const handleSetPrimaryProfession = async (professionId: string) => {
    try {
      const response = await fetch("/api/cleaner/professions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professionId, isPrimary: true }),
      });

      if (response.ok) {
        // Update all professions - set the selected one as primary, others as not
        setWorkerProfessions((prev) =>
          prev.map((p) => ({
            ...p,
            isPrimary: p.professionId === professionId,
          }))
        );
        toast.success("Primary profession updated!");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update");
      }
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleAddProfession = async (professionId: string) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/cleaner/professions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professionId, hourlyRate: formData.hourlyRate }),
      });

      if (response.ok) {
        const newProfession = await response.json();
        setWorkerProfessions((prev) => [...prev, newProfession]);
        setShowAddProfession(false);
        toast.success("Profession added!");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to add profession");
      }
    } catch {
      toast.error("Failed to add profession");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveProfession = async (professionId: string) => {
    if (workerProfessions.length <= 1) {
      toast.error("You must have at least one profession");
      return;
    }

    try {
      const response = await fetch("/api/cleaner/professions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professionId }),
      });

      if (response.ok) {
        setWorkerProfessions((prev) => prev.filter((p) => p.professionId !== professionId));
        toast.success("Profession removed!");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to remove profession");
      }
    } catch {
      toast.error("Failed to remove profession");
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

      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-4 sm:py-8">
        <div className="container mx-auto px-3 sm:px-4 max-w-4xl">
          <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Profile Settings
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Manage your profile and availability
              </p>
            </div>
          </div>

          <Tabs defaultValue="profile" className="space-y-4 sm:space-y-6">
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="profile" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-1.5">
                <User className="h-4 w-4 hidden sm:block" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="professions" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-1.5">
                <Briefcase className="h-4 w-4 hidden sm:block" />
                Professions
              </TabsTrigger>
              <TabsTrigger value="availability" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-1.5">
                <Clock className="h-4 w-4 hidden sm:block" />
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
                        placeholder="Tell customers about yourself, your experience, and what makes you great at your job..."
                        rows={4}
                        maxLength={1000}
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {formData.bio.length}/1000
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Profile Picture */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      Profile Picture
                    </CardTitle>
                    <CardDescription>
                      Upload a photo that will be shown to customers (max 5MB)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="relative">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt="Profile"
                            className="w-32 h-32 rounded-full object-cover border-4 border-background shadow-lg"
                          />
                        ) : (
                          <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-4 border-background shadow-lg">
                            <User className="h-16 w-16 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-3 text-center sm:text-left">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          id="avatar-upload"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            if (file.size > 5 * 1024 * 1024) {
                              toast.error("Image must be less than 5MB");
                              return;
                            }

                            setIsUploadingAvatar(true);
                            try {
                              const formData = new FormData();
                              formData.append("avatar", file);

                              const res = await fetch("/api/user/avatar", {
                                method: "POST",
                                body: formData,
                              });

                              if (res.ok) {
                                const data = await res.json();
                                setAvatarUrl(data.avatarUrl);
                                toast.success("Profile picture uploaded");
                              } else {
                                const error = await res.json();
                                toast.error(error.error || "Failed to upload picture");
                              }
                            } catch {
                              toast.error("Failed to upload picture");
                            } finally {
                              setIsUploadingAvatar(false);
                              e.target.value = "";
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          onClick={() => document.getElementById("avatar-upload")?.click()}
                          disabled={isUploadingAvatar}
                        >
                          {isUploadingAvatar ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          {isUploadingAvatar ? "Uploading..." : avatarUrl ? "Change Photo" : "Upload Photo"}
                        </Button>
                        {avatarUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={async () => {
                              setIsDeletingAvatar(true);
                              try {
                                const res = await fetch("/api/user/avatar", { method: "DELETE" });
                                if (res.ok) {
                                  setAvatarUrl(null);
                                  toast.success("Profile picture removed");
                                } else {
                                  toast.error("Failed to remove picture");
                                }
                              } catch {
                                toast.error("Failed to remove picture");
                              } finally {
                                setIsDeletingAvatar(false);
                              }
                            }}
                            disabled={isDeletingAvatar}
                          >
                            {isDeletingAvatar ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            Remove Photo
                          </Button>
                        )}
                        <p className="text-xs text-muted-foreground">
                          JPEG, PNG, or WebP up to 5MB
                        </p>
                      </div>
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
                    <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
                      <div>
                        <Label htmlFor="ecoFriendly" className="text-base font-medium">
                          Eco-Friendly Cleaning
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          I use environmentally friendly, non-toxic cleaning products
                        </p>
                      </div>
                      <Switch
                        id="ecoFriendly"
                        checked={formData.ecoFriendly}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({ ...prev, ecoFriendly: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                      <div>
                        <Label htmlFor="petFriendly" className="text-base font-medium">
                          Pet-Friendly
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          I&apos;m comfortable working in homes with pets
                        </p>
                      </div>
                      <Switch
                        id="petFriendly"
                        checked={formData.petFriendly}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({ ...prev, petFriendly: checked }))
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Stripe Connect - Primary Payment Method */}
                <Card className="border-2 border-purple-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-purple-500" />
                      Stripe Connect
                      {stripeStatus?.status === "complete" && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                          Connected
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Accept credit card payments from customers. Required to receive bookings.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {stripeStatus?.status === "complete" ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                          <CheckCircle className="h-6 w-6 text-green-600" />
                          <div>
                            <p className="font-medium text-green-800">
                              Your Stripe account is connected
                            </p>
                            <p className="text-sm text-green-600">
                              You can now receive credit card payments from customers
                            </p>
                          </div>
                        </div>
                        {stripeStatus.dashboardUrl && (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => window.open(stripeStatus.dashboardUrl!, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open Stripe Dashboard
                          </Button>
                        )}
                      </div>
                    ) : stripeStatus?.status === "pending" ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
                          <AlertCircle className="h-6 w-6 text-yellow-600" />
                          <div>
                            <p className="font-medium text-yellow-800">
                              Stripe setup incomplete
                            </p>
                            <p className="text-sm text-yellow-600">
                              Please complete your Stripe onboarding to receive payments
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={async () => {
                            setIsConnectingStripe(true);
                            try {
                              const res = await fetch("/api/stripe/connect", {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ action: "refresh" }),
                              });
                              if (res.ok) {
                                const data = await res.json();
                                window.location.href = data.url;
                              } else {
                                toast.error("Failed to get onboarding link");
                              }
                            } catch {
                              toast.error("Failed to connect with Stripe");
                            } finally {
                              setIsConnectingStripe(false);
                            }
                          }}
                          disabled={isConnectingStripe}
                          className="w-full bg-gradient-to-r from-purple-500 to-purple-600"
                        >
                          {isConnectingStripe ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-4 w-4 mr-2" />
                              Continue Stripe Setup
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">
                          Connect your Stripe account to accept credit card payments from customers.
                        </p>
                        <Button
                          onClick={async () => {
                            setIsConnectingStripe(true);
                            try {
                              const res = await fetch("/api/stripe/connect", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ country: formData.country || "DE" }),
                              });
                              if (res.ok) {
                                const data = await res.json();
                                window.location.href = data.url;
                              } else {
                                const error = await res.json();
                                toast.error(error.error || "Failed to start Stripe setup");
                              }
                            } catch {
                              toast.error("Failed to connect with Stripe");
                            } finally {
                              setIsConnectingStripe(false);
                            }
                          }}
                          disabled={isConnectingStripe}
                          className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                        >
                          {isConnectingStripe ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-4 w-4 mr-2" />
                              Connect with Stripe
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-4">
                          Stripe handles all payment processing securely. A small service fee applies to each transaction.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* PayPal (Alternative) */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-blue-500" />
                      PayPal (Optional)
                    </CardTitle>
                    <CardDescription>
                      Alternative payment method for customers who prefer PayPal
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="paypalEmail">PayPal Email</Label>
                      <Input
                        id="paypalEmail"
                        type="email"
                        value={formData.paypalEmail}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, paypalEmail: e.target.value }))
                        }
                        placeholder="your-email@example.com"
                      />
                      <p className="text-xs text-muted-foreground">
                        This is the email linked to your PayPal account where you&apos;ll receive payments
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Crypto Wallets */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-orange-500" />
                      Crypto Wallets
                    </CardTitle>
                    <CardDescription>
                      Receive cryptocurrency payments from customers
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {cryptoWallets.length > 0 ? (
                      <div className="space-y-3">
                        {cryptoWallets.map((wallet) => (
                          <div
                            key={wallet.id}
                            className="p-4 rounded-lg border bg-gradient-to-r from-gray-50 to-gray-100"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-lg">
                                {wallet.currency === "BTC" && "₿ Bitcoin"}
                                {wallet.currency === "ETH" && "Ξ Ethereum"}
                                {wallet.currency === "LTC" && "Ł Litecoin"}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                Balance: {wallet.balance} {wallet.currency}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 text-xs bg-white p-2 rounded border font-mono truncate">
                                {wallet.address}
                              </code>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(wallet.address);
                                  toast.success(`${wallet.currency} address copied!`);
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <p className="text-xs text-muted-foreground text-center">
                          Share these addresses with customers to receive crypto payments
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">
                          No crypto wallets yet. Create your wallets to receive cryptocurrency payments.
                        </p>
                        <Button
                          onClick={async () => {
                            setIsCreatingWallets(true);
                            try {
                              const res = await fetch("/api/cleaner/wallets", {
                                method: "POST",
                              });
                              if (res.ok) {
                                const data = await res.json();
                                setCryptoWallets(data.wallets);
                                toast.success("Crypto wallets created successfully!");
                              } else {
                                const error = await res.json();
                                toast.error(error.error || "Failed to create wallets");
                              }
                            } catch {
                              toast.error("Failed to create wallets");
                            } finally {
                              setIsCreatingWallets(false);
                            }
                          }}
                          disabled={isCreatingWallets}
                          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                        >
                          {isCreatingWallets ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Creating Wallets...
                            </>
                          ) : (
                            <>
                              <Wallet className="h-4 w-4 mr-2" />
                              Create Crypto Wallets
                            </>
                          )}
                        </Button>
                      </div>
                    )}
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
                    <div className="space-y-2">
                      <Label>Timezone</Label>
                      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">{formData.timezone.replace(/_/g, " ")}</span>
                        <span className="text-xs text-muted-foreground">(auto-detected)</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Payouts are processed at 12:01 AM your local time on the 1st and 15th of each month
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

            {/* Professions Tab */}
            <TabsContent value="professions">
              <Card>
                <CardHeader>
                  <CardTitle>Your Professions</CardTitle>
                  <CardDescription>
                    Manage your professions and set hourly rates for each
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {workerProfessions.length === 0 ? (
                    <div className="text-center py-8">
                      <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">
                        No professions added yet. Add your first profession to get started.
                      </p>
                    </div>
                  ) : (
                    workerProfessions.map((wp) => (
                      <div
                        key={wp.id}
                        className={`p-3 sm:p-4 rounded-lg border transition-colors ${
                          wp.isPrimary
                            ? "border-yellow-500 bg-yellow-50"
                            : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <div className="text-2xl sm:text-3xl">{wp.profession.emoji}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm sm:text-base truncate">{wp.profession.name}</span>
                              {wp.isPrimary && (
                                <span className="px-2 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded-full whitespace-nowrap">
                                  Primary
                                </span>
                              )}
                            </div>
                            {wp.profession.category && (
                              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                {wp.profession.category.emoji} {wp.profession.category.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3 ml-9 sm:ml-11">
                          <div className="w-20 sm:w-24">
                            <Label className="text-xs">€/hour</Label>
                            <Input
                              type="number"
                              min="1"
                              max="500"
                              value={wp.hourlyRate || formData.hourlyRate}
                              onChange={(e) => {
                                const rate = parseFloat(e.target.value);
                                if (rate > 0) {
                                  handleUpdateProfessionRate(wp.professionId, rate);
                                }
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                          {!wp.isPrimary && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetPrimaryProfession(wp.professionId)}
                              title="Set as primary"
                              className="h-8 w-8 p-0"
                            >
                              ⭐
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveProfession(wp.professionId)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Add Profession Section */}
                  {showAddProfession ? (
                    <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50">
                      <h4 className="font-medium mb-3">Add a Profession</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                        {allProfessions
                          .filter((p) => !workerProfessions.some((wp) => wp.professionId === p.id))
                          .map((profession) => (
                            <button
                              key={profession.id}
                              onClick={() => handleAddProfession(profession.id)}
                              disabled={isSaving}
                              className="flex items-center gap-2 p-2 rounded-lg border bg-white hover:bg-gray-50 transition-colors text-left"
                            >
                              <span className="text-xl">{profession.emoji}</span>
                              <span className="text-sm truncate">{profession.name}</span>
                            </button>
                          ))}
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setShowAddProfession(false)}
                        className="mt-3"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setShowAddProfession(true)}
                      className="w-full border-dashed"
                    >
                      + Add Profession
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Availability Tab */}
            <TabsContent value="availability">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Weekly Availability</CardTitle>
                  <CardDescription className="text-sm">
                    Set your working hours for each day
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {DAYS.map((day) => {
                    const dayState = availability.get(day.value) || {
                      enabled: false,
                      startTime: "09:00",
                      endTime: "17:00",
                    };

                    return (
                      <div
                        key={day.value}
                        className={`p-3 rounded-lg border transition-colors ${
                          dayState.enabled
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={dayState.enabled}
                            onCheckedChange={(checked) => {
                              const newMap = new Map(availability);
                              newMap.set(day.value, { ...dayState, enabled: checked });
                              setAvailability(newMap);
                            }}
                          />
                          <span className="font-medium text-sm sm:text-base">{day.label}</span>
                        </div>

                        {dayState.enabled && (
                          <div className="flex items-center gap-2 mt-2 ml-12">
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
                              className="w-24 sm:w-28 text-sm"
                            />
                            <span className="text-muted-foreground text-sm">-</span>
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
                              className="w-24 sm:w-28 text-sm"
                            />
                            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                          </div>
                        )}
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
