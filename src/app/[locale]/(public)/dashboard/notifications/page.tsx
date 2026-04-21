"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Bell,
  Mail,
  Smartphone,
  BellRing,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  Plus,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface NotificationPreference {
  type: string;
  channel: string;
  enabled: boolean;
}

interface ReminderPreference {
  enabled: boolean;
  reminderTimes: number[];
}

interface ReminderPreset {
  label: string;
  minutes: number;
}

const NOTIFICATION_TYPES = [
  { type: "BOOKING_CREATED", label: "New Booking Requests", description: "When someone books your service" },
  { type: "BOOKING_CONFIRMED", label: "Booking Confirmations", description: "When a booking is confirmed" },
  { type: "BOOKING_CANCELLED", label: "Booking Cancellations", description: "When a booking is cancelled" },
  { type: "BOOKING_REMINDER", label: "Booking Reminders", description: "Reminders before upcoming bookings" },
  { type: "BOOKING_COMPLETED", label: "Booking Completions", description: "When a booking is completed" },
  { type: "PAYMENT_RECEIVED", label: "Payment Received", description: "When payment is received" },
  { type: "PAYOUT_SENT", label: "Payouts Sent", description: "When earnings are transferred" },
  { type: "MESSAGE_RECEIVED", label: "New Messages", description: "When you receive a message" },
  { type: "REVIEW_RECEIVED", label: "New Reviews", description: "When you receive a review" },
  { type: "DOCUMENT_VERIFIED", label: "Document Verified", description: "When your document is verified" },
  { type: "DOCUMENT_REJECTED", label: "Document Rejected", description: "When your document is rejected" },
  { type: "DISPUTE_OPENED", label: "Dispute Opened", description: "When a dispute is opened" },
  { type: "DISPUTE_RESOLVED", label: "Dispute Resolved", description: "When a dispute is resolved" },
];

const CHANNELS = [
  { channel: "EMAIL", label: "Email", icon: Mail },
  { channel: "SMS", label: "SMS", icon: Smartphone },
  { channel: "PUSH", label: "Push", icon: BellRing },
];

