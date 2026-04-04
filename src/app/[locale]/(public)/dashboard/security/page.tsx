"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  Clock,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  LogOut,
  ShieldCheck,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

interface Session {
  id: string;
  ip: string | null;
  userAgent: string | null;
  country: string | null;
  city: string | null;
  lastActiveAt: string;
  createdAt: string;
  device: {
    name: string | null;
    browser: string | null;
    os: string | null;
    deviceType: string | null;
    isTrusted: boolean;
  } | null;
}

interface Device {
  id: string;
  name: string | null;
  browser: string | null;
  os: string | null;
  deviceType: string | null;
  isTrusted: boolean;
  lastSeenAt: string;
  lastIp: string | null;
  lastCountry: string | null;
  createdAt: string;
}

export default function SecuritySettingsPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/dashboard/security");
    }
  }, [authStatus, router]);

  useEffect(() => {
    async function fetchSecurityData() {
      try {
        const [sessionsRes, devicesRes] = await Promise.all([
          fetch("/api/user/sessions"),
          fetch("/api/user/devices"),
        ]);

        if (sessionsRes.ok) {
          const data = await sessionsRes.json();
          setSessions(data.sessions || []);
        }

        if (devicesRes.ok) {
          const data = await devicesRes.json();
          setDevices(data.devices || []);
        }
      } catch (error) {
        console.error("Error fetching security data:", error);
        toast.error("Failed to load security data");
      } finally {
        setIsLoading(false);
      }
    }

    if (authStatus === "authenticated") {
      fetchSecurityData();
    }
  }, [authStatus]);

  const handleRevokeSession = async (sessionId: string) => {
    setActionLoading(sessionId);
    try {
      const response = await fetch("/api/user/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (response.ok) {
        setSessions(sessions.filter((s) => s.id !== sessionId));
        toast.success("Session revoked successfully");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to revoke session");
      }
    } catch {
      toast.error("Failed to revoke session");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeAllSessions = async () => {
    setActionLoading("all");
    try {
      const response = await fetch("/api/user/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revokeAll: true }),
      });

      if (response.ok) {
        setSessions([]);
        toast.success("All other sessions revoked");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to revoke sessions");
      }
    } catch {
      toast.error("Failed to revoke sessions");
    } finally {
      setActionLoading(null);
    }
  };

  const handleTrustDevice = async (deviceId: string) => {
    setActionLoading(deviceId);
    try {
      const response = await fetch("/api/user/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, action: "trust" }),
      });

      if (response.ok) {
        setDevices(
          devices.map((d) => (d.id === deviceId ? { ...d, isTrusted: true } : d))
        );
        toast.success("Device trusted");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to trust device");
      }
    } catch {
      toast.error("Failed to trust device");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    setActionLoading(deviceId);
    try {
      const response = await fetch("/api/user/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, action: "remove" }),
      });

      if (response.ok) {
        setDevices(devices.filter((d) => d.id !== deviceId));
        // Also remove sessions associated with this device
        setSessions(sessions.filter((s) => s.device?.name !== devices.find((d) => d.id === deviceId)?.name));
        toast.success("Device removed and sessions revoked");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to remove device");
      }
    } catch {
      toast.error("Failed to remove device");
    } finally {
      setActionLoading(null);
    }
  };

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType) {
      case "mobile":
        return <Smartphone className="h-5 w-5" />;
      case "tablet":
        return <Tablet className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  };

  if (authStatus === "loading" || isLoading) {
    return <SecuritySkeleton />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Button variant="ghost" onClick={() => router.back()} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {/* Page Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Security Settings</h1>
              <p className="text-muted-foreground">
                Manage your active sessions and trusted devices
              </p>
            </div>
          </div>

          {/* Email Verification Status */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {session?.user?.isEmailVerified ? (
                    <div className="p-2 rounded-full bg-green-100">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-full bg-yellow-100">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium">Email Verification</h3>
                    <p className="text-sm text-muted-foreground">
                      {session?.user?.isEmailVerified
                        ? "Your email is verified"
                        : "Your email is not verified"}
                    </p>
                  </div>
                </div>
                {!session?.user?.isEmailVerified && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/auth/verify-email", {
                          method: "POST",
                        });
                        if (res.ok) {
                          toast.success("Verification email sent");
                        } else {
                          const data = await res.json();
                          toast.error(data.error || "Failed to send verification email");
                        }
                      } catch {
                        toast.error("Failed to send verification email");
                      }
                    }}
                  >
                    Resend Verification
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active Sessions */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Active Sessions
                  </CardTitle>
                  <CardDescription>
                    Devices where your account is currently logged in
                  </CardDescription>
                </div>
                {sessions.length > 1 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRevokeAllSessions}
                    disabled={actionLoading === "all"}
                  >
                    {actionLoading === "all" ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <LogOut className="h-4 w-4 mr-2" />
                    )}
                    Sign Out All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active sessions found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessions.map((sessionItem) => (
                    <div
                      key={sessionItem.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-gray-100">
                          {getDeviceIcon(sessionItem.device?.deviceType || null)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">
                              {sessionItem.device?.name || "Unknown Device"}
                            </h4>
                            {sessionItem.device?.isTrusted && (
                              <Badge variant="secondary" className="text-xs">
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Trusted
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {sessionItem.ip || "Unknown IP"}
                            </span>
                            {(sessionItem.city || sessionItem.country) && (
                              <span>
                                {[sessionItem.city, sessionItem.country]
                                  .filter(Boolean)
                                  .join(", ")}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(sessionItem.lastActiveAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRevokeSession(sessionItem.id)}
                        disabled={actionLoading === sessionItem.id}
                      >
                        {actionLoading === sessionItem.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        <span className="ml-2 hidden sm:inline">Revoke</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Known Devices */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Known Devices
              </CardTitle>
              <CardDescription>
                Devices that have been used to access your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {devices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No devices recorded yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {devices.map((device) => (
                    <div
                      key={device.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-3 rounded-lg ${
                            device.isTrusted ? "bg-green-100" : "bg-gray-100"
                          }`}
                        >
                          {getDeviceIcon(device.deviceType)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">
                              {device.name || "Unknown Device"}
                            </h4>
                            {device.isTrusted ? (
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Trusted
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Unverified
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span>
                              {device.browser} on {device.os}
                            </span>
                            {device.lastIp && (
                              <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {device.lastIp}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Last seen {formatDate(device.lastSeenAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!device.isTrusted && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTrustDevice(device.id)}
                            disabled={actionLoading === device.id}
                          >
                            {actionLoading === device.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            <span className="ml-2 hidden sm:inline">Trust</span>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRemoveDevice(device.id)}
                          disabled={actionLoading === device.id}
                        >
                          {actionLoading === device.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          <span className="ml-2 hidden sm:inline">Remove</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Tips */}
          <Card className="mt-6 bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-6 w-6 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900">Security Tips</h3>
                  <ul className="mt-2 text-sm text-blue-800 space-y-1">
                    <li>• Review your active sessions regularly and revoke any you do not recognize</li>
                    <li>• Only trust devices that you personally own and control</li>
                    <li>• If you see suspicious activity, change your password immediately</li>
                    <li>• Sign out from all devices if you suspect your account was compromised</li>
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

function SecuritySkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center gap-3 mb-8">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="h-24 mb-6" />
          <Skeleton className="h-80 mb-6" />
          <Skeleton className="h-80" />
        </div>
      </main>
      <Footer />
    </div>
  );
}
