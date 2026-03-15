/**
 * File Storage Service using Cloudinary
 * Handles image/document uploads with auto-optimization
 */

import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  url: string;
  publicId: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  format: string;
  size: number;
}

export interface UploadOptions {
  folder?: string;
  transformation?: Record<string, unknown>;
  resourceType?: "image" | "raw" | "auto";
  generateThumbnail?: boolean;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
}

/**
 * Upload a file to Cloudinary
 */
export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const {
    folder = "servantana",
    resourceType = "auto",
    generateThumbnail = false,
    thumbnailWidth = 200,
    thumbnailHeight = 200,
  } = options;

  return new Promise((resolve, reject) => {
    const uploadOptions: Record<string, unknown> = {
      folder,
      resource_type: resourceType,
      public_id: `${Date.now()}-${fileName.replace(/\.[^/.]+$/, "")}`,
    };

    // Add image optimizations for images
    if (resourceType === "image" || resourceType === "auto") {
      uploadOptions.transformation = [
        { quality: "auto:good" },
        { fetch_format: "auto" },
      ];
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result: UploadApiResponse | undefined) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          reject(new Error(`Upload failed: ${error.message}`));
          return;
        }

        if (!result) {
          reject(new Error("Upload failed: No result returned"));
          return;
        }

        let thumbnailUrl: string | undefined;
        if (generateThumbnail && result.resource_type === "image") {
          thumbnailUrl = cloudinary.url(result.public_id, {
            transformation: [
              { width: thumbnailWidth, height: thumbnailHeight, crop: "fill" },
              { quality: "auto:low" },
              { fetch_format: "auto" },
            ],
          });
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          thumbnailUrl,
          width: result.width,
          height: result.height,
          format: result.format,
          size: result.bytes,
        });
      }
    );

    uploadStream.end(fileBuffer);
  });
}

/**
 * Delete a file from Cloudinary
 */
export async function deleteFile(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok";
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return false;
  }
}

/**
 * Generate thumbnail URL for an existing image
 */
export function generateThumbnail(
  publicId: string,
  width: number = 200,
  height: number = 200
): string {
  return cloudinary.url(publicId, {
    transformation: [
      { width, height, crop: "fill" },
      { quality: "auto:low" },
      { fetch_format: "auto" },
    ],
  });
}

/**
 * Generate a signed upload URL for direct browser uploads
 */
export function generateUploadSignature(
  folder: string = "servantana"
): { timestamp: number; signature: string; apiKey: string; cloudName: string } {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;

  const signature = cloudinary.utils.api_sign_request(
    { folder, timestamp },
    process.env.CLOUDINARY_API_SECRET || ""
  );

  return {
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  };
}

/**
 * Extract public ID from Cloudinary URL
 */
export function extractPublicId(url: string): string | null {
  try {
    const urlParts = url.split("/");
    const uploadIndex = urlParts.indexOf("upload");
    if (uploadIndex === -1) return null;

    // Get everything after 'upload/v{version}/'
    const pathAfterUpload = urlParts.slice(uploadIndex + 2).join("/");
    // Remove file extension
    return pathAfterUpload.replace(/\.[^/.]+$/, "");
  } catch {
    return null;
  }
}