export default function NotificationsPage() {
  const router = useRouter();
  const t = useTranslations();
  const { status: authStatus } = useSession();

  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPhone, setHasPhone] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [reminderPreference, setReminderPreference] = useState<ReminderPreference>({
    enabled: true,
    reminderTimes: [1440, 60],
  });
  const [reminderPresets, setReminderPresets] = useState<ReminderPreset[]>([]);
  const [isUpdatingReminders, setIsUpdatingReminders] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus === "authenticated") {
      fetchPreferences();
      fetchReminderPreferences();
      checkPushSupport();
    }
  }, [authStatus]);

  const fetchReminderPreferences = async () => {
    try {
      const res = await fetch("/api/user/notifications/reminders");
      if (res.ok) {
        const data = await res.json();
        setReminderPreference(data.preference);
        setReminderPresets(data.presets || []);
      }
    } catch (error) {
      console.error("Error fetching reminder preferences:", error);
    }
  };

  const updateReminderPreferences = async (updates: Partial<ReminderPreference>) => {
    setIsUpdatingReminders(true);
    const newPreference = { ...reminderPreference, ...updates };
    setReminderPreference(newPreference);

    try {
      const res = await fetch("/api/user/notifications/reminders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        // Revert on error
        setReminderPreference(reminderPreference);
        toast.error("Failed to update reminder preferences");
      } else {
        toast.success("Reminder preferences updated");
      }
    } catch {
      setReminderPreference(reminderPreference);
      toast.error("Failed to update reminder preferences");
    } finally {
      setIsUpdatingReminders(false);
    }
  };

  const addReminderTime = (minutes: number) => {
    if (!reminderPreference.reminderTimes.includes(minutes)) {
      const newTimes = [...reminderPreference.reminderTimes, minutes].sort((a, b) => b - a);
      updateReminderPreferences({ reminderTimes: newTimes });
    }
  };

  const removeReminderTime = (minutes: number) => {
    const newTimes = reminderPreference.reminderTimes.filter((t) => t !== minutes);
    updateReminderPreferences({ reminderTimes: newTimes });
  };

  const formatMinutes = (minutes: number): string => {
    if (minutes >= 1440) {
      const days = Math.floor(minutes / 1440);
      return `${days} day${days > 1 ? "s" : ""} before`;
    } else if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours} hour${hours > 1 ? "s" : ""} before`;
    }
    return `${minutes} minute${minutes > 1 ? "s" : ""} before`;
  };

  const fetchPreferences = async () => {
    try {
      const res = await fetch("/api/user/notifications/preferences");
      if (res.ok) {
        const data = await res.json();
        setPreferences(data.preferences || []);
        setHasPhone(data.hasPhone);
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkPushSupport = async () => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsPushSupported(true);

      // Check if already subscribed
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsPushEnabled(!!subscription);
      } catch {
        setIsPushEnabled(false);
      }
    }
  };

  const getPreferenceEnabled = (type: string, channel: string): boolean => {
    const pref = preferences.find((p) => p.type === type && p.channel === channel);
    return pref?.enabled ?? false;
  };

  const handleToggle = async (type: string, channel: string, enabled: boolean) => {
    // Optimistic update
    setPreferences((prev) => {
      const existing = prev.find((p) => p.type === type && p.channel === channel);
      if (existing) {
        return prev.map((p) =>
          p.type === type && p.channel === channel ? { ...p, enabled } : p
        );
      }
      return [...prev, { type, channel, enabled }];
    });

    try {
      const res = await fetch("/api/user/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, channel, enabled }),
      });

      if (!res.ok) {
        // Revert on error
        setPreferences((prev) =>
          prev.map((p) =>
            p.type === type && p.channel === channel ? { ...p, enabled: !enabled } : p
          )
        );
        toast.error("Failed to update preference");
      }
    } catch {
      // Revert on error
      setPreferences((prev) =>
        prev.map((p) =>
          p.type === type && p.channel === channel ? { ...p, enabled: !enabled } : p
        )
      );
      toast.error("Failed to update preference");
    }
  };

  const enablePushNotifications = async () => {
    setIsEnablingPush(true);
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notification permission denied");
        setIsEnablingPush(false);
        return;
      }

      // Get VAPID public key
      const keyRes = await fetch("/api/user/notifications/push/subscribe");
      if (!keyRes.ok) {
        throw new Error("Failed to get push configuration");
      }
      const { vapidPublicKey } = await keyRes.json();

      // Subscribe to push
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Send subscription to server
      const subRes = await fetch("/api/user/notifications/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (subRes.ok) {
        setIsPushEnabled(true);
        toast.success("Push notifications enabled");
      } else {
        throw new Error("Failed to save subscription");
      }
    } catch (error) {
      console.error("Error enabling push:", error);
      toast.error("Failed to enable push notifications");
    } finally {
      setIsEnablingPush(false);
    }
  };

  const disablePushNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await fetch("/api/user/notifications/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }

      setIsPushEnabled(false);
      toast.success("Push notifications disabled");
    } catch (error) {
      console.error("Error disabling push:", error);
      toast.error("Failed to disable push notifications");
    }
  };

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

  return (
    <div className="min-h-screen flex flex-col">
      

      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-4xl">

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
              <Bell className="h-6 w-6" />
              Notification Preferences
            </h1>
            <p className="text-muted-foreground mt-1">
              Choose how you want to receive notifications
            </p>
          </div>

          {/* Push Notifications Setup */}
          {isPushSupported && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BellRing className="h-5 w-5" />
                  Push Notifications
                </CardTitle>
                <CardDescription>
                  Receive instant notifications in your browser
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isPushEnabled ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    )}
                    <span>
                      {isPushEnabled
                        ? "Push notifications are enabled"
                        : "Push notifications are disabled"}
                    </span>
                  </div>
                  <Button
                    variant={isPushEnabled ? "outline" : "default"}
                    onClick={isPushEnabled ? disablePushNotifications : enablePushNotifications}
                    disabled={isEnablingPush}
                  >
                    {isEnablingPush && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isPushEnabled ? "Disable" : "Enable"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* SMS Notice */}
          {!hasPhone && (
            <Card className="mb-8 border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    Add a phone number to your profile to receive SMS notifications.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Booking Reminder Timing */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Booking Reminder Timing
              </CardTitle>
              <CardDescription>
                Choose when to receive reminders before your bookings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enable booking reminders</p>
                  <p className="text-sm text-muted-foreground">
                    Receive reminders before your scheduled bookings
                  </p>
                </div>
                <Switch
                  checked={reminderPreference.enabled}
                  onCheckedChange={(checked) =>
                    updateReminderPreferences({ enabled: checked })
                  }
                  disabled={isUpdatingReminders}
                />
              </div>

              {reminderPreference.enabled && (
                <>
                  <div className="border-t pt-4">
                    <p className="font-medium mb-3">Remind me:</p>
                    <div className="flex flex-wrap gap-2">
                      {reminderPreference.reminderTimes.map((minutes) => (
                        <div
                          key={minutes}
                          className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          <Clock className="h-3 w-3" />
                          {formatMinutes(minutes)}
                          <button
                            onClick={() => removeReminderTime(minutes)}
                            className="hover:text-red-600 transition-colors"
                            disabled={isUpdatingReminders}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Select
                      onValueChange={(value) => addReminderTime(parseInt(value))}
                      disabled={isUpdatingReminders}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Add reminder..." />
                      </SelectTrigger>
                      <SelectContent>
                        {reminderPresets
                          .filter((p) => !reminderPreference.reminderTimes.includes(p.minutes))
                          .map((preset) => (
                            <SelectItem key={preset.minutes} value={preset.minutes.toString()}>
                              {preset.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">
                      <Plus className="h-4 w-4 inline mr-1" />
                      Add another reminder
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Types</CardTitle>
              <CardDescription>
                Configure which notifications you want to receive and how
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 font-medium">Notification</th>
                      {CHANNELS.map((ch) => (
                        <th key={ch.channel} className="text-center py-3 px-4 font-medium">
                          <div className="flex flex-col items-center gap-1">
                            <ch.icon className="h-4 w-4" />
                            <span className="text-xs">{ch.label}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {NOTIFICATION_TYPES.map((notif) => (
                      <tr key={notif.type} className="border-b last:border-0">
                        <td className="py-4 pr-4">
                          <div>
                            <p className="font-medium text-sm">{notif.label}</p>
                            <p className="text-xs text-muted-foreground">{notif.description}</p>
                          </div>
                        </td>
                        {CHANNELS.map((ch) => (
                          <td key={ch.channel} className="text-center py-4 px-4">
                            <Switch
                              checked={getPreferenceEnabled(notif.type, ch.channel)}
                              onCheckedChange={(checked) =>
                                handleToggle(notif.type, ch.channel, checked)
                              }
                              disabled={
                                (ch.channel === "SMS" && !hasPhone) ||
                                (ch.channel === "PUSH" && !isPushEnabled)
                              }
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      
    </div>
  );
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as Uint8Array<ArrayBuffer>;
}
