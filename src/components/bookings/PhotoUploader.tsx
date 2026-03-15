"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, X, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface PhotoUploaderProps {
  bookingId: string;
  type: "before" | "after";
  onUploaded?: () => void;
  maxPhotos?: number;
  currentCount?: number;
}

export function PhotoUploader({
  bookingId,
  type,
  onUploaded,
  maxPhotos = 5,
  currentCount = 0,
}: PhotoUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [captions, setCaptions] = useState<Record<number, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);

  const remainingSlots = maxPhotos - currentCount;

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);

      // Validate
      const validFiles = files.filter((file) => {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image`);
          return false;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 10MB)`);
          return false;
        }
        return true;
      });

      // Limit to remaining slots
      const filesToAdd = validFiles.slice(0, remainingSlots - selectedFiles.length);

      if (validFiles.length > filesToAdd.length) {
        toast.warning(`Only ${remainingSlots} photos can be uploaded`);
      }

      setSelectedFiles((prev) => [...prev, ...filesToAdd]);
    },
    [remainingSlots, selectedFiles.length]
  );

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setCaptions((prev) => {
      const newCaptions = { ...prev };
      delete newCaptions[index];
      return newCaptions;
    });
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadedCount(0);

    let successCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const caption = captions[i] || "";

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      if (caption) {
        formData.append("caption", caption);
      }

      try {
        const res = await fetch(`/api/bookings/${bookingId}/photos`, {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          successCount++;
          setUploadedCount(successCount);
        } else {
          const error = await res.json();
          toast.error(`Failed to upload ${file.name}: ${error.error}`);
        }
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      toast.success(`${successCount} photo(s) uploaded successfully`);
      setSelectedFiles([]);
      setCaptions({});
      onUploaded?.();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold capitalize flex items-center gap-2">
          <Camera className="h-5 w-5" />
          {type} Photos
        </Label>
        <span className="text-sm text-muted-foreground">
          {currentCount}/{maxPhotos} uploaded
        </span>
      </div>

      {/* File input */}
      {remainingSlots > 0 && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id={`photo-upload-${type}`}
            disabled={isUploading}
          />
          <label
            htmlFor={`photo-upload-${type}`}
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Click to select {type} photos
            </p>
            <p className="text-xs text-muted-foreground">
              JPEG, PNG, WebP, HEIC (max 10MB each)
            </p>
          </label>
        </div>
      )}

      {/* Selected files preview */}
      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">
            Selected: {selectedFiles.length} file(s)
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="relative border rounded-lg p-2 bg-gray-50"
              >
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-24 object-cover rounded"
                />
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  disabled={isUploading}
                >
                  <X className="h-3 w-3" />
                </button>
                <Input
                  type="text"
                  placeholder="Caption (optional)"
                  value={captions[index] || ""}
                  onChange={(e) =>
                    setCaptions((prev) => ({ ...prev, [index]: e.target.value }))
                  }
                  className="mt-2 text-xs"
                  disabled={isUploading}
                />
              </div>
            ))}
          </div>

          <Button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading ({uploadedCount}/{selectedFiles.length})...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Upload {selectedFiles.length} Photo(s)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
