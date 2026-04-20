"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useSession } from "next-auth/react";

// Heartbeat interval (30 seconds)
const HEARTBEAT_INTERVAL = 30000;

// Typing debounce (stop typing after 2 seconds of inactivity)
const TYPING_DEBOUNCE = 2000;

interface UsePresenceOptions {
  enabled?: boolean;
}

interface PresenceData {
  userId: string;
  online: boolean;
  lastSeen: string;
}

/**
 * Hook to maintain user's online presence via heartbeat
 */
export function usePresenceHeartbeat(options: UsePresenceOptions = {}) {
  const { enabled = true } = options;
  const { status: authStatus } = useSession();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || authStatus !== "authenticated") {
      return;
    }

    // Send initial heartbeat
    const sendHeartbeat = async () => {
      try {
        await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
      } catch (error) {
        console.error("Heartbeat failed:", error);
      }
    };

    sendHeartbeat();

    // Set up interval for heartbeats
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Send logout on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Best effort logout notification
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
        keepalive: true, // Allows request to complete even after page unload
      }).catch(() => {});
    };
  }, [enabled, authStatus]);
}

/**
 * Hook to check online status of specific users
 */
export function useOnlineStatus(userIds: string[]) {
  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceData>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);

  const checkPresence = useCallback(async () => {
    if (userIds.length === 0) {
      setPresenceMap(new Map());
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/presence?userIds=${userIds.join(",")}`
      );
      if (response.ok) {
        const data = await response.json();
        const map = new Map<string, PresenceData>();
        data.presence?.forEach((p: PresenceData) => {
          map.set(p.userId, p);
        });
        setPresenceMap(map);
      }
    } catch (error) {
      console.error("Failed to check presence:", error);
    } finally {
      setLoading(false);
    }
  }, [userIds]);

  useEffect(() => {
    checkPresence();

    // Refresh every 30 seconds
    const interval = setInterval(checkPresence, 30000);
    return () => clearInterval(interval);
  }, [checkPresence]);

  const isOnline = useCallback(
    (userId: string) => presenceMap.get(userId)?.online ?? false,
    [presenceMap]
  );

  return {
    presenceMap,
    isOnline,
    loading,
    refresh: checkPresence,
  };
}

/**
 * Hook to manage typing indicator for a conversation
 */
export function useTypingIndicator(conversationId: string | null) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Send typing status
  const setTyping = useCallback(
    async (isTyping: boolean) => {
      if (!conversationId) return;

      // Debounce stop typing
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (isTyping) {
        // Only send if not already typing
        if (!isTypingRef.current) {
          isTypingRef.current = true;
          try {
            await fetch("/api/presence", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "typing",
                conversationId,
                isTyping: true,
              }),
            });
          } catch (error) {
            console.error("Failed to set typing:", error);
          }
        }

        // Auto-stop after debounce period
        typingTimeoutRef.current = setTimeout(() => {
          setTyping(false);
        }, TYPING_DEBOUNCE);
      } else {
        isTypingRef.current = false;
        try {
          await fetch("/api/presence", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "typing",
              conversationId,
              isTyping: false,
            }),
          });
        } catch (error) {
          console.error("Failed to clear typing:", error);
        }
      }
    },
    [conversationId]
  );

  // Poll for typing users
  useEffect(() => {
    if (!conversationId) {
      setTypingUsers([]);
      return;
    }

    const checkTyping = async () => {
      try {
        const response = await fetch(
          `/api/presence?conversationId=${conversationId}`
        );
        if (response.ok) {
          const data = await response.json();
          setTypingUsers(data.typingUsers || []);
        }
      } catch (error) {
        console.error("Failed to check typing:", error);
      }
    };

    checkTyping();
    const interval = setInterval(checkTyping, 2000);

    return () => {
      clearInterval(interval);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId]);

  return {
    typingUsers,
    setTyping,
    isAnyoneTyping: typingUsers.length > 0,
  };
}
