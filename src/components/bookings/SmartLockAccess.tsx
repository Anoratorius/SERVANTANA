"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Lock,
  Key,
  Clock,
  Copy,
  Check,
  Loader2,
  Unlock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface LockAccess {
  id: string;
  accessCode: string;
  accessType: string;
  validFrom: string;
  validUntil: string | null;
  status: string;
  lock: {
    id: string;
    name: string;
    provider: string;
  };
}

interface SmartLockAccessProps {
  bookingId: string;
}

export function SmartLockAccess({ bookingId }: SmartLockAccessProps) {
  const t = useTranslations("smartLock");
  const [isLoading, setIsLoading] = useState(true);
  const [hasSmartLock, setHasSmartLock] = useState(false);
  const [accessCodes, setAccessCodes] = useState<LockAccess[]>([]);
  const [propertyName, setPropertyName] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchLockAccess = useCallback(async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/lock-access`);
      if (response.ok) {
        const data = await response.json();
        setHasSmartLock(data.hasSmartLock);
        if (data.hasSmartLock) {
          setAccessCodes(data.accessCodes || []);
          setPropertyName(data.property?.name || "");
        }
      }
    } catch (error) {
      console.error("Error fetching lock access:", error);
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchLockAccess();
  }, [fetchLockAccess]);

  const copyToClipboard = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(t("codeCopied"));
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const isCodeValid = (code: LockAccess) => {
    if (code.status !== "ACTIVE") return false;
    const now = new Date();
    const validFrom = new Date(code.validFrom);
    const validUntil = code.validUntil ? new Date(code.validUntil) : null;
    if (now < validFrom) return false;
    if (validUntil && now > validUntil) return false;
    return true;
  };

  const getTimeRemaining = (validUntil: string | null) => {
    if (!validUntil) return null;
    const now = new Date();
    const until = new Date(validUntil);
    const diff = until.getTime() - now.getTime();
    if (diff <= 0) return t("expired");
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return t("expiresIn", { time: `${hours}h ${minutes}m` });
    return t("expiresIn", { time: `${minutes}m` });
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

  if (!hasSmartLock) {
    return null; // Don't show anything if property doesn't have smart locks
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-blue-500" />
          {t("keylessEntry")}
          {propertyName && (
            <span className="text-sm font-normal text-muted-foreground">
              - {propertyName}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {accessCodes.length === 0 ? (
          <div className="text-center py-6">
            <Key className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">{t("noCodesYet")}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {t("ownerWillShare")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {accessCodes.map((code) => {
              const valid = isCodeValid(code);
              return (
                <div
                  key={code.id}
                  className={`p-4 rounded-lg border ${
                    valid
                      ? "bg-white border-green-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Unlock
                          className={`h-4 w-4 ${
                            valid ? "text-green-500" : "text-gray-400"
                          }`}
                        />
                        <span className="font-medium">{code.lock.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {code.lock.provider}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <div
                          className={`px-4 py-2 rounded-lg font-mono text-2xl font-bold tracking-wider ${
                            valid
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {code.accessCode}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(code.accessCode)}
                          disabled={!valid}
                        >
                          {copiedCode === code.accessCode ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="text-right">
                      {valid ? (
                        <Badge className="bg-green-500">{t("valid")}</Badge>
                      ) : (
                        <Badge variant="secondary">{t("invalid")}</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(code.validFrom).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {code.validUntil &&
                          ` - ${new Date(code.validUntil).toLocaleTimeString(
                            [],
                            { hour: "2-digit", minute: "2-digit" }
                          )}`}
                      </span>
                    </div>
                    {code.validUntil && valid && (
                      <span className="text-orange-500">
                        {getTimeRemaining(code.validUntil)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-blue-700">{t("accessInstructions")}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
