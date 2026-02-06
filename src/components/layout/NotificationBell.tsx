"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Send, Loader2, ArrowLeft, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useMessageStream, StreamMessage } from "@/hooks/useMessageStream";

interface RecentMessage {
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

export function NotificationBell() {
  const { data: session, status } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Quick reply state
  const [selectedMessage, setSelectedMessage] = useState<RecentMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle new messages from SSE
  const handleNewMessage = useCallback((message: StreamMessage) => {
    // Increment unread count
    setUnreadCount((prev) => prev + 1);

    // Add to recent messages (keep last 5)
    setRecentMessages((prev) => {
      const updated = [
        {
          id: message.id,
          content: message.content,
          createdAt: message.createdAt,
          senderId: message.senderId,
          sender: message.sender,
        },
        ...prev,
      ].slice(0, 5);
      return updated;
    });

    // Show toast notification with quick reply
    toast.message(`New message from ${message.sender.firstName}`, {
      description: message.content.length > 50
        ? message.content.substring(0, 50) + "..."
        : message.content,
      action: {
        label: "Reply",
        onClick: () => {
          setSelectedMessage({
            id: message.id,
            content: message.content,
            createdAt: message.createdAt,
            senderId: message.senderId,
            sender: message.sender,
          });
          setIsOpen(true);
        },
      },
    });
  }, []);

  // Connect to SSE stream
  useMessageStream({
    onNewMessage: handleNewMessage,
  });

  // Fetch initial unread count
  useEffect(() => {
    if (status !== "authenticated") return;

    async function fetchUnreadCount() {
      try {
        const response = await fetch("/api/messages");
        if (response.ok) {
          const data = await response.json();
          const total = data.conversations?.reduce(
            (sum: number, c: { unreadCount: number }) => sum + c.unreadCount,
            0
          ) || 0;
          setUnreadCount(total);

          // Get recent unread messages for dropdown
          const recent: RecentMessage[] = [];
          for (const conv of data.conversations || []) {
            if (conv.unreadCount > 0 && recent.length < 5) {
              recent.push({
                id: conv.lastMessage.id,
                content: conv.lastMessage.content,
                createdAt: conv.lastMessage.createdAt,
                senderId: conv.partnerId,
                sender: conv.partner,
              });
            }
          }
          setRecentMessages(recent);
        }
      } catch (error) {
        console.error("Failed to fetch unread count:", error);
      }
    }

    fetchUnreadCount();
  }, [status]);

  // Focus input when selecting a message
  useEffect(() => {
    if (selectedMessage && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [selectedMessage]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset state when closing
      setSelectedMessage(null);
      setReplyText("");
    }
  };

  const handleSelectMessage = (message: RecentMessage) => {
    setSelectedMessage(message);
  };

  const handleBack = () => {
    setSelectedMessage(null);
    setReplyText("");
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedMessage || isSending) return;

    setIsSending(true);
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selectedMessage.senderId,
          content: replyText.trim(),
        }),
      });

      if (response.ok) {
        toast.success("Reply sent!");
        setReplyText("");

        // Remove from recent messages and decrease unread count
        setRecentMessages((prev) =>
          prev.filter((m) => m.senderId !== selectedMessage.senderId)
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));

        // Go back to list
        setSelectedMessage(null);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to send reply");
      }
    } catch {
      toast.error("Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  if (status !== "authenticated") {
    return null;
  }

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
        {selectedMessage ? (
          // Quick Reply View
          <div className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-sm">
                Reply to {selectedMessage.sender.firstName}
              </span>
            </div>

            {/* Original message */}
            <div className="bg-muted rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={selectedMessage.sender.avatar || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-green-500 text-white text-xs">
                    {selectedMessage.sender.firstName[0]}{selectedMessage.sender.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {selectedMessage.sender.firstName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(selectedMessage.createdAt)}
                </span>
              </div>
              <p className="text-sm">{selectedMessage.content}</p>
            </div>

            {/* Reply input */}
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your reply..."
                disabled={isSending}
                className="flex-1"
              />
              <Button
                size="icon"
                onClick={handleSendReply}
                disabled={!replyText.trim() || isSending}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Link to full conversation */}
            <Link
              href={`/messages/${selectedMessage.senderId}`}
              className="block text-center text-xs text-blue-600 hover:underline mt-3"
              onClick={() => setIsOpen(false)}
            >
              Open full conversation
            </Link>
          </div>
        ) : (
          // Messages List View
          <>
            <div className="flex items-center justify-between p-2">
              <span className="font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} unread
                </Badge>
              )}
            </div>
            <DropdownMenuSeparator />

            {recentMessages.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No new notifications
              </div>
            ) : (
              <>
                {recentMessages.map((message) => (
                  <DropdownMenuItem
                    key={message.id}
                    className="flex items-start gap-3 p-3 cursor-pointer"
                    onClick={() => handleSelectMessage(message)}
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={message.sender.avatar || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-green-500 text-white text-sm">
                        {message.sender.firstName[0]}{message.sender.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {message.sender.firstName} {message.sender.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {message.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                    <MessageSquare className="h-4 w-4 text-blue-500 shrink-0" />
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href="/messages"
                    className="w-full text-center text-sm text-blue-600 hover:text-blue-700 cursor-pointer justify-center"
                  >
                    View all messages
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString();
}
