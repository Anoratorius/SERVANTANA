/**
 * Mux API Integration for Live Streaming
 *
 * Provides functions to create, manage, and monitor live streams
 * for booking work sessions.
 */

interface MuxLiveStreamResponse {
  data: {
    id: string;
    stream_key: string;
    status: "idle" | "active" | "disabled";
    playback_ids: Array<{
      id: string;
      policy: "public" | "signed";
    }>;
    recent_asset_ids?: string[];
    reconnect_window?: number;
    max_continuous_duration?: number;
    latency_mode?: string;
    new_asset_settings?: {
      playback_policies: string[];
    };
  };
}

interface MuxAssetResponse {
  data: {
    id: string;
    playback_ids?: Array<{
      id: string;
      policy: "public" | "signed";
    }>;
    status: string;
    duration?: number;
  };
}

// Mux API base URL
const MUX_API_BASE = "https://api.mux.com";

/**
 * Get Mux API credentials
 */
function getMuxCredentials(): { tokenId: string; tokenSecret: string } {
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;

  if (!tokenId || !tokenSecret) {
    throw new Error("MUX_TOKEN_ID and MUX_TOKEN_SECRET must be set in environment variables");
  }

  return { tokenId, tokenSecret };
}

/**
 * Create authorization header for Mux API
 */
function getAuthHeader(): string {
  const { tokenId, tokenSecret } = getMuxCredentials();
  const credentials = Buffer.from(`${tokenId}:${tokenSecret}`).toString("base64");
  return `Basic ${credentials}`;
}

/**
 * Make a request to the Mux API
 */
async function muxRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${MUX_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(
      `Mux API error: ${response.status} - ${JSON.stringify(error)}`
    );
  }

  return response.json();
}

/**
 * Create a new live stream for a booking
 *
 * @param bookingId - The booking ID to associate with this stream
 * @returns Stream key and playback ID
 */
export async function createLiveStream(bookingId: string): Promise<{
  streamId: string;
  streamKey: string;
  playbackId: string;
}> {
  const response = await muxRequest<MuxLiveStreamResponse>("/video/v1/live-streams", {
    method: "POST",
    body: JSON.stringify({
      playback_policy: ["public"],
      new_asset_settings: {
        playback_policies: ["public"],
      },
      // Low latency mode for real-time streaming
      latency_mode: "low",
      // Allow reconnection within 60 seconds
      reconnect_window: 60,
      // Max stream duration: 8 hours
      max_continuous_duration: 28800,
      // Pass booking ID as passthrough for identification
      passthrough: bookingId,
    }),
  });

  const { data } = response;

  if (!data.playback_ids || data.playback_ids.length === 0) {
    throw new Error("Failed to create live stream: No playback ID returned");
  }

  return {
    streamId: data.id,
    streamKey: data.stream_key,
    playbackId: data.playback_ids[0].id,
  };
}

/**
 * End a live stream
 *
 * @param streamId - The Mux stream ID
 */
export async function endLiveStream(streamId: string): Promise<void> {
  // Signal the stream to complete - this triggers asset creation
  await muxRequest(`/video/v1/live-streams/${streamId}/complete`, {
    method: "PUT",
  });
}

/**
 * Disable a live stream (prevents further streaming)
 *
 * @param streamId - The Mux stream ID
 */
export async function disableLiveStream(streamId: string): Promise<void> {
  await muxRequest(`/video/v1/live-streams/${streamId}/disable`, {
    method: "PUT",
  });
}

/**
 * Get HLS playback URL for a stream
 *
 * @param playbackId - The Mux playback ID
 * @returns The HLS playback URL
 */
export function getPlaybackUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

/**
 * Get thumbnail URL for a stream
 *
 * @param playbackId - The Mux playback ID
 * @param options - Thumbnail options
 * @returns The thumbnail URL
 */
export function getThumbnailUrl(
  playbackId: string,
  options?: {
    width?: number;
    height?: number;
    time?: number;
  }
): string {
  const params = new URLSearchParams();
  if (options?.width) params.set("width", options.width.toString());
  if (options?.height) params.set("height", options.height.toString());
  if (options?.time) params.set("time", options.time.toString());

  const queryString = params.toString();
  return `https://image.mux.com/${playbackId}/thumbnail.png${queryString ? `?${queryString}` : ""}`;
}

/**
 * Get the status of a live stream
 *
 * @param streamId - The Mux stream ID
 * @returns Stream status information
 */
export async function getStreamStatus(streamId: string): Promise<{
  status: "idle" | "active" | "disabled";
  isLive: boolean;
  playbackId: string | null;
  recentAssetIds: string[];
}> {
  const response = await muxRequest<MuxLiveStreamResponse>(
    `/video/v1/live-streams/${streamId}`
  );

  const { data } = response;

  return {
    status: data.status,
    isLive: data.status === "active",
    playbackId: data.playback_ids?.[0]?.id ?? null,
    recentAssetIds: data.recent_asset_ids ?? [],
  };
}

/**
 * Get live stream details including viewer count estimate
 *
 * @param streamId - The Mux stream ID
 * @returns Stream details
 */
export async function getLiveStreamDetails(streamId: string): Promise<{
  streamId: string;
  status: "idle" | "active" | "disabled";
  isLive: boolean;
  playbackId: string | null;
  playbackUrl: string | null;
}> {
  const status = await getStreamStatus(streamId);

  return {
    streamId,
    status: status.status,
    isLive: status.isLive,
    playbackId: status.playbackId,
    playbackUrl: status.playbackId ? getPlaybackUrl(status.playbackId) : null,
  };
}

/**
 * Get recording asset details after stream ends
 *
 * @param assetId - The Mux asset ID
 * @returns Asset details including playback URL
 */
export async function getRecordingAsset(assetId: string): Promise<{
  assetId: string;
  status: string;
  playbackId: string | null;
  playbackUrl: string | null;
  duration: number | null;
}> {
  const response = await muxRequest<MuxAssetResponse>(
    `/video/v1/assets/${assetId}`
  );

  const { data } = response;
  const playbackId = data.playback_ids?.[0]?.id ?? null;

  return {
    assetId: data.id,
    status: data.status,
    playbackId,
    playbackUrl: playbackId ? getPlaybackUrl(playbackId) : null,
    duration: data.duration ?? null,
  };
}

/**
 * Delete a live stream
 *
 * @param streamId - The Mux stream ID
 */
export async function deleteLiveStream(streamId: string): Promise<void> {
  await muxRequest(`/video/v1/live-streams/${streamId}`, {
    method: "DELETE",
  });
}

/**
 * Get RTMP ingest endpoint for streaming
 * This is the URL workers connect to for broadcasting
 */
export function getRtmpIngestUrl(): string {
  return "rtmps://global-live.mux.com:443/app";
}

/**
 * Generate the full RTMP URL with stream key
 *
 * @param streamKey - The stream key from createLiveStream
 * @returns Full RTMP URL for broadcasting
 */
export function getFullRtmpUrl(streamKey: string): string {
  return `${getRtmpIngestUrl()}/${streamKey}`;
}
