"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Video,
  VideoOff,
  Radio,
  StopCircle,
  Camera,
  RefreshCw,
  AlertCircle,
  Check,
  Copy,
  Loader2,
  Mic,
  MicOff,
} from "lucide-react";
import { toast } from "sonner";

interface StreamBroadcasterProps {
  streamKey?: string;
  rtmpUrl?: string;
  isStreaming?: boolean;
  hasConsent?: boolean;
  onStartStream?: () => Promise<{ streamKey: string; rtmpUrl: string } | null>;
  onStopStream?: () => Promise<void>;
  onConsentChange?: (consent: boolean) => Promise<void>;
  className?: string;
}

type BroadcastState = "idle" | "preview" | "connecting" | "live" | "error";

export function StreamBroadcaster({
  streamKey: initialStreamKey,
  rtmpUrl: initialRtmpUrl = "rtmps://global-live.mux.com:443/app",
  isStreaming: initialIsStreaming = false,
  hasConsent = false,
  onStartStream,
  onStopStream,
  onConsentChange,
  className = "",
}: StreamBroadcasterProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [broadcastState, setBroadcastState] = useState<BroadcastState>(
    initialIsStreaming ? "live" : "idle"
  );
  const [streamKey, setStreamKey] = useState(initialStreamKey || "");
  const [rtmpUrl, setRtmpUrl] = useState(initialRtmpUrl);
  const [hasCamera, setHasCamera] = useState(false);
  const [hasMicrophone, setHasMicrophone] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [consent, setConsent] = useState(hasConsent);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Check for camera and microphone permissions
  useEffect(() => {
    const checkDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setHasCamera(devices.some((d) => d.kind === "videoinput"));
        setHasMicrophone(devices.some((d) => d.kind === "audioinput"));
      } catch (err) {
        console.error("Failed to enumerate devices:", err);
      }
    };

    checkDevices();
  }, []);

  // Start camera preview
  const startPreview = useCallback(async () => {
    try {
      setError(null);
      const constraints: MediaStreamConstraints = {
        video: cameraEnabled
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "environment", // Back camera for work streaming
            }
          : false,
        audio: micEnabled,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setBroadcastState("preview");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to access camera";
      setError(message);
      setBroadcastState("error");
      toast.error("Camera access denied. Please enable camera permissions.");
    }
  }, [cameraEnabled, micEnabled]);

  // Stop camera preview
  const stopPreview = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setBroadcastState("idle");
  }, []);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraEnabled(videoTrack.enabled);
      }
    } else {
      setCameraEnabled(!cameraEnabled);
    }
  }, [cameraEnabled]);

  // Toggle microphone
  const toggleMic = useCallback(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
      }
    } else {
      setMicEnabled(!micEnabled);
    }
  }, [micEnabled]);

  // Switch camera (front/back)
  const switchCamera = useCallback(async () => {
    if (!streamRef.current) return;

    // Get current video track settings
    const currentTrack = streamRef.current.getVideoTracks()[0];
    if (!currentTrack) return;

    const settings = currentTrack.getSettings();
    const currentFacingMode = settings.facingMode;

    // Stop current track
    currentTrack.stop();

    try {
      // Request new stream with opposite facing mode
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: currentFacingMode === "environment" ? "user" : "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: micEnabled,
      });

      // Replace video track
      const newVideoTrack = newStream.getVideoTracks()[0];
      streamRef.current.addTrack(newVideoTrack);

      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }

      toast.success("Camera switched");
    } catch (err) {
      console.error("Failed to switch camera:", err);
      toast.error("Failed to switch camera");
    }
  }, [micEnabled]);

  // Start streaming
  const handleStartStream = useCallback(async () => {
    if (!consent) {
      toast.error("Please consent to streaming before starting");
      return;
    }

    try {
      setBroadcastState("connecting");
      setError(null);

      // Call API to create stream and get stream key
      if (onStartStream) {
        const result = await onStartStream();
        if (result) {
          setStreamKey(result.streamKey);
          setRtmpUrl(result.rtmpUrl);
        } else {
          throw new Error("Failed to start stream");
        }
      }

      // Note: Actual RTMP streaming requires a native app or specialized library
      // For web browsers, we would typically use WebRTC instead
      // This is a placeholder that shows the stream key for use with OBS/external tools

      setBroadcastState("live");
      toast.success("Stream started! Use the RTMP URL and stream key to broadcast.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start stream";
      setError(message);
      setBroadcastState("error");
      toast.error(message);
    }
  }, [consent, onStartStream]);

  // Stop streaming
  const handleStopStream = useCallback(async () => {
    try {
      if (onStopStream) {
        await onStopStream();
      }

      stopPreview();
      setBroadcastState("idle");
      setStreamKey("");
      toast.success("Stream ended");
    } catch (err) {
      console.error("Failed to stop stream:", err);
      toast.error("Failed to stop stream");
    }
  }, [onStopStream, stopPreview]);

  // Handle consent change
  const handleConsentChange = async (checked: boolean) => {
    setConsent(checked);
    if (onConsentChange) {
      try {
        await onConsentChange(checked);
        toast.success(checked ? "Streaming consent granted" : "Streaming consent withdrawn");
      } catch {
        setConsent(!checked); // Revert on error
        toast.error("Failed to update consent");
      }
    }
  };

  // Copy stream key to clipboard
  const copyStreamKey = () => {
    if (streamKey) {
      navigator.clipboard.writeText(streamKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
      toast.success("Stream key copied to clipboard");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Radio className="h-5 w-5 text-red-500" />
            Stream Broadcast
          </CardTitle>
          {broadcastState === "live" && (
            <Badge variant="destructive" className="animate-pulse">
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-white" />
              LIVE
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Consent Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="consent" className="text-sm font-medium">
              Consent to Streaming
            </Label>
            <p className="text-xs text-muted-foreground">
              I agree to stream my work session to the customer
            </p>
          </div>
          <Switch
            id="consent"
            checked={consent}
            onCheckedChange={handleConsentChange}
            disabled={broadcastState === "live"}
          />
        </div>

        {/* Camera Preview */}
        <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            autoPlay
            playsInline
            muted
          />

          {/* Overlay States */}
          {broadcastState === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
              <Video className="mb-2 h-12 w-12 text-gray-500" />
              <p className="text-sm text-gray-400">Camera preview off</p>
            </div>
          )}

          {broadcastState === "connecting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
              <Loader2 className="mb-2 h-12 w-12 animate-spin text-white" />
              <p className="text-sm text-white">Connecting...</p>
            </div>
          )}

          {broadcastState === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/80">
              <AlertCircle className="mb-2 h-12 w-12 text-white" />
              <p className="text-sm text-white">{error || "Stream error"}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBroadcastState("idle")}
                className="mt-4"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          )}

          {/* Camera/Mic Controls Overlay */}
          {(broadcastState === "preview" || broadcastState === "live") && (
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-black/50 p-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCamera}
                className={`rounded-full ${cameraEnabled ? "text-white" : "bg-red-500 text-white"}`}
              >
                {cameraEnabled ? (
                  <Video className="h-5 w-5" />
                ) : (
                  <VideoOff className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMic}
                className={`rounded-full ${micEnabled ? "text-white" : "bg-red-500 text-white"}`}
              >
                {micEnabled ? (
                  <Mic className="h-5 w-5" />
                ) : (
                  <MicOff className="h-5 w-5" />
                )}
              </Button>
              {hasCamera && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={switchCamera}
                  className="rounded-full text-white"
                >
                  <RefreshCw className="h-5 w-5" />
                </Button>
              )}
            </div>
          )}

          {/* Live Indicator */}
          {broadcastState === "live" && (
            <div className="absolute left-2 top-2">
              <Badge variant="destructive" className="animate-pulse">
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-white" />
                LIVE
              </Badge>
            </div>
          )}
        </div>

        {/* Stream Key Info (when live) */}
        {broadcastState === "live" && streamKey && (
          <div className="space-y-2 rounded-lg border bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              For external broadcast apps (OBS, Streamlabs):
            </p>
            <div className="space-y-1">
              <Label className="text-xs">RTMP URL</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
                  {rtmpUrl}
                </code>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Stream Key</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
                  {streamKey.substring(0, 20)}...
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={copyStreamKey}
                >
                  {copiedKey ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {broadcastState === "idle" && (
            <>
              <Button
                onClick={startPreview}
                disabled={!hasCamera && !hasMicrophone}
                className="flex-1"
              >
                <Camera className="mr-2 h-4 w-4" />
                Start Preview
              </Button>
            </>
          )}

          {broadcastState === "preview" && (
            <>
              <Button
                variant="outline"
                onClick={stopPreview}
                className="flex-1"
              >
                Stop Preview
              </Button>
              <Button
                onClick={handleStartStream}
                disabled={!consent}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                <Radio className="mr-2 h-4 w-4" />
                Go Live
              </Button>
            </>
          )}

          {broadcastState === "live" && (
            <Button
              onClick={handleStopStream}
              variant="destructive"
              className="flex-1"
            >
              <StopCircle className="mr-2 h-4 w-4" />
              End Stream
            </Button>
          )}

          {broadcastState === "connecting" && (
            <Button disabled className="flex-1">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </Button>
          )}
        </div>

        {/* Info Text */}
        {!consent && broadcastState !== "live" && (
          <p className="text-center text-xs text-muted-foreground">
            Both you and the customer must consent before streaming can begin.
          </p>
        )}

        {broadcastState === "live" && (
          <p className="text-center text-xs text-muted-foreground">
            The customer can now watch your work in real-time.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
