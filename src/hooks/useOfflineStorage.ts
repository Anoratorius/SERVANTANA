"use client";

import { useState, useEffect, useCallback } from "react";

interface OfflineStorageOptions {
  key: string;
  ttl?: number; // Time to live in milliseconds (default: 24 hours)
}

interface CachedData<T> {
  data: T;
  timestamp: number;
}

interface OfflineStorageResult<T> {
  data: T | null;
  isOffline: boolean;
  isFromCache: boolean;
  lastSynced: Date | null;
  saveToCache: (data: T) => void;
  clearCache: () => void;
}

export function useOfflineStorage<T>({
  key,
  ttl = 24 * 60 * 60 * 1000, // 24 hours default
}: OfflineStorageOptions): OfflineStorageResult<T> {
  const [isOffline, setIsOffline] = useState(false);
  const [cachedData, setCachedData] = useState<CachedData<T> | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  // Check online status
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOffline(!navigator.onLine);
    };

    // Set initial status
    updateOnlineStatus();

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  // Load cached data on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`offline_${key}`);
      if (stored) {
        const parsed: CachedData<T> = JSON.parse(stored);
        const isExpired = Date.now() - parsed.timestamp > ttl;

        if (!isExpired) {
          setCachedData(parsed);
        } else {
          // Clear expired data
          localStorage.removeItem(`offline_${key}`);
        }
      }
    } catch (error) {
      console.error("Error loading cached data:", error);
    }
  }, [key, ttl]);

  // Save data to cache
  const saveToCache = useCallback((data: T) => {
    try {
      const cacheEntry: CachedData<T> = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(`offline_${key}`, JSON.stringify(cacheEntry));
      setCachedData(cacheEntry);
      setIsFromCache(false);
    } catch (error) {
      console.error("Error saving to cache:", error);
    }
  }, [key]);

  // Clear cache
  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(`offline_${key}`);
      setCachedData(null);
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  }, [key]);

  // Determine if we should use cached data
  useEffect(() => {
    if (isOffline && cachedData) {
      setIsFromCache(true);
    } else {
      setIsFromCache(false);
    }
  }, [isOffline, cachedData]);

  return {
    data: cachedData?.data ?? null,
    isOffline,
    isFromCache,
    lastSynced: cachedData ? new Date(cachedData.timestamp) : null,
    saveToCache,
    clearCache,
  };
}

// Hook specifically for bookings with online/offline status
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);

    updateStatus();

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  return isOnline;
}
