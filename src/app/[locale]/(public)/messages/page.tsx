"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, CheckCircle, Clock, Wifi, WifiOff, ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useMessageStream, StreamMessage } from "@/hooks/useMessageStream";

interface Conversation {
  partnerId: string;
  partner: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    role: string;
  };
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
    read: boolean;
  };
  unreadCount: number;
  booking: {
    id: string;
    service: { name: string };
  } | null;
}

export default function MessagesPage() {
  const t = useTranslations();
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Handle new messages from SSE - update conversation list
  const handleNewMessage = useCallback((message: StreamMessage) => {
    setConversations((prev) => {
      const partnerId = message.senderId;
      const existingIndex = prev.findIndex((c) => c.partnerId === partnerId);

      if (existingIndex >= 0) {
        // Update existing conversation and move to top
        const updated = [...prev];
        const existing = updated[existingIndex];
        updated.splice(existingIndex, 1);
        return [
          {
            ...existing,
            lastMessage: {
              id: message.id,
              content: message.content,
              createdAt: message.createdAt,
              senderId: message.senderId,
              read: message.read,
            },
            unreadCount: existing.unreadCount + 1,
          },
          ...updated,
        ];
      } else {
        // New conversation - add to top
        // Note: role defaults to empty string since SSE doesn't include it
        // The full conversation data will be fetched on page refresh
        return [
          {
            partnerId: message.senderId,
            partner: {
              ...message.sender,
              role: message.sender.role || "",
            },
            lastMessage: {
              id: message.id,
              content: message.content,
              createdAt: message.createdAt,
              senderId: message.senderId,
              read: message.read,
            },
            unreadCount: 1,
            booking: message.booking || null,
          },
          ...prev,
        ];
      }
    });
  }, []);

  // SSE connection for real-time updates
  const { isConnected } = useMessageStream({
    onNewMessage: handleNewMessage,
  });

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/messages");
    }
  }, [authStatus, router]);

  useEffect(() => {
    async function fetchConversations() {
      try {
        const response = await fetch("/api/messages");
        if (response.ok) {
          const data = await response.json();
          setConversations(data.conversations || []);
        }
      } catch (error) {
        console.error("Error fetching conversations:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (authStatus === "authenticated") {
      fetchConversations();
    }
  }, [authStatus]);

  if (authStatus === "loading" || isLoading) {
    return <MessagesPageSkeleton />;
  }

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          <Button variant="ghost" onClick={() => router.back()} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("common.back")}
          </Button>
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <MessageCircle className="h-12 w-12 text-blue-500" />
              <span title={isConnected ? "Real-time updates active" : "Connecting..."}>
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-muted-foreground" />
                )}
              </span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              {t("messages.title")}
            </h1>
            {totalUnread > 0 && (
              <Badge className="bg-red-500 text-white mt-2">
                {totalUnread} unread
              </Badge>
            )}
          </div>

          {conversations.length === 0 ? (
            <div className="text-center py-16">
              <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">{t("messages.noMessages")}</h2>
              <p className="text-muted-foreground mb-6">
                Start a conversation by messaging a worker from their profile
              </p>
              <Link href="/search">
                <Button className="bg-gradient-to-r from-blue-500 to-blue-600">
                  Find Workers
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((conversation) => {
                const { partner, lastMessage, unreadCount } = conversation;
                const initials = `${partner.firstName[0]}${partner.lastName[0]}`;
                const isFromMe = lastMessage.senderId === session?.user?.id;
                const messageDate = new Date(lastMessage.createdAt);

                return (
                  <Link key={partner.id} href={`/messages/${partner.id}`}>
                    <Card
                      className={`overflow-hidden hover:shadow-md transition-all cursor-pointer ${
                        unreadCount > 0 ? "border-l-4 border-l-blue-500 bg-blue-50/50" : ""
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <Avatar className="h-14 w-14">
                              <AvatarImage src={partner.avatar || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-green-500 text-white">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            {partner.role === "CLEANER" && (
                              <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5">
                                <CheckCircle className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className={`font-semibold truncate ${unreadCount > 0 ? "text-blue-600" : ""}`}>
                                {partner.firstName} {partner.lastName}
                              </h3>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatMessageTime(messageDate)}
                                </span>
                                {unreadCount > 0 && (
                                  <Badge className="bg-blue-500 text-white text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full">
                                    {unreadCount}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <p
                              className={`text-sm truncate mt-1 ${
                                unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                              }`}
                            >
                              {isFromMe && <span className="text-blue-500">You: </span>}
                              {lastMessage.content}
                            </p>

                            {partner.role === "CLEANER" && (
                              <Badge variant="secondary" className="mt-2 text-xs">
                                Worker
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function formatMessageTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function MessagesPageSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
