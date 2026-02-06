"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, MessageSquare } from "lucide-react";
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

    // Show toast notification
    toast.message(`New message from ${message.sender.firstName}`, {
      description: message.content.length > 50
        ? message.content.substring(0, 50) + "..."
        : message.content,
      action: {
        label: "View",
        onClick: () => {
          window.location.href = `/messages/${message.senderId}`;
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

  // Clear count when dropdown opens
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
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
              <DropdownMenuItem key={message.id} asChild>
                <Link
                  href={`/messages/${message.senderId}`}
                  className="flex items-start gap-3 p-3 cursor-pointer"
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
                </Link>
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
