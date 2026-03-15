"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Camera,
  Trash2,
  ZoomIn,
  ArrowLeft,
  ArrowRight,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

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

interface PhotoGalleryProps {
  bookingId: string;
  beforePhotos: Photo[];
  afterPhotos: Photo[];
  canDelete?: boolean;
  onPhotoDeleted?: () => void;
  showComparison?: boolean;
}

export function PhotoGallery({
  bookingId,
  beforePhotos,
  afterPhotos,
  canDelete = false,
  onPhotoDeleted,
  showComparison = true,
}: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonIndex, setComparisonIndex] = useState(0);

  const allPhotos = [...beforePhotos, ...afterPhotos];

  const handleDelete = async (photoId: string) => {
    if (!confirm("Are you sure you want to delete this photo?")) return;

    setIsDeleting(photoId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/photos/${photoId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Photo deleted");
        onPhotoDeleted?.();
        if (selectedPhoto?.id === photoId) {
          setSelectedPhoto(null);
        }
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete photo");
      }
    } catch {
      toast.error("Failed to delete photo");
    } finally {
      setIsDeleting(null);
    }
  };

  const PhotoGrid = ({ photos, title }: { photos: Photo[]; title: string }) => (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Camera className="h-4 w-4" />
        {title} ({photos.length})
      </h4>
      {photos.length === 0 ? (
        <div className="border rounded-lg p-8 text-center bg-muted/30">
          <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No {title.toLowerCase()}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative group cursor-pointer rounded-lg overflow-hidden border"
            >
              <img
                src={photo.thumbnailUrl || photo.fileUrl}
                alt={photo.caption || photo.fileName}
                className="w-full h-32 object-cover transition-transform group-hover:scale-105"
                onClick={() => setSelectedPhoto(photo)}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPhoto(photo);
                  }}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                {canDelete && (
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(photo.id);
                    }}
                    disabled={isDeleting === photo.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 text-white text-xs truncate">
                  {photo.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const maxComparison = Math.min(beforePhotos.length, afterPhotos.length);

  return (
    <div className="space-y-6">
      {/* Comparison Mode Toggle */}
      {showComparison && beforePhotos.length > 0 && afterPhotos.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Before & After Comparison</h3>
              <Button
                variant={comparisonMode ? "default" : "outline"}
                size="sm"
                onClick={() => setComparisonMode(!comparisonMode)}
              >
                {comparisonMode ? "Hide Comparison" : "Show Comparison"}
              </Button>
            </div>

            {comparisonMode && maxComparison > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-center">Before</p>
                    <img
                      src={beforePhotos[comparisonIndex]?.fileUrl}
                      alt="Before"
                      className="w-full h-64 object-cover rounded-lg border"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-center">After</p>
                    <img
                      src={afterPhotos[comparisonIndex]?.fileUrl}
                      alt="After"
                      className="w-full h-64 object-cover rounded-lg border"
                    />
                  </div>
                </div>

                {maxComparison > 1 && (
                  <div className="flex justify-center items-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setComparisonIndex((i) => Math.max(0, i - 1))
                      }
                      disabled={comparisonIndex === 0}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {comparisonIndex + 1} / {maxComparison}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setComparisonIndex((i) =>
                          Math.min(maxComparison - 1, i + 1)
                        )
                      }
                      disabled={comparisonIndex === maxComparison - 1}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Photo Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({allPhotos.length})</TabsTrigger>
          <TabsTrigger value="before">Before ({beforePhotos.length})</TabsTrigger>
          <TabsTrigger value="after">After ({afterPhotos.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-6">
          <PhotoGrid photos={beforePhotos} title="Before Photos" />
          <PhotoGrid photos={afterPhotos} title="After Photos" />
        </TabsContent>

        <TabsContent value="before" className="mt-4">
          <PhotoGrid photos={beforePhotos} title="Before Photos" />
        </TabsContent>

        <TabsContent value="after" className="mt-4">
          <PhotoGrid photos={afterPhotos} title="After Photos" />
        </TabsContent>
      </Tabs>

      {/* Full Image Dialog */}
      <Dialog
        open={!!selectedPhoto}
        onOpenChange={() => setSelectedPhoto(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="capitalize">{selectedPhoto?.type} Photo</span>
              {selectedPhoto?.caption && (
                <span className="font-normal text-muted-foreground">
                  - {selectedPhoto.caption}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="relative">
            <img
              src={selectedPhoto?.fileUrl}
              alt={selectedPhoto?.caption || selectedPhoto?.fileName}
              className="w-full max-h-[70vh] object-contain rounded-lg"
            />
            <Button
              variant="outline"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>
              Uploaded by {selectedPhoto?.uploader.firstName}{" "}
              {selectedPhoto?.uploader.lastName}
            </span>
            <span>
              {selectedPhoto &&
                new Date(selectedPhoto.createdAt).toLocaleString()}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
