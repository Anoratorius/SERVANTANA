"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface VerificationResult {
  id: string;
  status: "PENDING" | "PASSED" | "FAILED" | "MANUAL_REVIEW";
  verified: boolean;
  faceMatchScore: number;
  livenessScore: number;
  locationVerified: boolean;
  failureReason: string | null;
  createdAt: string;
}

interface VerificationCameraProps {
  bookingId: string;
  onVerificationComplete?: (result: VerificationResult) => void;
  onCancel?: () => void;
}

type CameraState = "idle" | "requesting" | "streaming" | "captured" | "submitting" | "complete";

export function VerificationCamera({
  bookingId,
  onVerificationComplete,
  onCancel,
}: VerificationCameraProps) {
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Request location when component mounts
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (err) => {
          console.warn("Location unavailable:", err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setCameraState("requesting");

    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access is not supported in this browser");
      }

      // Request camera access with front-facing camera preference
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user", // Front camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraState("streaming");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to access camera";

      if (errorMessage.includes("NotAllowedError") || errorMessage.includes("Permission")) {
        setError("Camera permission denied. Please allow camera access and try again.");
      } else if (errorMessage.includes("NotFoundError")) {
        setError("No camera found. Please ensure your device has a camera.");
      } else {
        setError(errorMessage);
      }
      setCameraState("idle");
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas (mirror for selfie)
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0);

    // Convert to data URL
    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(imageDataUrl);
    setCameraState("captured");

    // Stop the camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setError(null);
    startCamera();
  }, [startCamera]);

  const submitVerification = useCallback(async () => {
    if (!capturedImage) return;

    setError(null);
    setCameraState("submitting");

    try {
      // Convert data URL to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      // Create form data
      const formData = new FormData();
      formData.append("selfie", blob, "selfie.jpg");

      if (location) {
        formData.append("latitude", location.latitude.toString());
        formData.append("longitude", location.longitude.toString());
      }

      // Submit to API
      const apiResponse = await fetch(`/api/bookings/${bookingId}/verify-identity`, {
        method: "POST",
        body: formData,
      });

      const data = await apiResponse.json();

      if (!apiResponse.ok) {
        throw new Error(data.error || "Verification failed");
      }

      setVerificationResult(data.verification);
      setCameraState("complete");

      if (onVerificationComplete) {
        onVerificationComplete(data.verification);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Verification failed";
      setError(errorMessage);
      setCameraState("captured"); // Allow retry
    }
  }, [capturedImage, bookingId, location, onVerificationComplete]);

  const getStatusBadge = (status: VerificationResult["status"]) => {
    switch (status) {
      case "PASSED":
        return <Badge className="bg-green-500">Verified</Badge>;
      case "FAILED":
        return <Badge variant="destructive">Failed</Badge>;
      case "MANUAL_REVIEW":
        return <Badge className="bg-yellow-500">Pending Review</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <path d="M7 21h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z" />
            <circle cx="12" cy="9" r="3" />
            <path d="M12 15v3" />
          </svg>
          Identity Verification
        </CardTitle>
        <CardDescription>
          Take a selfie to verify your identity for this booking
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error message */}
        {error && (
          <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-3 text-sm">
            {error}
          </div>
        )}

        {/* Camera/Photo preview area */}
        <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden">
          {/* Idle state - show start button */}
          {cameraState === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="text-muted-foreground text-center px-4">
                <p className="font-medium">Verify Your Identity</p>
                <p className="text-sm mt-1">
                  Take a selfie to confirm you are the worker assigned to this job
                </p>
              </div>
              <Button onClick={startCamera}>Start Camera</Button>
            </div>
          )}

          {/* Requesting camera access */}
          {cameraState === "requesting" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Requesting camera access...
                </p>
              </div>
            </div>
          )}

          {/* Live video stream */}
          {(cameraState === "streaming" || cameraState === "requesting") && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }} // Mirror for selfie
            />
          )}

          {/* Captured image preview */}
          {(cameraState === "captured" || cameraState === "submitting") && capturedImage && (
            <img
              src={capturedImage}
              alt="Captured selfie"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* Submitting overlay */}
          {cameraState === "submitting" && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2" />
                <p className="text-sm">Verifying identity...</p>
              </div>
            </div>
          )}

          {/* Verification complete */}
          {cameraState === "complete" && verificationResult && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4 p-4">
                {verificationResult.verified ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <p className="font-medium text-green-600">
                      Identity Verified
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-yellow-500 flex items-center justify-center mx-auto">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <p className="font-medium text-yellow-600">
                      {verificationResult.status === "MANUAL_REVIEW"
                        ? "Pending Review"
                        : "Verification Failed"}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Face guide overlay for streaming */}
          {cameraState === "streaming" && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-60 border-2 border-dashed border-white/50 rounded-full" />
              </div>
              <p className="absolute bottom-4 left-0 right-0 text-center text-white text-sm bg-black/30 py-1">
                Position your face within the guide
              </p>
            </div>
          )}
        </div>

        {/* Hidden canvas for capturing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Verification scores */}
        {cameraState === "complete" && verificationResult && (
          <div className="space-y-3 bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              {getStatusBadge(verificationResult.status)}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Face Match</span>
                <span className="font-medium">
                  {verificationResult.faceMatchScore}%
                </span>
              </div>
              <Progress value={verificationResult.faceMatchScore} />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Liveness</span>
                <span className="font-medium">
                  {verificationResult.livenessScore}%
                </span>
              </div>
              <Progress value={verificationResult.livenessScore} />
            </div>

            {verificationResult.locationVerified && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Location verified
              </div>
            )}

            {verificationResult.failureReason && (
              <p className="text-sm text-destructive">
                {verificationResult.failureReason}
              </p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {cameraState === "streaming" && (
            <>
              <Button variant="outline" className="flex-1" onClick={onCancel}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={capturePhoto}>
                Capture Photo
              </Button>
            </>
          )}

          {cameraState === "captured" && (
            <>
              <Button variant="outline" className="flex-1" onClick={retakePhoto}>
                Retake
              </Button>
              <Button className="flex-1" onClick={submitVerification}>
                Verify Identity
              </Button>
            </>
          )}

          {cameraState === "complete" && (
            <Button className="w-full" onClick={onCancel}>
              {verificationResult?.verified ? "Continue" : "Close"}
            </Button>
          )}

          {cameraState === "idle" && error && (
            <Button variant="outline" className="w-full" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>

        {/* Location status indicator */}
        {cameraState !== "complete" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {location
              ? "Location available"
              : "Location unavailable (optional)"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
