"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Radio,
  Users,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface LiveStreamPlayerProps {
  playbackUrl: string;
  isLive?: boolean;
  viewerCount?: number;
  title?: string;
  onError?: (error: string) => void;
  autoPlay?: boolean;
  className?: string;
}

type PlayerState = "loading" | "playing" | "paused" | "ended" | "error";

export function LiveStreamPlayer({
  playbackUrl,
  isLive = false,
  viewerCount = 0,
  title = "Live Stream",
  onError,
  autoPlay = true,
  className = "",
}: LiveStreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initCountRef = useRef(0);

  const [playerState, setPlayerState] = useState<PlayerState>("loading");
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize HLS player - called after initial mount or on retry
  const initializePlayer = useCallback(
    (video: HTMLVideoElement, url: string) => {
      // Clean up existing HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      // Check if HLS is supported natively (Safari)
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
        if (autoPlay) {
          video.play().catch(() => {
            // Autoplay failed, likely due to browser policy
            setPlayerState("paused");
          });
        }
        return;
      }

      // Use HLS.js for browsers that don't support HLS natively
      if (!Hls.isSupported()) {
        const message = "HLS is not supported in this browser";
        setErrorMessage(message);
        setPlayerState("error");
        onError?.(message);
        return;
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        liveDurationInfinity: true,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });

      hlsRef.current = hls;

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (autoPlay) {
          video.play().catch(() => {
            setPlayerState("paused");
          });
        } else {
          setPlayerState("paused");
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Try to recover from network errors
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default: {
              const errorMsg = "Stream playback failed";
              setErrorMessage(errorMsg);
              setPlayerState("error");
              onError?.(errorMsg);
              break;
            }
          }
        }
      });
    },
    [autoPlay, onError]
  );

  // Effect to initialize on mount and URL changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackUrl) return;

    // Track initialization to allow retry
    initCountRef.current += 1;

    // Use requestAnimationFrame to avoid synchronous setState warning
    const rafId = requestAnimationFrame(() => {
      setPlayerState("loading");
      setErrorMessage(null);
      initializePlayer(video, playbackUrl);
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [playbackUrl, initializePlayer]);

  // Retry function
  const retry = useCallback(() => {
    const video = videoRef.current;
    if (!video || !playbackUrl) return;

    setPlayerState("loading");
    setErrorMessage(null);

    // Delay initialization slightly to allow state update
    requestAnimationFrame(() => {
      initializePlayer(video, playbackUrl);
    });
  }, [playbackUrl, initializePlayer]);

  // Handle video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setPlayerState("playing");
    const handlePause = () => setPlayerState("paused");
    const handleEnded = () => setPlayerState("ended");
    const handleWaiting = () => setPlayerState("loading");
    const handlePlaying = () => setPlayerState("playing");

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
    };
  }, []);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Auto-hide controls after inactivity
  useEffect(() => {
    if (playerState !== "playing") return;

    let timeout: NodeJS.Timeout;
    const handleActivity = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 3000);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleActivity);
      container.addEventListener("touchstart", handleActivity);
    }

    return () => {
      clearTimeout(timeout);
      if (container) {
        container.removeEventListener("mousemove", handleActivity);
        container.removeEventListener("touchstart", handleActivity);
      }
    };
  }, [playerState]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Radio className="h-5 w-5 text-red-500" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isLive && (
              <Badge variant="destructive" className="animate-pulse">
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-white" />
                LIVE
              </Badge>
            )}
            {viewerCount > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {viewerCount}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div
          ref={containerRef}
          className="relative aspect-video bg-black"
          onMouseEnter={() => setShowControls(true)}
        >
          {/* Video Element */}
          <video
            ref={videoRef}
            className="h-full w-full"
            playsInline
            muted={isMuted}
          />

          {/* Loading Overlay */}
          {playerState === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center text-white">
                <Loader2 className="mx-auto h-12 w-12 animate-spin" />
                <p className="mt-2 text-sm">Loading stream...</p>
              </div>
            </div>
          )}

          {/* Error Overlay */}
          {playerState === "error" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center text-white">
                <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
                <p className="mt-2 text-sm">{errorMessage || "Stream unavailable"}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={retry}
                  className="mt-4"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Ended Overlay */}
          {playerState === "ended" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center text-white">
                <p className="text-lg font-medium">Stream ended</p>
                <p className="mt-1 text-sm text-gray-300">
                  The live stream has concluded
                </p>
              </div>
            </div>
          )}

          {/* Controls Overlay */}
          {showControls && playerState !== "error" && playerState !== "ended" && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Play/Pause */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={togglePlay}
                    className="text-white hover:bg-white/20"
                    disabled={playerState === "loading"}
                  >
                    {playerState === "playing" ? (
                      <Pause className="h-6 w-6" />
                    ) : (
                      <Play className="h-6 w-6" />
                    )}
                  </Button>

                  {/* Mute/Unmute */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMute}
                    className="text-white hover:bg-white/20"
                  >
                    {isMuted ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </Button>

                  {/* Live indicator */}
                  {isLive && (
                    <span className="ml-2 text-xs font-medium text-red-400">
                      LIVE
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Fullscreen */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleFullscreen}
                    className="text-white hover:bg-white/20"
                  >
                    {isFullscreen ? (
                      <Minimize className="h-5 w-5" />
                    ) : (
                      <Maximize className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Click to play overlay (when paused) */}
          {playerState === "paused" && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center"
              aria-label="Play video"
            >
              <div className="rounded-full bg-white/20 p-4 backdrop-blur-sm transition-transform hover:scale-110">
                <Play className="h-12 w-12 text-white" />
              </div>
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
