"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";

export interface StreamMessage {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  receiverId: string;
  read: boolean;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    role?: string;
  };
  receiver: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    role?: string;
  };
  booking?: {
    id: string;
    service: { name: string };
  } | null;
}

interface MessageEvent {
  type: "connected" | "new_message" | "message_read";
  message?: StreamMessage;
}

interface UseMessageStreamOptions {
  partnerId?: string;
  bookingId?: string;
  onNewMessage?: (message: StreamMessage) => void;
}

interface UseMessageStreamReturn {
  messages: StreamMessage[];
  isConnected: boolean;
  error: string | null;
  clearMessages: () => void;
}

const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useMessageStream(
  options: UseMessageStreamOptions = {}
): UseMessageStreamReturn {
  const { partnerId, bookingId, onNewMessage } = options;
  const { status: authStatus } = useSession();

  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  useEffect(() => {
    // Only connect when authenticated
    if (authStatus !== "authenticated") {
      return;
    }

    // Delay SSE connection to not block initial page load
    const initialDelay = setTimeout(() => {
      connect();
    }, 3000);

    function connect() {
      // Clean up existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource("/api/messages/stream");
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data: MessageEvent = JSON.parse(event.data);

          if (data.type === "connected") {
            // Connection established
            return;
          }

          if (data.type === "new_message" && data.message) {
            const message = data.message;

            // Filter by bookingId if provided
            if (bookingId) {
              if (message.booking?.id !== bookingId) {
                return;
              }
            }

            // Filter by partnerId if provided
            if (partnerId) {
              const isRelevant =
                message.senderId === partnerId ||
                message.receiverId === partnerId;
              if (!isRelevant) {
                return;
              }
            }

            // Add to messages list
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === message.id)) {
                return prev;
              }
              return [...prev, message];
            });

            // Call callback if provided
            if (onNewMessage) {
              onNewMessage(message);
            }
          }
        } catch (err) {
          console.error("Error parsing SSE message:", err);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();
        eventSourceRef.current = null;

        // Attempt reconnection
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1;
          setError(
            `Connection lost. Reconnecting... (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_DELAY);
        } else {
          setError(
            "Connection lost. Please refresh the page to reconnect."
          );
        }
      };
    }

    connect();

    // Cleanup on unmount
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
  }, [authStatus, partnerId, bookingId, onNewMessage]);

  return {
    messages,
    isConnected,
    error,
    clearMessages,
  };
}
