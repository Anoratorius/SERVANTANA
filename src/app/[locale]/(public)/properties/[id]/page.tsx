"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  MapPin,
  Home,
  Calendar,
  Pencil,
  Star,
  Bath,
  Ruler,
  FileText,
} from "lucide-react";
import { Link } from "@/i18n/navigation";

import { SmartLockManager } from "@/components/properties/SmartLockManager";

interface Property {
  id: string;
  name: string;
  address: string;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  rooms: number | null;
  bathrooms: number | null;
  size: number | null;
  notes: string | null;
  isDefault: boolean;
  bookings: {
    id: string;
    scheduledDate: string;
    scheduledTime: string;
    status: string;
    totalPrice: number;
    service: { name: string };
    worker: { firstName: string; lastName: string };
  }[];
  _count: { bookings: number };
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function PropertyDetailPage() {
  const t = useTranslations("properties");
  const tBooking = useTranslations("booking");
  const tCommon = useTranslations("common");
  const params = useParams();
  const { status: authStatus } = useSession();

  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const propertyId = params.id as string;

  useEffect(() => {
    async function fetchProperty() {
      try {
        const response = await fetch(`/api/properties/${propertyId}`);
        if (response.ok) {
          const data = await response.json();
          setProperty(data.property);
        }
      } catch (error) {
        console.error("Error fetching property:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (authStatus === "authenticated" && propertyId) {
      fetchProperty();
    }
  }, [authStatus, propertyId]);

  if (authStatus === "loading" || isLoading) {
    return <PropertyDetailSkeleton />;
  }

  if (!property) {
    return (
      <div className="min-h-screen flex flex-col">
        
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">{t("notFound")}</h1>

          </div>
        </main>
        
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      

      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Back button */}


          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-blue-500" />
                <h1 className="text-2xl font-bold">{property.name}</h1>
                {property.isDefault && (
                  <Badge className="bg-green-100 text-green-700">
                    <Star className="h-3 w-3 mr-1" />
                    {t("default")}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {property.address}
                {property.city && `, ${property.city}`}
                {property.state && `, ${property.state}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/properties/${property.id}/edit`}>
                <Button variant="outline">
                  <Pencil className="h-4 w-4 mr-2" />
                  {tCommon("edit")}
                </Button>
              </Link>
              <Link href={`/search?propertyId=${property.id}`}>
                <Button className="bg-gradient-to-r from-blue-500 to-green-500">
                  {t("book")}
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Property Details */}
            <Card>
              <CardHeader>
                <CardTitle>{t("details")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {property.rooms && (
                  <div className="flex items-center gap-3">
                    <Home className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">
                        {property.rooms} {t("rooms")}
                      </p>
                    </div>
                  </div>
                )}
                {property.bathrooms && (
                  <div className="flex items-center gap-3">
                    <Bath className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">
                        {property.bathrooms} {t("bathrooms")}
                      </p>
                    </div>
                  </div>
                )}
                {property.size && (
                  <div className="flex items-center gap-3">
                    <Ruler className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">{property.size} m²</p>
                    </div>
                  </div>
                )}
                {property.notes && (
                  <div className="flex items-start gap-3 pt-2 border-t">
                    <FileText className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t("notes")}</p>
                      <p className="mt-1">{property.notes}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>{t("statistics")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <Calendar className="h-12 w-12 mx-auto text-blue-500 mb-2" />
                  <p className="text-4xl font-bold text-blue-600">
                    {property._count.bookings}
                  </p>
                  <p className="text-muted-foreground">{t("totalBookings")}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Smart Locks */}
          <div className="mt-6">
            <SmartLockManager propertyId={property.id} />
          </div>

          {/* Recent Bookings */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>{t("recentBookings")}</CardTitle>
            </CardHeader>
            <CardContent>
              {property.bookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t("noBookingsYet")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {property.bookings.map((booking) => (
                    <Link
                      key={booking.id}
                      href={`/bookings/${booking.id}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                        <div>
                          <p className="font-medium">{booking.service.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(booking.scheduledDate).toLocaleDateString()}{" "}
                            at {booking.scheduledTime}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {booking.worker.firstName} {booking.worker.lastName}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={statusColors[booking.status]}>
                            {tBooking(
                              `status.${booking.status.toLowerCase()}` as Parameters<
                                typeof tBooking
                              >[0]
                            )}
                          </Badge>
                          <p className="text-sm font-medium mt-1">
                            ${booking.totalPrice}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      
    </div>
  );
}

function PropertyDetailSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      
      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-12 w-64 mb-6" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-64 mt-6" />
        </div>
      </main>
      
    </div>
  );
}
