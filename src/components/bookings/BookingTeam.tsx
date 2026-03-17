"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  UserPlus,
  Check,
  X,
  Star,
  Loader2,
  Crown,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TeamMember {
  id: string;
  cleanerId: string;
  isLead: boolean;
  confirmed: boolean;
  earnings: number | null;
  cleaner: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    phone: string | null;
    cleanerProfile: {
      averageRating: number;
      verified: boolean;
    } | null;
  };
}

interface AvailableCleaner {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  distance: number | null;
  cleanerProfile: {
    averageRating: number;
    totalBookings: number;
    verified: boolean;
    hourlyRate: number;
  } | null;
}

interface BookingTeamProps {
  bookingId: string;
  isLeadCleaner: boolean;
  teamSize: number;
}

export function BookingTeam({
  bookingId,
  isLeadCleaner,
  teamSize,
}: BookingTeamProps) {
  const t = useTranslations("team");
  const { data: session } = useSession();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [leadCleaner, setLeadCleaner] = useState<TeamMember["cleaner"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingOpen, setIsAddingOpen] = useState(false);
  const [availableCleaners, setAvailableCleaners] = useState<AvailableCleaner[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const [isActioning, setIsActioning] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/team`);
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.teamMembers);
        setLeadCleaner(data.leadCleaner);
      }
    } catch (error) {
      console.error("Error fetching team:", error);
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const fetchAvailableCleaners = async () => {
    setIsLoadingAvailable(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/team/available`);
      if (response.ok) {
        const data = await response.json();
        setAvailableCleaners(data.cleaners);
      }
    } catch (error) {
      console.error("Error fetching available cleaners:", error);
    } finally {
      setIsLoadingAvailable(false);
    }
  };

  const handleAddMember = async (cleanerId: string) => {
    setIsActioning(cleanerId);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", cleanerId }),
      });

      if (response.ok) {
        toast.success(t("memberAdded"));
        fetchTeam();
        setAvailableCleaners((prev) => prev.filter((c) => c.id !== cleanerId));
      } else {
        const error = await response.json();
        toast.error(error.error || t("addFailed"));
      }
    } catch (error) {
      console.error("Error adding member:", error);
      toast.error(t("addFailed"));
    } finally {
      setIsActioning(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setIsActioning(memberId);
    try {
      const response = await fetch(
        `/api/bookings/${bookingId}/team?memberId=${memberId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success(t("memberRemoved"));
        setTeamMembers((prev) => prev.filter((m) => m.id !== memberId));
      } else {
        toast.error(t("removeFailed"));
      }
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error(t("removeFailed"));
    } finally {
      setIsActioning(null);
    }
  };

  const handleConfirm = async () => {
    setIsActioning("confirm");
    try {
      const response = await fetch(`/api/bookings/${bookingId}/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm" }),
      });

      if (response.ok) {
        toast.success(t("confirmed"));
        fetchTeam();
      } else {
        toast.error(t("confirmFailed"));
      }
    } catch (error) {
      console.error("Error confirming:", error);
      toast.error(t("confirmFailed"));
    } finally {
      setIsActioning(null);
    }
  };

  const handleDecline = async () => {
    setIsActioning("decline");
    try {
      const response = await fetch(`/api/bookings/${bookingId}/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline" }),
      });

      if (response.ok) {
        toast.success(t("declined"));
        fetchTeam();
      } else {
        toast.error(t("declineFailed"));
      }
    } catch (error) {
      console.error("Error declining:", error);
      toast.error(t("declineFailed"));
    } finally {
      setIsActioning(null);
    }
  };

  if (teamSize <= 1) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentMember = teamMembers.find(
    (m) => m.cleanerId === session?.user?.id
  );
  const needsToConfirm = currentMember && !currentMember.confirmed;
  const spotsRemaining = teamSize - 1 - teamMembers.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            {t("title")} ({teamMembers.length + 1}/{teamSize})
          </span>
          {isLeadCleaner && spotsRemaining > 0 && (
            <Dialog open={isAddingOpen} onOpenChange={setIsAddingOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => fetchAvailableCleaners()}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t("addMember")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{t("findCleaners")}</DialogTitle>
                </DialogHeader>
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {isLoadingAvailable ? (
                    <>
                      <Skeleton className="h-20" />
                      <Skeleton className="h-20" />
                    </>
                  ) : availableCleaners.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {t("noAvailable")}
                    </p>
                  ) : (
                    availableCleaners.map((cleaner) => (
                      <div
                        key={cleaner.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            {cleaner.firstName} {cleaner.lastName}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {(cleaner.cleanerProfile?.averageRating ?? 0) > 0 && (
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                {cleaner.cleanerProfile?.averageRating?.toFixed(1)}
                              </span>
                            )}
                            {cleaner.distance !== null && (
                              <span>{cleaner.distance} km</span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddMember(cleaner.id)}
                          disabled={isActioning === cleaner.id}
                        >
                          {isActioning === cleaner.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserPlus className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Team member needs to confirm */}
        {needsToConfirm && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
            <p className="font-medium text-yellow-800 mb-3">
              {t("invitedToTeam")}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleConfirm}
                disabled={isActioning === "confirm"}
                className="flex-1"
              >
                {isActioning === "confirm" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {t("accept")}
              </Button>
              <Button
                variant="outline"
                onClick={handleDecline}
                disabled={isActioning === "decline"}
                className="flex-1"
              >
                {isActioning === "decline" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                {t("decline")}
              </Button>
            </div>
          </div>
        )}

        {/* Lead cleaner */}
        {leadCleaner && (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center">
                <Crown className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">
                  {leadCleaner.firstName} {leadCleaner.lastName}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary" className="text-xs">
                    {t("lead")}
                  </Badge>
                  {leadCleaner.cleanerProfile?.verified && (
                    <Badge className="bg-green-100 text-green-700 text-xs">
                      {t("verified")}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {leadCleaner.phone && (
              <a href={`tel:${leadCleaner.phone}`}>
                <Button variant="ghost" size="icon">
                  <Phone className="h-4 w-4" />
                </Button>
              </a>
            )}
          </div>
        )}

        {/* Team members */}
        {teamMembers.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                <Users className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="font-medium">
                  {member.cleaner.firstName} {member.cleaner.lastName}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  {member.confirmed ? (
                    <Badge className="bg-green-100 text-green-700 text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      {t("confirmed")}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      {t("pending")}
                    </Badge>
                  )}
                  {member.earnings && (
                    <span className="text-muted-foreground">
                      ${member.earnings.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {member.cleaner.phone && (
                <a href={`tel:${member.cleaner.phone}`}>
                  <Button variant="ghost" size="icon">
                    <Phone className="h-4 w-4" />
                  </Button>
                </a>
              )}
              {isLeadCleaner && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveMember(member.id)}
                  disabled={isActioning === member.id}
                >
                  {isActioning === member.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                </Button>
              )}
            </div>
          </div>
        ))}

        {/* Empty spots */}
        {spotsRemaining > 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            {t("spotsRemaining", { count: spotsRemaining })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
