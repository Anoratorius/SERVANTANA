"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { Send, Bot, User, Loader2, Sparkles, ExternalLink, ArrowLeft } from "lucide-react";

interface SuggestedAction {
  label: string;
  type: "navigate" | "message";
  url?: string;
  message?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  suggestedActions?: SuggestedAction[];
}

export default function AIChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm your Servantana AI assistant. I can help you find services, answer questions about bookings, recommend service providers, and more. What can I help you with today?",
      timestamp: new Date(),
      suggestedActions: [
        { label: "Find a worker", type: "message", message: "I need to find a worker" },
        { label: "Get a price estimate", type: "navigate", url: "/ai/estimate" },
        { label: "Browse services", type: "navigate", url: "/search" },
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  let idCounter = useRef(0);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const generateId = () => {
    idCounter.current += 1;
    return `msg-${Date.now()}-${idCounter.current}`;
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          conversationHistory,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.details || data.error || "Failed to get response");
      }

      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
        suggestedActions: data.suggestedActions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content: `I'm sorry, I encountered an error: ${errorMsg}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedAction = (action: SuggestedAction) => {
    if (action.type === "navigate" && action.url) {
      router.push(action.url);
    } else if (action.type === "message" && action.message) {
      sendMessage(action.message);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-gray-50 dark:bg-gray-900">
      {/* Sub-header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-950 border-b px-4 py-3">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-10 w-10 shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
              <Bot className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="font-semibold">AI Assistant</h1>
              <p className="text-sm text-muted-foreground">
                Powered by Claude AI
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages - scrollable area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="container mx-auto max-w-3xl px-4 py-2">
          <div className="space-y-2">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-purple-100 dark:bg-purple-900">
                          <Sparkles className="h-4 w-4 text-purple-600" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[80%] ${
                        message.role === "user" ? "order-first" : ""
                      }`}
                    >
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-gray-100 dark:bg-gray-800 rounded-bl-sm"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>

                      {message.suggestedActions && message.suggestedActions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {message.suggestedActions.map((action, i) => (
                            <Button
                              key={i}
                              variant="outline"
                              size="sm"
                              onClick={() => handleSuggestedAction(action)}
                              className="text-xs gap-1"
                            >
                              {action.label}
                              {action.type === "navigate" && (
                                <ExternalLink className="h-3 w-3" />
                              )}
                            </Button>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground mt-1">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {message.role === "user" && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-purple-100 dark:bg-purple-900">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}

                {/* Scroll anchor */}
                <div ref={messagesEndRef} className="h-2" />
              </div>
            </div>
          </div>

      {/* Input - fixed at bottom */}
      <div className="flex-shrink-0 border-t bg-white dark:bg-gray-950 px-4 py-3">
        <div className="container mx-auto max-w-3xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={!input.trim() || isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
