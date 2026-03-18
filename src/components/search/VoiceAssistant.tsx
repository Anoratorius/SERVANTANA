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
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
    micPermissionDenied: "Microphone permission denied.",
    micPermissionGranted: "Microphone access granted!",
    micError: "Could not access microphone. Please try again.",
    searchingText: "Searching for cleaners...",
    speakNow: "Speak now...",
    noSpeechDetected: "No speech detected. Please try again.",
    permissionNeededTitle: "Microphone Access Needed",
    permissionNeededDesc: "To use voice input, please allow microphone access in your browser.",
    permissionStep1: "Click the camera/microphone icon in your browser's address bar",
    permissionStep2: "Select \"Allow\" for microphone",
    permissionStep3: "Click the microphone button again",
    permissionAlt: "Or simply type your request below!",
    tryAgain: "Try Again",
    gotIt: "Got it",
  },
  de: {
    title: "KI-Assistent",
    subtitle: "Sprechen oder tippen Sie, um einen Reiniger zu finden",
    greeting: "Hallo! Ich helfe Ihnen, den perfekten Reinigungsservice zu finden. Was suchen Sie? Sie können tippen oder das Mikrofon verwenden.",
    placeholder: "Beschreiben Sie, was Sie brauchen...",
    listening: "Ich höre zu...",
    error: "Entschuldigung, es gab einen Fehler. Bitte versuchen Sie es erneut.",
    micNotSupported: "Spracheingabe wird in diesem Browser nicht unterstützt. Bitte verwenden Sie Chrome oder Edge.",
    micPermissionDenied: "Mikrofonberechtigung verweigert.",
    micPermissionGranted: "Mikrofonzugriff gewährt!",
    micError: "Konnte nicht auf das Mikrofon zugreifen. Bitte versuchen Sie es erneut.",
    searchingText: "Suche nach Reinigern...",
    speakNow: "Sprechen Sie jetzt...",
    noSpeechDetected: "Keine Sprache erkannt. Bitte versuchen Sie es erneut.",
    permissionNeededTitle: "Mikrofonzugriff erforderlich",
    permissionNeededDesc: "Um die Spracheingabe zu nutzen, erlauben Sie bitte den Mikrofonzugriff in Ihrem Browser.",
    permissionStep1: "Klicken Sie auf das Kamera-/Mikrofonsymbol in der Adressleiste",
    permissionStep2: "Wählen Sie \"Zulassen\" für das Mikrofon",
    permissionStep3: "Klicken Sie erneut auf die Mikrofontaste",
    permissionAlt: "Oder geben Sie einfach Ihre Anfrage unten ein!",
    tryAgain: "Erneut versuchen",
    gotIt: "Verstanden",
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
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
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

  // Initialize with greeting and request mic permission when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ role: "assistant", content: t.greeting }]);

      // Request microphone permission immediately when chat opens
      if (isSupported) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => {
            stream.getTracks().forEach(track => track.stop());
            toast.success(t.micPermissionGranted);
          })
          .catch(() => {
            // Silent fail - user can still type
          });
      }
    }
  }, [isOpen, messages.length, t.greeting, isSupported, t.micPermissionGranted]);

  const startListening = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      toast.error(t.micNotSupported);
      return;
    }

    // Request microphone permission - this will show the browser popup
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream after permission granted
      toast.success(t.micPermissionGranted);
    } catch (err) {
      console.error("Microphone permission error:", err);
      // Show friendly dialog instead of technical error
      setShowPermissionDialog(true);
      return;
    }

    // Small delay to let user see the success message
    await new Promise(resolve => setTimeout(resolve, 300));

    const recognition = new SpeechRecognitionClass() as SpeechRecognitionInstance;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = locale === "de" ? "de-DE" : "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      toast.info(t.speakNow);
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
        setShowPermissionDialog(true);
      } else if (event.error === "no-speech") {
        toast.info(t.noSpeechDetected);
      } else if (event.error === "aborted") {
        // User stopped, no error needed
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

      {/* Permission Help Dialog */}
      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-purple-500" />
              {t.permissionNeededTitle}
            </DialogTitle>
            <DialogDescription>{t.permissionNeededDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-sm font-bold shrink-0">
                  1
                </div>
                <p className="text-sm">{t.permissionStep1}</p>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-sm font-bold shrink-0">
                  2
                </div>
                <p className="text-sm">{t.permissionStep2}</p>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-sm font-bold shrink-0">
                  3
                </div>
                <p className="text-sm">{t.permissionStep3}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-blue-700">
              <Settings className="h-4 w-4 shrink-0" />
              <p className="text-sm">{t.permissionAlt}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPermissionDialog(false)}
              className="flex-1"
            >
              {t.gotIt}
            </Button>
            <Button
              onClick={() => {
                setShowPermissionDialog(false);
                startListening();
              }}
              className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500"
            >
              {t.tryAgain}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
