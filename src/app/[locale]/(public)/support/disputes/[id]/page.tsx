"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter, Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Send,
  Paperclip,
  Loader2,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Image as ImageIcon,
  Video,
  File,
} from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string;
  isAdmin: boolean;
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    role: string;
  };
}

interface Evidence {
  id: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  description: string | null;
  createdAt: string;
  uploader: { firstName: string; lastName: string };
}

interface Dispute {
  id: string;
  type: string;
  status: string;
  subject: string;
  description: string;
  resolution: string | null;
  resolutionNote: string | null;
  refundAmount: number | null;
  createdAt: string;
  resolvedAt: string | null;
  booking: {
    id: string;
    scheduledDate: string;
    scheduledTime: string;
    totalPrice: number;
    status: string;
    service: { name: string };
  };
  customer: { id: string; firstName: string; lastName: string; avatar: string | null };
  worker: { id: string; firstName: string; lastName: string; avatar: string | null };
  resolvedBy: { firstName: string; lastName: string } | null;
  messages: Message[];
  evidence: Evidence[];
}

const DISPUTE_TYPE_LABELS: Record<string, string> = {
  SERVICE_QUALITY: "Service Quality",
  PAYMENT_ISSUE: "Payment Issue",
  NO_SHOW: "No Show",
  PROPERTY_DAMAGE: "Property Damage",
  UNPROFESSIONAL_BEHAVIOR: "Unprofessional Behavior",
  OTHER: "Other",
};

export default function DisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus === "authenticated" && id) {
      fetchDispute();
    }
  }, [authStatus, id]);

  const fetchDispute = async () => {
    try {
      const res = await fetch(`/api/disputes/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDispute(data.dispute);
      } else {
        toast.error("Dispute not found");
        router.push("/support/disputes");
      }
    } catch (error) {
      console.error("Error fetching dispute:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/disputes/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage }),
      });

      if (res.ok) {
        setNewMessage("");
        fetchDispute();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to send message");
      }
    } catch {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/disputes/${id}/evidence`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        toast.success("Evidence uploaded");
        fetchDispute();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to upload");
      }
    } catch {
      toast.error("Failed to upload");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Open</Badge>;
      case "IN_REVIEW":
        return <Badge className="bg-blue-100 text-blue-800"><AlertCircle className="h-3 w-3 mr-1" />In Review</Badge>;
      case "RESOLVED":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>;
      case "CLOSED":
        return <Badge className="bg-gray-100 text-gray-800"><XCircle className="h-3 w-3 mr-1" />Closed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
    if (fileType.startsWith("video/")) return <Video className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const isOpen = dispute?.status === "OPEN" || dispute?.status === "IN_REVIEW";

  if (authStatus === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        
        <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
          <div className="container mx-auto px-4 max-w-4xl">
            <Skeleton className="h-8 w-48 mb-6" />
            <Skeleton className="h-64" />
          </div>
        </main>
        
      </div>
    );
  }

  if (!dispute) return null;

  return (
    <div className="min-h-screen flex flex-col">
      

      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <Link href="/support/disputes">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {getStatusBadge(dispute.status)}
                <Badge variant="outline">{DISPUTE_TYPE_LABELS[dispute.type]}</Badge>
              </div>
              <h1 className="text-xl font-bold">{dispute.subject}</h1>
              <p className="text-sm text-muted-foreground">
                Opened {new Date(dispute.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{dispute.description}</p>
                </CardContent>
              </Card>

              {/* Resolution */}
              {dispute.resolution && (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-base text-green-800">Resolution</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p><strong>Decision:</strong> {dispute.resolution.replace(/_/g, " ")}</p>
                    {dispute.refundAmount && (
                      <p><strong>Refund Amount:</strong> ${dispute.refundAmount.toFixed(2)}</p>
                    )}
                    {dispute.resolutionNote && (
                      <p className="mt-2">{dispute.resolutionNote}</p>
                    )}
                    {dispute.resolvedBy && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Resolved by {dispute.resolvedBy.firstName} {dispute.resolvedBy.lastName} on{" "}
                        {new Date(dispute.resolvedAt!).toLocaleDateString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Messages */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Discussion</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
                    {dispute.messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No messages yet. Start the conversation.
                      </p>
                    ) : (
                      dispute.messages.map((message) => {
                        const isMe = message.sender.id === session?.user?.id;
                        return (
                          <div
                            key={message.id}
                            className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={message.sender.avatar || undefined} />
                              <AvatarFallback>
                                {message.sender.firstName[0]}
                                {message.sender.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div
                              className={`flex-1 max-w-[80%] ${isMe ? "text-right" : ""}`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium">
                                  {message.sender.firstName} {message.sender.lastName}
                                </span>
                                {message.isAdmin && (
                                  <Badge variant="secondary" className="text-xs">
                                    Support
                                  </Badge>
                                )}
                              </div>
                              <div
                                className={`p-3 rounded-lg text-sm ${
                                  isMe
                                    ? "bg-blue-600 text-white"
                                    : message.isAdmin
                                    ? "bg-purple-100"
                                    : "bg-gray-100"
                                }`}
                              >
                                {message.content}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(message.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {isOpen && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                      />
                      <Button onClick={handleSendMessage} disabled={isSending || !newMessage.trim()}>
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Booking Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Booking Details</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p><strong>Service:</strong> {dispute.booking.service.name}</p>
                  <p><strong>Date:</strong> {new Date(dispute.booking.scheduledDate).toLocaleDateString()}</p>
                  <p><strong>Time:</strong> {dispute.booking.scheduledTime}</p>
                  <p><strong>Amount:</strong> ${dispute.booking.totalPrice.toFixed(2)}</p>
                  <p><strong>Status:</strong> {dispute.booking.status}</p>
                </CardContent>
              </Card>

              {/* Evidence */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Evidence</CardTitle>
                  {isOpen && (
                    <label>
                      <Input
                        type="file"
                        accept="image/*,video/*,.pdf"
                        onChange={handleUploadEvidence}
                        className="hidden"
                        disabled={isUploading}
                      />
                      <Button variant="outline" size="sm" asChild disabled={isUploading}>
                        <span className="cursor-pointer">
                          {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Paperclip className="h-4 w-4" />
                          )}
                        </span>
                      </Button>
                    </label>
                  )}
                </CardHeader>
                <CardContent>
                  {dispute.evidence.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No evidence uploaded</p>
                  ) : (
                    <div className="space-y-2">
                      {dispute.evidence.map((ev) => (
                        <a
                          key={ev.id}
                          href={ev.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 text-sm"
                        >
                          {getFileIcon(ev.fileType)}
                          <span className="flex-1 truncate">{ev.fileName}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      
    </div>
  );
}
