"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/ui/back-button";
import {
  Calendar,
  Link2,
  Unlink,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface CalendarConnection {
  id: string;
  provider: string;
  email: string;
  calendarId: string | null;
  syncEnabled: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  _count: { events: number };
}

export default function CalendarPage() {
  const router = useRouter();
  const t = useTranslations();
  const searchParams = useSearchParams();
  const { data: session, status: authStatus } = useSession();

  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    } else if (authStatus === "authenticated" && session?.user?.role !== "WORKER") {
      router.push("/dashboard");
    }
  }, [authStatus, session, router]);

  useEffect(() => {
    if (authStatus === "authenticated") {
      fetchConnections();
    }
  }, [authStatus]);

  useEffect(() => {
    // Handle success/error from OAuth callback
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success) {
      if (success === "google_connected") {
        toast.success("Google Calendar connected successfully");
      } else if (success === "outlook_connected") {
        toast.success("Outlook Calendar connected successfully");
      }
      router.replace("/dashboard/calendar");
    }

    if (error) {
      toast.error(`Failed to connect calendar: ${error.replace(/_/g, " ")}`);
      router.replace("/dashboard/calendar");
    }
  }, [searchParams, router]);

  const fetchConnections = async () => {
    try {
      const res = await fetch("/api/calendar/connections");
      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections || []);
      }
    } catch (error) {
      console.error("Error fetching connections:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm("Are you sure you want to disconnect this calendar?")) return;

    try {
      const res = await fetch(`/api/calendar/connections/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Calendar disconnected");
        fetchConnections();
      } else {
        toast.error("Failed to disconnect calendar");
      }
    } catch {
      toast.error("Failed to disconnect calendar");
    }
  };

  const handleToggleSync = async (id: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/calendar/connections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncEnabled: enabled }),
      });

      if (res.ok) {
        setConnections((prev) =>
          prev.map((c) => (c.id === id ? { ...c, syncEnabled: enabled } : c))
        );
        toast.success(enabled ? "Sync enabled" : "Sync disabled");
      } else {
        toast.error("Failed to update sync settings");
      }
    } catch {
      toast.error("Failed to update sync settings");
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Synced ${data.syncedCount} bookings to calendar`);
        fetchConnections();
      } else {
        toast.error("Failed to sync calendar");
      }
    } catch {
      toast.error("Failed to sync calendar");
    } finally {
      setIsSyncing(false);
    }
  };

  const googleConnected = connections.find((c) => c.provider === "google");
  const outlookConnected = connections.find((c) => c.provider === "outlook");

  if (authStatus === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
          <div className="container mx-auto px-4 max-w-4xl">
            <Skeleton className="h-8 w-48 mb-6" />
            <Skeleton className="h-48" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <BackButton href="/dashboard" />
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Calendar className="h-6 w-6" />
                Calendar Sync
              </h1>
              <p className="text-muted-foreground">
                Sync your bookings with Google or Outlook calendar
              </p>
            </div>
            {connections.length > 0 && (
              <Button onClick={handleManualSync} disabled={isSyncing}>
                {isSyncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sync Now
              </Button>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Google Calendar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google Calendar
                </CardTitle>
                <CardDescription>
                  Sync bookings with your Google Calendar
                </CardDescription>
              </CardHeader>
              <CardContent>
                {googleConnected ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{googleConnected.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {googleConnected._count.events} events synced
                        </p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Auto-sync enabled</span>
                      <Switch
                        checked={googleConnected.syncEnabled}
                        onCheckedChange={(checked) =>
                          handleToggleSync(googleConnected.id, checked)
                        }
                      />
                    </div>

                    {googleConnected.lastSyncAt && (
                      <p className="text-xs text-muted-foreground">
                        Last synced: {new Date(googleConnected.lastSyncAt).toLocaleString()}
                      </p>
                    )}

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDisconnect(googleConnected.id)}
                    >
                      <Unlink className="mr-2 h-4 w-4" />
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Connect your Google Calendar to automatically sync your bookings.
                    </p>
                    <Button
                      className="w-full"
                      onClick={() => window.location.href = "/api/calendar/connect/google"}
                    >
                      <Link2 className="mr-2 h-4 w-4" />
                      Connect Google Calendar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Outlook Calendar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#0078D4"
                      d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.5V2.55q0-.44.3-.75.3-.3.75-.3h14.9q.44 0 .75.3.3.3.3.75v10.45zm-6-8.25v3h3v-3zm0 4.5v3h3v-3zm0 4.5v1.83l3.05-1.83zm-5.25-9v3h3.75v-3zm0 4.5v3h3.75v-3zm0 4.5v2.03l2.41 1.5 1.34-.8v-2.73zM9 3.75V6h2l.13.01.12.04v-2.3zM5.98 15.98q.9 0 1.6-.3.7-.32 1.19-.86.48-.55.73-1.28.25-.74.25-1.61 0-.83-.25-1.55-.24-.71-.71-1.24t-1.15-.83q-.68-.3-1.55-.3-.92 0-1.64.3-.71.3-1.2.85-.5.54-.75 1.28-.25.73-.25 1.57 0 .88.25 1.63.24.74.72 1.28.47.53 1.17.84.69.3 1.59.3zM7.5 21h12.39L12 16.08V17q0 .41-.3.7-.29.3-.7.3H7.5zm15-.13v-7.24l-5.9 3.54Z"
                    />
                  </svg>
                  Outlook Calendar
                </CardTitle>
                <CardDescription>
                  Sync bookings with your Microsoft Outlook Calendar
                </CardDescription>
              </CardHeader>
              <CardContent>
                {outlookConnected ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{outlookConnected.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {outlookConnected._count.events} events synced
                        </p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Auto-sync enabled</span>
                      <Switch
                        checked={outlookConnected.syncEnabled}
                        onCheckedChange={(checked) =>
                          handleToggleSync(outlookConnected.id, checked)
                        }
                      />
                    </div>

                    {outlookConnected.lastSyncAt && (
                      <p className="text-xs text-muted-foreground">
                        Last synced: {new Date(outlookConnected.lastSyncAt).toLocaleString()}
                      </p>
                    )}

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDisconnect(outlookConnected.id)}
                    >
                      <Unlink className="mr-2 h-4 w-4" />
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Connect your Outlook Calendar to automatically sync your bookings.
                    </p>
                    <Button
                      className="w-full"
                      onClick={() => window.location.href = "/api/calendar/connect/outlook"}
                    >
                      <Link2 className="mr-2 h-4 w-4" />
                      Connect Outlook Calendar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">How Calendar Sync Works</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>New bookings are automatically added to your calendar</li>
                    <li>Rescheduled bookings update the calendar event</li>
                    <li>Cancelled bookings are removed from your calendar</li>
                    <li>You can disable auto-sync and sync manually anytime</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
