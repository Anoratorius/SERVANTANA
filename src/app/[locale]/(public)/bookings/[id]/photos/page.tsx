"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { Header, Footer } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PhotoUploader } from "@/components/bookings/PhotoUploader";
import { PhotoGallery } from "@/components/bookings/PhotoGallery";
import { ArrowLeft, Camera } from "lucide-react";
import { Link } from "@/i18n/navigation";

interface Photo {
  id: string;
  type: string;
  fileUrl: string;
  thumbnailUrl?: string | null;
  fileName: string;
  caption?: string | null;
  createdAt: string;
  uploader: {
    firstName: string;
    lastName: string;
  };
}

interface Booking {
  id: string;
  status: string;
  cleanerId: string;
  customerId: string;
  service: { name: string };
  scheduledDate: string;
  scheduledTime: string;
}

export default function BookingPhotosPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [beforePhotos, setBeforePhotos] = useState<Photo[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isCleaner = session?.user?.id === booking?.cleanerId;
  const canUpload =
    isCleaner &&
    ["CONFIRMED", "IN_PROGRESS", "COMPLETED"].includes(booking?.status || "");

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus === "authenticated" && id) {
      fetchData();
    }
  }, [authStatus, id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [bookingRes, photosRes] = await Promise.all([
        fetch(`/api/bookings/${id}`),
        fetch(`/api/bookings/${id}/photos`),
      ]);

      if (bookingRes.ok) {
        const data = await bookingRes.json();
        setBooking(data.booking);
      }

      if (photosRes.ok) {
        const data = await photosRes.json();
        setBeforePhotos(data.beforePhotos || []);
        setAfterPhotos(data.afterPhotos || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (authStatus === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
          <div className="container mx-auto px-4 max-w-5xl">
            <Skeleton className="h-8 w-48 mb-6" />
            <Skeleton className="h-64" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
          <div className="container mx-auto px-4 max-w-5xl text-center">
            <h1 className="text-2xl font-bold mb-4">Booking Not Found</h1>
            <Link href="/bookings">
              <Button>Back to Bookings</Button>
            </Link>
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
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link href={`/bookings/${id}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Camera className="h-6 w-6" />
                Booking Photos
              </h1>
              <p className="text-muted-foreground">
                {booking.service.name} -{" "}
                {new Date(booking.scheduledDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Upload Section (Cleaner only) */}
          {canUpload && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Upload Photos</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6">
                <PhotoUploader
                  bookingId={id}
                  type="before"
                  currentCount={beforePhotos.length}
                  onUploaded={fetchData}
                />
                <PhotoUploader
                  bookingId={id}
                  type="after"
                  currentCount={afterPhotos.length}
                  onUploaded={fetchData}
                />
              </CardContent>
            </Card>
          )}

          {/* Gallery */}
          <Card>
            <CardHeader>
              <CardTitle>Photo Gallery</CardTitle>
            </CardHeader>
            <CardContent>
              {beforePhotos.length === 0 && afterPhotos.length === 0 ? (
                <div className="text-center py-12">
                  <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No photos uploaded yet</p>
                  {isCleaner && !canUpload && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Photos can be uploaded once the booking is confirmed
                    </p>
                  )}
                </div>
              ) : (
                <PhotoGallery
                  bookingId={id}
                  beforePhotos={beforePhotos}
                  afterPhotos={afterPhotos}
                  canDelete={isCleaner}
                  onPhotoDeleted={fetchData}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
