"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, MessageCircle, Loader2, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useMessageStream, StreamMessage } from "@/hooks/useMessageStream";
import { trackMessageSend } from "@/lib/event-tracking";

interface Message {
  id: string;
  senderId: string;
  content: string;
  read: boolean;
  createdAt: string;
  sender: {
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
}

interface BookingChatProps {
  bookingId: string;
}

export function BookingChat({ bookingId }: BookingChatProps) {
  const t = useTranslations("chat");
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());

  // Handle new messages from SSE stream
  const handleNewStreamMessage = useCallback((streamMessage: StreamMessage) => {
    // Only add if not already in the list
    if (!messageIdsRef.current.has(streamMessage.id)) {
      messageIdsRef.current.add(streamMessage.id);
      setMessages((prev) => {
        // Double-check for duplicates
        if (prev.some((m) => m.id === streamMessage.id)) {
          return prev;
        }
        return [
          ...prev,
          {
            id: streamMessage.id,
            senderId: streamMessage.senderId,
            content: streamMessage.content,
            read: streamMessage.read,
            createdAt: streamMessage.createdAt,
            sender: {
              firstName: streamMessage.sender.firstName,
              lastName: streamMessage.sender.lastName,
              avatar: streamMessage.sender.avatar,
            },
          },
        ];
      });
    }
  }, []);

  // Subscribe to real-time message stream for this booking
  const { isConnected, error: streamError } = useMessageStream({
    bookingId,
    onNewMessage: handleNewStreamMessage,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch initial messages (only once on mount)
  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/chat`);
      if (response.ok) {
        const data = await response.json();
        // Track existing message IDs
        const fetchedMessages = data.messages as Message[];
        fetchedMessages.forEach((m) => messageIdsRef.current.add(m.id));
        setMessages(fetchedMessages);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  // Fetch messages on mount only (no polling - SSE handles real-time)
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        const sentMessage = data.message as Message;
        // Track the sent message ID to avoid duplicate from SSE
        messageIdsRef.current.add(sentMessage.id);
        setMessages((prev) => [...prev, sentMessage]);
        setNewMessage("");
        inputRef.current?.focus();
      } else {
        const error = await response.json();
        toast.error(error.error || t("sendError"));
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(t("sendError"));
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t("today");
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t("yesterday");
    }
    return date.toLocaleDateString();
  };

  // Group messages by date
  const groupedMessages = messages.reduce(
    (groups, message) => {
      const date = new Date(message.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
      return groups;
    },
    {} as Record<string, Message[]>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-12 w-1/2 ml-auto" />
            <Skeleton className="h-12 w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {t("title")}
          </CardTitle>
          {/* Real-time connection indicator */}
          <div
            className="flex items-center gap-1.5 text-xs"
            title={isConnected ? "Real-time updates active" : streamError || "Connecting..."}
          >
            {isConnected ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-green-500" />
                <span className="text-green-600 dark:text-green-400 hidden sm:inline">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-yellow-500" />
                <span className="text-yellow-600 dark:text-yellow-400 hidden sm:inline">
                  {streamError ? "Reconnecting" : "Connecting"}
                </span>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Messages container */}
        <div className="h-80 overflow-y-auto mb-4 space-y-4 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>{t("noMessages")}</p>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-4">
                  <span className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                    {formatDate(dateMessages[0].createdAt)}
                  </span>
                </div>
                {/* Messages for this date */}
                {dateMessages.map((message) => {
                  const isOwn = message.senderId === session?.user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg px-4 py-2 ${
                          isOwn
                            ? "bg-blue-600 text-white"
                            : "bg-white dark:bg-gray-800 border"
                        }`}
                      >
                        {!isOwn && (
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            {message.sender.firstName}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        <p
                          className={`text-xs mt-1 ${
                            isOwn ? "text-blue-200" : "text-gray-400"
                          }`}
                        >
                          {formatTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message input */}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={t("placeholder")}
            maxLength={2000}
            disabled={isSending}
            className="flex-1"
          />
          <Button type="submit" disabled={!newMessage.trim() || isSending}>
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
