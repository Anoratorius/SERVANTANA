"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, Loader2, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { BackButton } from "@/components/ui/back-button";
import { toast } from "sonner";

export default function NewPropertyPage() {
  const t = useTranslations("properties");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { status: authStatus } = useSession();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    latitude: null as number | null,
    longitude: null as number | null,
    rooms: "",
    bathrooms: "",
    size: "",
    notes: "",
    isDefault: false,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error(t("gpsNotSupported"));
      return;
    }

    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        toast.success(t("locationDetected"));
        setIsDetectingLocation(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error(t("locationError"));
        setIsDetectingLocation(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.address) {
      toast.error(t("requiredFields"));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          rooms: formData.rooms ? parseInt(formData.rooms) : null,
          bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
          size: formData.size ? parseInt(formData.size) : null,
        }),
      });

      if (response.ok) {
        toast.success(t("created"));
        router.push("/properties");
      } else {
        const error = await response.json();
        toast.error(error.error || t("createFailed"));
      }
    } catch (error) {
      console.error("Error creating property:", error);
      toast.error(t("createFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authStatus === "loading") {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      

      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Back button */}
          <BackButton />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500" />
                {t("addProperty")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Property Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">{t("propertyName")} *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={t("propertyNamePlaceholder")}
                    required
                  />
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address">{t("address")} *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder={t("addressPlaceholder")}
                      required
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={detectLocation}
                      disabled={isDetectingLocation}
                    >
                      {isDetectingLocation ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {formData.latitude && formData.longitude && (
                    <p className="text-xs text-green-600">
                      {t("coordinatesSaved")}
                    </p>
                  )}
                </div>

                {/* City, State, PostalCode */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">{t("city")}</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">{t("state")}</Label>
                    <Input
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <Label htmlFor="postalCode">{t("postalCode")}</Label>
                    <Input
                      id="postalCode"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Country */}
                <div className="space-y-2">
                  <Label htmlFor="country">{t("country")}</Label>
                  <Input
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                  />
                </div>

                {/* Rooms, Bathrooms, Size */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rooms">{t("rooms")}</Label>
                    <Input
                      id="rooms"
                      name="rooms"
                      type="number"
                      min="1"
                      value={formData.rooms}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bathrooms">{t("bathrooms")}</Label>
                    <Input
                      id="bathrooms"
                      name="bathrooms"
                      type="number"
                      min="1"
                      value={formData.bathrooms}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="size">{t("size")} (m²)</Label>
                    <Input
                      id="size"
                      name="size"
                      type="number"
                      min="1"
                      value={formData.size}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">{t("notes")}</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder={t("notesPlaceholder")}
                    rows={3}
                  />
                </div>

                {/* Default checkbox */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isDefault"
                    checked={formData.isDefault}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isDefault: !!checked }))
                    }
                  />
                  <Label htmlFor="isDefault" className="cursor-pointer">
                    {t("setAsDefaultLabel")}
                  </Label>
                </div>

                {/* Submit */}
                <div className="flex gap-4">
                  <Link href="/properties" className="flex-1">
                    <Button type="button" variant="outline" className="w-full">
                      {tCommon("cancel")}
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-green-500"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    {t("createProperty")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      
    </div>
  );
}
