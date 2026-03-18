"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Mic,
  MicOff,
  Send,
  X,
  Loader2,
  Sparkles,
  MessageCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface SearchParams {
  ready: boolean;
  serviceType?: string;
  location?: string;
  date?: string;
  duration?: number;
}

interface VoiceAssistantProps {
  onSearchParams: (params: SearchParams) => void;
  locale: string;
}

// Translations
const translations = {
  en: {
    title: "AI Assistant",
    subtitle: "Speak or type to find a cleaner",
    greeting: "Hi! I'll help you find the perfect cleaning service. What are you looking for? You can type or use the microphone.",
    placeholder: "Describe what you need...",
    listening: "Listening...",
    error: "Sorry, there was an error. Please try again.",
    micNotSupported: "Voice input not supported in this browser. Please use Chrome or Edge.",
    micPermissionDenied: "Microphone permission denied. Please allow microphone access.",
    micError: "Could not access microphone. Please try again.",
    searchingText: "Searching for cleaners...",
  },
  de: {
    title: "KI-Assistent",
    subtitle: "Sprechen oder tippen Sie, um einen Reiniger zu finden",
    greeting: "Hallo! Ich helfe Ihnen, den perfekten Reinigungsservice zu finden. Was suchen Sie? Sie können tippen oder das Mikrofon verwenden.",
    placeholder: "Beschreiben Sie, was Sie brauchen...",
    listening: "Ich höre zu...",
    error: "Entschuldigung, es gab einen Fehler. Bitte versuchen Sie es erneut.",
    micNotSupported: "Spracheingabe wird in diesem Browser nicht unterstützt. Bitte verwenden Sie Chrome oder Edge.",
    micPermissionDenied: "Mikrofonberechtigung verweigert. Bitte erlauben Sie den Mikrofonzugriff.",
    micError: "Konnte nicht auf das Mikrofon zugreifen. Bitte versuchen Sie es erneut.",
    searchingText: "Suche nach Reinigern...",
  },
};

export function VoiceAssistant({ onSearchParams, locale }: VoiceAssistantProps) {
  const t = translations[locale as keyof typeof translations] || translations.en;

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Check for speech recognition support
  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognitionClass);
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize with greeting when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ role: "assistant", content: t.greeting }]);
    }
  }, [isOpen, messages.length, t.greeting]);

  const startListening = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      toast.error(t.micNotSupported);
      return;
    }

    // Check microphone permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream after permission check
    } catch (err) {
      console.error("Microphone permission error:", err);
      toast.error(t.micPermissionDenied);
      return;
    }

    const recognition = new SpeechRecognitionClass() as SpeechRecognitionInstance;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = locale === "de" ? "de-DE" : "en-US";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      setIsListening(false);
      // Auto-send after voice input
      handleSend(transcript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);

      if (event.error === "not-allowed") {
        toast.error(t.micPermissionDenied);
      } else if (event.error === "no-speech") {
        // User didn't speak, just silently stop
      } else {
        toast.error(t.micError);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error("Failed to start recognition:", err);
      toast.error(t.micError);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      setIsListening(false);
    }
  };

  const handleSend = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = { role: "user", content: messageText };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.filter((m) => m.role !== "assistant" || newMessages.indexOf(m) > 0),
          locale,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();

      setMessages([
        ...newMessages,
        { role: "assistant", content: data.message },
      ]);

      // If search params are ready, trigger search
      if (data.searchParams?.ready) {
        setTimeout(() => {
          toast.success(t.searchingText);
          onSearchParams(data.searchParams);
          setIsOpen(false);
        }, 1500);
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages([
        ...newMessages,
        { role: "assistant", content: t.error },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const resetConversation = () => {
    setMessages([]);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 z-50"
        size="icon"
        title={t.title}
      >
        <Sparkles className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-[90vw] max-w-md shadow-2xl z-50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <span className="font-semibold">{t.title}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={resetConversation}
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-sm text-white/80 mt-1">{t.subtitle}</p>
      </div>

      {/* Messages */}
      <CardContent className="p-0">
        <div className="h-[300px] overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2",
                  message.role === "user"
                    ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white"
                    : "bg-white shadow-sm border"
                )}
              >
                {message.role === "assistant" && (
                  <MessageCircle className="h-4 w-4 text-purple-500 mb-1" />
                )}
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white shadow-sm border rounded-2xl px-4 py-3">
                <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t bg-white">
          {!isSupported && (
            <div className="flex items-center gap-2 text-amber-600 text-sm mb-3 p-2 bg-amber-50 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{t.micNotSupported}</span>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant={isListening ? "destructive" : "outline"}
              size="icon"
              onClick={isListening ? stopListening : startListening}
              disabled={isLoading || !isSupported}
              className={cn(
                "shrink-0",
                isListening && "animate-pulse",
                !isSupported && "opacity-50 cursor-not-allowed"
              )}
              title={isSupported ? (isListening ? "Stop" : "Start voice input") : t.micNotSupported}
            >
              {isListening ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.placeholder}
              disabled={isLoading || isListening}
              className="flex-1"
            />
            <Button
              onClick={() => handleSend()}
              disabled={!inputText.trim() || isLoading}
              size="icon"
              className="shrink-0 bg-gradient-to-r from-purple-500 to-blue-500"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
          {isListening && (
            <p className="text-center text-sm text-purple-600 mt-2 animate-pulse">
              {t.listening}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
