"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Send, Loader2, ArrowLeft, MessageSquare, X } from "lucide-react";
import { toast } from "sonner";
import { useMessageStream, StreamMessage } from "@/hooks/useMessageStream";

interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
}

interface Conversation {
  partnerId: string;
  partner: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
  lastMessage: Message;
  unreadCount: number;
}

export function NotificationBell() {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Chat state
  const [selectedPartner, setSelectedPartner] = useState<Conversation["partner"] | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // openChat must be defined before handleNewMessage since it's used in the callback
  const openChat = useCallback(async (partner: Conversation["partner"]) => {
    setSelectedPartner(partner);
    setIsLoadingChat(true);

    try {
      // Fetch chat history
      const response = await fetch(`/api/messages/${partner.id}`);
      if (response.ok) {
        const data = await response.json();
        setChatMessages(data.messages || []);

        // Update unread count
        setConversations((prevConvs) => {
          const conv = prevConvs.find(c => c.partnerId === partner.id);
          if (conv && conv.unreadCount > 0) {
            setUnreadCount((prev) => Math.max(0, prev - conv.unreadCount));
            return prevConvs.map(c =>
              c.partnerId === partner.id ? { ...c, unreadCount: 0 } : c
            );
          }
          return prevConvs;
        });
      }
    } catch (error) {
      console.error("Failed to load chat:", error);
    } finally {
      setIsLoadingChat(false);
    }
  }, []);

  // Handle new messages from SSE
  const handleNewMessage = useCallback((message: StreamMessage) => {
    const newMsg: Message = {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      senderId: message.senderId,
      sender: message.sender,
    };

    // If we're in a chat with this sender, add the message
    if (selectedPartner && message.senderId === selectedPartner.id) {
      setChatMessages((prev) => {
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, newMsg];
      });
      // Mark as read since we're viewing the chat
      fetch(`/api/messages/${message.senderId}/read`, { method: "POST" });
    } else {
      // Not viewing this chat, increment unread
      setUnreadCount((prev) => prev + 1);

      // Update conversations list
      setConversations((prev) => {
        const existingIndex = prev.findIndex(c => c.partnerId === message.senderId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            lastMessage: newMsg,
            unreadCount: updated[existingIndex].unreadCount + 1,
          };
          // Move to top
          const [item] = updated.splice(existingIndex, 1);
          return [item, ...updated];
        }
        // New conversation
        return [{
          partnerId: message.senderId,
          partner: message.sender,
          lastMessage: newMsg,
          unreadCount: 1,
        }, ...prev];
      });

      // Show toast
      toast.message(`${t("messages.newMessageFrom")} ${message.sender.firstName}`, {
        description: message.content.length > 50
          ? message.content.substring(0, 50) + "..."
          : message.content,
        duration: 5000,
        action: {
          label: t("messages.reply"),
          onClick: () => {
            openChat({
              id: message.senderId,
              firstName: message.sender.firstName,
              lastName: message.sender.lastName,
              avatar: message.sender.avatar,
            });
            setIsOpen(true);
          },
        },
      });
    }
  }, [selectedPartner, t, openChat]);

  // Connect to SSE stream
  useMessageStream({
    onNewMessage: handleNewMessage,
  });

  // Fetch conversations on mount
  useEffect(() => {
    if (status !== "authenticated") return;

    async function fetchConversations() {
      try {
        const response = await fetch("/api/messages");
        if (response.ok) {
          const data = await response.json();
          const convs = data.conversations || [];
          setConversations(convs);

          const total = convs.reduce(
            (sum: number, c: Conversation) => sum + c.unreadCount,
            0
          );
          setUnreadCount(total);
        }
      } catch (error) {
        console.error("Failed to fetch conversations:", error);
      }
    }

    fetchConversations();
  }, [status]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Focus input when chat opens
  useEffect(() => {
    if (selectedPartner && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [selectedPartner]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSelectedPartner(null);
      setChatMessages([]);
      setReplyText("");
    }
  };

  const handleBack = () => {
    setSelectedPartner(null);
    setChatMessages([]);
    setReplyText("");
  };

  const handleDismiss = async (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      await fetch(`/api/messages/${conv.partnerId}/read`, { method: "POST" });
      setUnreadCount((prev) => Math.max(0, prev - conv.unreadCount));
      setConversations((prev) =>
        prev.map(c =>
          c.partnerId === conv.partnerId ? { ...c, unreadCount: 0 } : c
        )
      );
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!replyText.trim() || !selectedPartner || isSending) return;

    const content = replyText.trim();
    setIsSending(true);
    setReplyText("");

    // Optimistically add message
    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      id: tempId,
      content,
      createdAt: new Date().toISOString(),
      senderId: session?.user?.id || "",
      sender: {
        id: session?.user?.id || "",
        firstName: session?.user?.firstName || "",
        lastName: session?.user?.lastName || "",
        avatar: session?.user?.image || null,
      },
    };
    setChatMessages((prev) => [...prev, tempMessage]);

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selectedPartner.id,
          content,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Replace temp message with real one
        setChatMessages((prev) =>
          prev.map(m => m.id === tempId ? { ...data.message, sender: tempMessage.sender } : m)
        );
      } else {
        // Remove temp message on error
        setChatMessages((prev) => prev.filter(m => m.id !== tempId));
        toast.error("Failed to send message");
      }
    } catch {
      setChatMessages((prev) => prev.filter(m => m.id !== tempId));
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (status !== "authenticated") {
    return null;
  }

  const unreadConversations = conversations.filter(c => c.unreadCount > 0);

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white border-2 border-white"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {selectedPartner ? (
          // Mini Chat View
          <div className="flex flex-col h-96">
            {/* Chat Header */}
            <div className="flex items-center gap-2 p-2 border-b">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarImage src={selectedPartner.avatar || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-green-500 text-white text-xs">
                  {selectedPartner.firstName[0]}{selectedPartner.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-sm flex-1">
                {selectedPartner.firstName} {selectedPartner.lastName}
              </span>
              <Link
                href={`/messages/${selectedPartner.id}`}
                className="text-xs text-blue-600 hover:underline"
                onClick={() => setIsOpen(false)}
              >
                {t("messages.fullChat")}
              </Link>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {isLoadingChat ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  {t("messages.noMessages")}
                </div>
              ) : (
                <>
                  {chatMessages.slice(-20).map((msg) => {
                    const isMe = msg.senderId === session?.user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                            isMe
                              ? "bg-blue-500 text-white"
                              : "bg-muted"
                          }`}
                        >
                          <p className="break-words">{msg.content}</p>
                          <p className={`text-xs mt-1 ${isMe ? "text-blue-100" : "text-muted-foreground"}`}>
                            {formatTime(msg.createdAt, t)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="p-2 border-t">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t("messages.placeholder")}
                  disabled={isSending}
                  className="flex-1 h-9"
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!replyText.trim() || isSending}
                  className="bg-blue-500 hover:bg-blue-600 h-9 w-9"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Notifications List View
          <>
            <div className="flex items-center justify-between p-2">
              <span className="font-semibold">{t("messages.title")}</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} {t("messages.unread")}
                </Badge>
              )}
            </div>
            <DropdownMenuSeparator />

            <div className="max-h-80 overflow-y-auto">
              {unreadConversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  {t("messages.noNewMessages")}
                </div>
              ) : (
                unreadConversations.map((conv) => (
                  <div
                    key={conv.partnerId}
                    className="flex items-start gap-3 p-3 cursor-pointer hover:bg-accent rounded-md mx-1 my-1 group"
                    onClick={() => openChat(conv.partner)}
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={conv.partner.avatar || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-green-500 text-white text-sm">
                        {conv.partner.firstName[0]}{conv.partner.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {conv.partner.firstName} {conv.partner.lastName}
                        </p>
                        {conv.unreadCount > 0 && (
                          <Badge className="h-5 w-5 p-0 flex items-center justify-center text-xs bg-blue-500">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.lastMessage.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(conv.lastMessage.createdAt, t)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={(e) => handleDismiss(conv, e)}
                        title={t("messages.markAsRead")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <DropdownMenuSeparator />
            <Link
              href="/messages"
              className="block w-full text-center text-sm text-blue-600 hover:text-blue-700 p-2 hover:bg-accent rounded-md"
              onClick={() => setIsOpen(false)}
            >
              {t("messages.viewAllMessages")}
            </Link>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatTime(dateString: string, t: (key: string) => string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return t("messages.justNow");
  if (diffMins < 60) return `${diffMins}${t("messages.minutesAgo")}`;
  if (diffHours < 24) return `${diffHours}${t("messages.hoursAgo")}`;

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
