"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/ui/back-button";
import {
  Building2,
  Plus,
  MapPin,
  Home,
  Calendar,
  Star,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Property {
  id: string;
  name: string;
  address: string;
  city: string | null;
  state: string | null;
  rooms: number | null;
  bathrooms: number | null;
  isDefault: boolean;
  _count: {
    bookings: number;
  };
}

export default function PropertiesPage() {
  const t = useTranslations("properties");
  const tCommon = useTranslations("common");
  const { status: authStatus } = useSession();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function fetchProperties() {
      try {
        const response = await fetch("/api/properties");
        if (response.ok) {
          const data = await response.json();
          setProperties(data.properties);
        }
      } catch (error) {
        console.error("Error fetching properties:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (authStatus === "authenticated") {
      fetchProperties();
    }
  }, [authStatus]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/properties/${deleteId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setProperties((prev) => prev.filter((p) => p.id !== deleteId));
        toast.success(t("deleted"));
      } else {
        toast.error(t("deleteFailed"));
      }
    } catch (error) {
      console.error("Error deleting property:", error);
      toast.error(t("deleteFailed"));
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const response = await fetch(`/api/properties/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });

      if (response.ok) {
        setProperties((prev) =>
          prev.map((p) => ({
            ...p,
            isDefault: p.id === id,
          }))
        );
        toast.success(t("setAsDefault"));
      }
    } catch (error) {
      console.error("Error setting default:", error);
    }
  };

  if (authStatus === "loading" || isLoading) {
    return <PropertiesSkeleton />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <BackButton href="/dashboard" />
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Building2 className="h-8 w-8 text-blue-500" />
                {t("title")}
              </h1>
              <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
            </div>
            <Link href="/properties/new">
              <Button className="bg-gradient-to-r from-blue-500 to-green-500">
                <Plus className="h-4 w-4 mr-2" />
                {t("addProperty")}
              </Button>
            </Link>
          </div>

          {/* Properties Grid */}
          {properties.length === 0 ? (
            <Card className="p-12 text-center">
              <Building2 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold mb-2">{t("noProperties")}</h2>
              <p className="text-muted-foreground mb-6">{t("noPropertiesDesc")}</p>
              <Link href="/properties/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("addFirst")}
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {properties.map((property) => (
                <Card
                  key={property.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Home className="h-5 w-5 text-blue-500" />
                        <h3 className="font-semibold">{property.name}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {property.isDefault && (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-700"
                          >
                            <Star className="h-3 w-3 mr-1" />
                            {t("default")}
                          </Badge>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <Link href={`/properties/${property.id}/edit`}>
                              <DropdownMenuItem>
                                <Pencil className="h-4 w-4 mr-2" />
                                {tCommon("edit")}
                              </DropdownMenuItem>
                            </Link>
                            {!property.isDefault && (
                              <DropdownMenuItem
                                onClick={() => handleSetDefault(property.id)}
                              >
                                <Star className="h-4 w-4 mr-2" />
                                {t("setDefault")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeleteId(property.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {tCommon("delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {property.address}
                          {property.city && `, ${property.city}`}
                        </span>
                      </div>

                      {(property.rooms || property.bathrooms) && (
                        <div className="flex items-center gap-4">
                          {property.rooms && (
                            <span>
                              {property.rooms} {t("rooms")}
                            </span>
                          )}
                          {property.bathrooms && (
                            <span>
                              {property.bathrooms} {t("bathrooms")}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {property._count.bookings} {t("bookings")}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t flex gap-2">
                      <Link href={`/properties/${property.id}`} className="flex-1">
                        <Button variant="outline" className="w-full" size="sm">
                          {t("viewDetails")}
                        </Button>
                      </Link>
                      <Link href={`/search?propertyId=${property.id}`} className="flex-1">
                        <Button className="w-full" size="sm">
                          {t("book")}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? t("deleting") : tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PropertiesSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
