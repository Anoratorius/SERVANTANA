"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";

export interface TrackingUpdate {
  type: "connected" | "location_update" | "tracking_started" | "tracking_stopped" | "arrived";
  bookingId: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  estimatedArrival?: string | null;
  distanceKm?: number | null;
  timestamp?: number;
}

interface UseTrackingStreamOptions {
  bookingId: string;
  onLocationUpdate?: (update: TrackingUpdate) => void;
  onTrackingStatusChange?: (active: boolean) => void;
}

interface UseTrackingStreamReturn {
  isConnected: boolean;
  isTrackingActive: boolean;
  currentLocation: { latitude: number; longitude: number } | null;
  estimatedArrival: Date | null;
  distanceKm: number | null;
  error: string | null;
}

const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useTrackingStream(
  options: UseTrackingStreamOptions
): UseTrackingStreamReturn {
  const { bookingId, onLocationUpdate, onTrackingStatusChange } = options;
  const { status: authStatus } = useSession();

  const [isConnected, setIsConnected] = useState(false);
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [estimatedArrival, setEstimatedArrival] = useState<Date | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleUpdate = useCallback(
    (update: TrackingUpdate) => {
      switch (update.type) {
        case "location_update":
          if (update.location) {
            setCurrentLocation(update.location);
          }
          if (update.estimatedArrival) {
            setEstimatedArrival(new Date(update.estimatedArrival));
          }
          if (update.distanceKm !== undefined) {
            setDistanceKm(update.distanceKm);
          }
          if (onLocationUpdate) {
            onLocationUpdate(update);
          }
          break;

        case "tracking_started":
          setIsTrackingActive(true);
          if (onTrackingStatusChange) {
            onTrackingStatusChange(true);
          }
          break;

        case "tracking_stopped":
          setIsTrackingActive(false);
          setCurrentLocation(null);
          setEstimatedArrival(null);
          setDistanceKm(null);
          if (onTrackingStatusChange) {
            onTrackingStatusChange(false);
          }
          break;

        case "arrived":
          setDistanceKm(0);
          if (onLocationUpdate) {
            onLocationUpdate(update);
          }
          break;
      }
    },
    [onLocationUpdate, onTrackingStatusChange]
  );

  useEffect(() => {
    if (authStatus !== "authenticated" || !bookingId) {
      return;
    }

    function connect() {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource(
        `/api/bookings/${bookingId}/tracking/stream`
      );
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data: TrackingUpdate = JSON.parse(event.data);

          if (data.type === "connected") {
            return;
          }

          handleUpdate(data);
        } catch (err) {
          console.error("Error parsing tracking SSE:", err);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();
        eventSourceRef.current = null;

        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1;
          setError(
            `Connection lost. Reconnecting... (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_DELAY);
        } else {
          setError("Connection lost. Please refresh the page.");
        }
      };
    }

    // Small delay before connecting
    const initialDelay = setTimeout(() => {
      connect();
    }, 500);

    return () => {
      clearTimeout(initialDelay);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [authStatus, bookingId, handleUpdate]);

  return {
    isConnected,
    isTrackingActive,
    currentLocation,
    estimatedArrival,
    distanceKm,
    error,
  };
}
