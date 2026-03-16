"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Lock,
  Plus,
  Trash2,
  Key,
  Battery,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface SmartLock {
  id: string;
  name: string;
  provider: string;
  deviceId: string | null;
  serialNumber: string | null;
  isActive: boolean;
  batteryLevel: number | null;
  lastSyncAt: string | null;
  _count: {
    accessCodes: number;
  };
}

interface AccessCode {
  id: string;
  accessCode: string;
  accessType: string;
  validFrom: string;
  validUntil: string | null;
  status: string;
  usageCount: number;
  maxUsage: number | null;
}

const PROVIDERS = [
  { value: "AUGUST", label: "August" },
  { value: "YALE", label: "Yale" },
  { value: "SCHLAGE", label: "Schlage" },
  { value: "KWIKSET", label: "Kwikset" },
  { value: "TTLOCK", label: "TTLock" },
  { value: "NUKI", label: "Nuki" },
  { value: "GENERIC", label: "Generic/Other" },
];

interface SmartLockManagerProps {
  propertyId: string;
}

export function SmartLockManager({ propertyId }: SmartLockManagerProps) {
  const t = useTranslations("smartLock");
  const [locks, setLocks] = useState<SmartLock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingLock, setIsAddingLock] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLock, setSelectedLock] = useState<SmartLock | null>(null);
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // New lock form
  const [newLockName, setNewLockName] = useState("");
  const [newLockProvider, setNewLockProvider] = useState("");
  const [newLockDeviceId, setNewLockDeviceId] = useState("");

  const fetchLocks = useCallback(async () => {
    try {
      const response = await fetch(`/api/properties/${propertyId}/locks`);
      if (response.ok) {
        const data = await response.json();
        setLocks(data.locks);
      }
    } catch (error) {
      console.error("Error fetching locks:", error);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchLocks();
  }, [fetchLocks]);

  const handleAddLock = async () => {
    if (!newLockName || !newLockProvider) {
      toast.error(t("nameProviderRequired"));
      return;
    }

    setIsAddingLock(true);
    try {
      const response = await fetch(`/api/properties/${propertyId}/locks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newLockName,
          provider: newLockProvider,
          deviceId: newLockDeviceId || null,
        }),
      });

      if (response.ok) {
        toast.success(t("lockAdded"));
        setNewLockName("");
        setNewLockProvider("");
        setNewLockDeviceId("");
        setIsDialogOpen(false);
        fetchLocks();
      } else {
        toast.error(t("addFailed"));
      }
    } catch {
      toast.error(t("addFailed"));
    } finally {
      setIsAddingLock(false);
    }
  };

  const handleDeleteLock = async (lockId: string) => {
    if (!confirm(t("confirmDelete"))) return;

    try {
      const response = await fetch(
        `/api/properties/${propertyId}/locks/${lockId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success(t("lockDeleted"));
        fetchLocks();
      } else {
        toast.error(t("deleteFailed"));
      }
    } catch {
      toast.error(t("deleteFailed"));
    }
  };

  const fetchAccessCodes = async (lockId: string) => {
    setLoadingCodes(true);
    try {
      const response = await fetch(
        `/api/properties/${propertyId}/locks/${lockId}/access`
      );
      if (response.ok) {
        const data = await response.json();
        setAccessCodes(data.accessCodes);
      }
    } catch (error) {
      console.error("Error fetching access codes:", error);
    } finally {
      setLoadingCodes(false);
    }
  };

  const handleViewCodes = (lock: SmartLock) => {
    setSelectedLock(lock);
    fetchAccessCodes(lock.id);
  };

  const copyToClipboard = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(t("codeCopied"));
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getBatteryColor = (level: number | null) => {
    if (level === null) return "text-gray-400";
    if (level > 50) return "text-green-500";
    if (level > 20) return "text-yellow-500";
    return "text-red-500";
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-blue-500" />
            {t("title")}
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                {t("addLock")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("addNewLock")}</DialogTitle>
                <DialogDescription>{t("addLockDescription")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="lockName">{t("lockName")}</Label>
                  <Input
                    id="lockName"
                    value={newLockName}
                    onChange={(e) => setNewLockName(e.target.value)}
                    placeholder={t("lockNamePlaceholder")}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="provider">{t("provider")}</Label>
                  <Select
                    value={newLockProvider}
                    onValueChange={setNewLockProvider}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t("selectProvider")} />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((provider) => (
                        <SelectItem key={provider.value} value={provider.value}>
                          {provider.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="deviceId">{t("deviceId")}</Label>
                  <Input
                    id="deviceId"
                    value={newLockDeviceId}
                    onChange={(e) => setNewLockDeviceId(e.target.value)}
                    placeholder={t("deviceIdPlaceholder")}
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={handleAddLock}
                  disabled={isAddingLock}
                  className="w-full"
                >
                  {isAddingLock ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {t("addLock")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {locks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t("noLocks")}</p>
            <p className="text-sm mt-2">{t("addFirstLock")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {locks.map((lock) => (
              <div
                key={lock.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-2 rounded-lg ${
                      lock.isActive ? "bg-green-100" : "bg-gray-100"
                    }`}
                  >
                    <Lock
                      className={`h-5 w-5 ${
                        lock.isActive ? "text-green-600" : "text-gray-400"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="font-medium">{lock.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{lock.provider}</span>
                      {lock.batteryLevel !== null && (
                        <>
                          <span>•</span>
                          <span
                            className={`flex items-center gap-1 ${getBatteryColor(
                              lock.batteryLevel
                            )}`}
                          >
                            <Battery className="h-3 w-3" />
                            {lock.batteryLevel}%
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span>{lock._count.accessCodes} codes</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={lock.isActive ? "default" : "secondary"}>
                    {lock.isActive ? t("active") : t("inactive")}
                  </Badge>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewCodes(lock)}
                      >
                        <Key className="h-4 w-4 mr-1" />
                        {t("viewCodes")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>
                          {t("accessCodes")} - {selectedLock?.name}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="py-4">
                        {loadingCodes ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : accessCodes.length === 0 ? (
                          <p className="text-center text-muted-foreground py-4">
                            {t("noAccessCodes")}
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {accessCodes.map((code) => (
                              <div
                                key={code.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <code className="text-lg font-mono font-bold">
                                      {code.accessCode}
                                    </code>
                                    <Badge
                                      variant={
                                        code.status === "ACTIVE"
                                          ? "default"
                                          : "secondary"
                                      }
                                    >
                                      {code.status}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(code.validFrom).toLocaleString()}
                                    {code.validUntil &&
                                      ` - ${new Date(
                                        code.validUntil
                                      ).toLocaleString()}`}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    copyToClipboard(code.accessCode)
                                  }
                                >
                                  {copiedCode === code.accessCode ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => handleDeleteLock(lock.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
