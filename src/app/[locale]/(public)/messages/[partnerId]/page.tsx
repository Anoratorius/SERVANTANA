"use client";

import { useEffect, useState, useRef, use, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle,
  Star,
  Calendar,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import { useMessageStream, StreamMessage } from "@/hooks/useMessageStream";

interface Partner {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  role: string;
  workerProfile?: {
    verified: boolean;
    averageRating: number;
  } | null;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  read: boolean;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
  booking?: {
    id: string;
    service: { name: string };
    scheduledDate: string;
    status: string;
  } | null;
}

export default function ConversationPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = use(params);
  const t = useTranslations();
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [partner, setPartner] = useState<Partner | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle new messages from SSE stream
  const handleNewMessage = useCallback((streamMessage: StreamMessage) => {
    setMessages((prev) => {
      // Avoid duplicates
      if (prev.some((m) => m.id === streamMessage.id)) {
        return prev;
      }
      return [...prev, {
        id: streamMessage.id,
        content: streamMessage.content,
        createdAt: streamMessage.createdAt,
        senderId: streamMessage.senderId,
        read: streamMessage.read,
        sender: streamMessage.sender,
      }];
    });
  }, []);

  // SSE connection for real-time messages
  const { isConnected, error: streamError } = useMessageStream({
    partnerId,
    onNewMessage: handleNewMessage,
  });

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push(`/login?callbackUrl=/messages/${partnerId}`);
    }
  }, [authStatus, router, partnerId]);

  useEffect(() => {
    async function fetchMessages() {
      try {
        const response = await fetch(`/api/messages/${partnerId}`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages || []);
          setPartner(data.partner);
        } else if (response.status === 404) {
          router.push("/messages");
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (authStatus === "authenticated") {
      fetchMessages();
    }
  }, [authStatus, partnerId, router]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Show connection error as toast
  useEffect(() => {
    if (streamError) {
      toast.error(streamError);
    }
  }, [streamError]);

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: partnerId,
          content: newMessage.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [...prev, data.message]);
        setNewMessage("");
        textareaRef.current?.focus();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to send message");
      }
    } catch {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (authStatus === "loading" || isLoading) {
    return <ConversationSkeleton />;
  }

  if (!partner) {
    return null;
  }

  const partnerInitials = `${partner.firstName[0]}${partner.lastName[0]}`;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col bg-gray-50">
        {/* Conversation Header */}
        <div className="bg-white border-b sticky top-[73px] z-10">
          <div className="container mx-auto px-4 py-3 max-w-3xl">
            <div className="flex items-center gap-4">
              <Link href="/messages">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>

              <Link href={partner.role === "WORKER" ? `/cleaner/${partner.id}` : "#"}>
                <Avatar className="h-12 w-12">
                  <AvatarImage src={partner.avatar || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-green-500 text-white">
                    {partnerInitials}
                  </AvatarFallback>
                </Avatar>
              </Link>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">
                    {partner.firstName} {partner.lastName}
                  </h2>
                  {partner.workerProfile?.verified && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
                {partner.role === "WORKER" && partner.workerProfile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary" className="text-xs">Worker</Badge>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {partner.workerProfile.averageRating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span title={isConnected ? "Connected" : "Disconnected"}>
                  {isConnected ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </span>

                {partner.role === "WORKER" && (
                  <Link href={`/worker-profile/${partner.id}/book`}>
                    <Button size="sm" className="bg-gradient-to-r from-blue-500 to-blue-600">
                      <Calendar className="h-4 w-4 mr-1" />
                      Book
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-4 max-w-3xl">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No messages yet. Start the conversation!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => {
                  const isMe = message.senderId === session?.user?.id;
                  const showAvatar =
                    index === 0 ||
                    messages[index - 1].senderId !== message.senderId;
                  const messageDate = new Date(message.createdAt);

                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}
                    >
                      {!isMe && showAvatar ? (
                        <Avatar className="h-8 w-8 mt-1">
                          <AvatarImage src={message.sender.avatar || undefined} />
                          <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-green-500 text-white">
                            {message.sender.firstName[0]}
                            {message.sender.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                      ) : !isMe ? (
                        <div className="w-8" />
                      ) : null}

                      <div
                        className={`max-w-[75%] ${
                          isMe ? "items-end" : "items-start"
                        }`}
                      >
                        <Card
                          className={`${
                            isMe
                              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0"
                              : "bg-white"
                          }`}
                        >
                          <CardContent className="p-3">
                            <p className="whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                          </CardContent>
                        </Card>
                        <p
                          className={`text-xs text-muted-foreground mt-1 ${
                            isMe ? "text-right" : ""
                          }`}
                        >
                          {formatMessageTime(messageDate)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Message Input */}
        <div className="bg-white border-t">
          <div className="container mx-auto px-4 py-3 max-w-3xl">
            <div className="flex gap-3 items-end">
              <Textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("messages.placeholder")}
                className="min-h-[44px] max-h-32 resize-none"
                rows={1}
              />
              <Button
                onClick={handleSend}
                disabled={!newMessage.trim() || isSending}
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-11 px-4"
              >
                {isSending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function formatMessageTime(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ConversationSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col bg-gray-50">
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-3 max-w-3xl">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 container mx-auto px-4 py-4 max-w-3xl">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`flex gap-3 ${i % 2 === 0 ? "flex-row-reverse" : ""}`}
              >
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-16 w-48" />
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
