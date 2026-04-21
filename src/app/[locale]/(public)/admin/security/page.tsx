"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Shield,
  AlertTriangle,
  Ban,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  Globe,
  Users,
  CreditCard,
  Star,
  RefreshCw,
  ArrowLeft,
  Eye,
  MoreHorizontal,
  AlertCircle,
  Wifi,
  UserX,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";
import { Link } from "@/i18n/navigation";

interface SecurityData {
  overview: {
    fraudSignalsTotal: number;
    fraudSignalsInPeriod: number;
    resolvedSignals: number;
    pendingSignals: number;
    resolutionRate: number;
    suspendedUsersCount: number;
    bannedUsersCount: number;
    suspiciousIPsCount: number;
    failedPaymentsCount: number;
  };
  fraudByType: Array<{ type: string; count: number }>;
  fraudBySeverity: Array<{ severity: string; count: number }>;
  fraudTrend: Array<{ date: string; count: number; resolved: number }>;
  recentFraudSignals: Array<{
    id: string;
    type: string;
    severity: string;
    description: string;
    confidence: number;
    user: { id: string; name: string; email: string; status: string } | null;
    metadata: Record<string, unknown>;
    createdAt: string;
  }>;
  suspendedUsers: Array<{
    id: string;
    name: string;
    email: string;
    reason: string | null;
    until: string | null;
    updatedAt: string;
  }>;
  bannedUsers: Array<{
    id: string;
    name: string;
    email: string;
    reason: string | null;
    bannedAt: string;
  }>;
  suspiciousIPs: Array<{ ip: string; type: string; eventCount: number }>;
  multiIPUsers: Array<{
    user: { id: string; firstName: string; lastName: string; email: string; status: string } | null;
    ipCount: number;
  }>;
  highFrequencyUsers: Array<{
    user: { id: string; firstName: string; lastName: string; email: string; status: string } | null;
    eventCount: number;
  }>;
  flaggedReviews: Array<{
    id: string;
    rating: number;
    comment: string;
    customer: string;
    customerJoinDate: string;
    worker: string;
    createdAt: string;
    flag: string;
  }>;
  highCancellationUsers: Array<{
    user: { id: string; firstName: string; lastName: string; email: string; status: string } | null;
    cancellations: number;
  }>;
}

export default function AdminSecurityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SecurityData | null>(null);
  const [days, setDays] = useState("30");
  const [selectedSignal, setSelectedSignal] = useState<SecurityData["recentFraudSignals"][0] | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolveNotes, setResolveNotes] = useState("");
  const [resolveAction, setResolveAction] = useState<string>("");
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user?.role !== "ADMIN") {
      router.push("/");
      return;
    }
    fetchData();
  }, [session, status, router, days]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics/security?days=${days}`);
      if (!response.ok) throw new Error("Failed to fetch data");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching security analytics:", error);
      toast.error("Failed to load security analytics");
    } finally {
      setLoading(false);
    }
  };

  const handleResolveSignal = async () => {
    if (!selectedSignal) return;
    setResolving(true);
    try {
      const response = await fetch("/api/admin/analytics/security", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signalId: selectedSignal.id,
          action: resolveAction,
          notes: resolveNotes,
        }),
      });

      if (!response.ok) throw new Error("Failed to resolve signal");

      toast.success("Signal resolved successfully");
      setResolveDialogOpen(false);
      setSelectedSignal(null);
      setResolveNotes("");
      setResolveAction("");
      fetchData();
    } catch (error) {
      console.error("Error resolving signal:", error);
      toast.error("Failed to resolve signal");
    } finally {
      setResolving(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case "CRITICAL": return "bg-red-500 text-white";
      case "HIGH": return "bg-orange-500 text-white";
      case "MEDIUM": return "bg-yellow-500 text-black";
      case "LOW": return "bg-blue-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getFraudTypeLabel = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Skeleton className="h-8 w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <p className="text-center text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <main className="flex-1 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Security & Fraud</h1>
              <p className="text-muted-foreground">
                Monitor fraud signals, suspicious activity, and account security
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="60">Last 60 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className={data.overview.pendingSignals > 0 ? "border-red-500" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Pending Signals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{data.overview.pendingSignals}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {data.overview.resolutionRate}% resolution rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" />
                Fraud Signals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.overview.fraudSignalsInPeriod}</div>
              <p className="text-xs text-muted-foreground mt-1">
                In the last {days} days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UserX className="h-4 w-4 text-red-500" />
                Suspended/Banned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-lg font-bold text-orange-500">{data.overview.suspendedUsersCount}</div>
                  <p className="text-xs text-muted-foreground">Suspended</p>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-500">{data.overview.bannedUsersCount}</div>
                  <p className="text-xs text-muted-foreground">Banned</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Globe className="h-4 w-4 text-purple-500" />
                Suspicious IPs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.overview.suspiciousIPsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Proxy/datacenter IPs detected
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Fraud by Severity & Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fraud by Severity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {data.fraudBySeverity.map((item) => (
                  <Badge key={item.severity} className={getSeverityColor(item.severity)}>
                    {item.severity}: {item.count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fraud by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.fraudByType.slice(0, 6).map((item) => (
                  <div key={item.type} className="flex items-center justify-between">
                    <span className="text-sm">{getFraudTypeLabel(item.type)}</span>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="signals" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="signals">Fraud Signals</TabsTrigger>
            <TabsTrigger value="users">Suspended/Banned</TabsTrigger>
            <TabsTrigger value="ips">Suspicious IPs</TabsTrigger>
            <TabsTrigger value="patterns">Suspicious Patterns</TabsTrigger>
            <TabsTrigger value="reviews">Flagged Reviews</TabsTrigger>
          </TabsList>

          {/* Fraud Signals */}
          <TabsContent value="signals">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Pending Fraud Signals
                </CardTitle>
                <CardDescription>
                  Unresolved fraud signals requiring review
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.recentFraudSignals.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-muted-foreground">No pending fraud signals</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentFraudSignals.map((signal) => (
                        <TableRow key={signal.id}>
                          <TableCell className="font-medium">
                            {getFraudTypeLabel(signal.type)}
                          </TableCell>
                          <TableCell>
                            <Badge className={getSeverityColor(signal.severity)}>
                              {signal.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {signal.user ? (
                              <div>
                                <div className="font-medium">{signal.user.name}</div>
                                <div className="text-xs text-muted-foreground">{signal.user.email}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {signal.description}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{Math.round(signal.confidence * 100)}%</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(signal.createdAt), "MMM d, HH:mm")}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedSignal(signal);
                                    setResolveDialogOpen(true);
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Resolve
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Suspended/Banned Users */}
          <TabsContent value="users">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5 text-orange-500" />
                    Suspended Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {data.suspendedUsers.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No suspended users</p>
                    ) : (
                      data.suspendedUsers.map((user) => (
                        <div key={user.id} className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                          {user.reason && (
                            <div className="text-sm text-orange-600 mt-1">{user.reason}</div>
                          )}
                          {user.until && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Until: {format(new Date(user.until), "MMM d, yyyy")}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Ban className="h-5 w-5 text-red-500" />
                    Banned Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {data.bannedUsers.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No banned users</p>
                    ) : (
                      data.bannedUsers.map((user) => (
                        <div key={user.id} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                          {user.reason && (
                            <div className="text-sm text-red-600 mt-1">{user.reason}</div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            Banned: {format(new Date(user.bannedAt), "MMM d, yyyy")}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Suspicious IPs */}
          <TabsContent value="ips">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="h-5 w-5 text-purple-500" />
                  Suspicious IP Addresses
                </CardTitle>
                <CardDescription>
                  Connections from proxy or datacenter IPs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Events</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.suspiciousIPs.map((ip, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">{ip.ip}</TableCell>
                        <TableCell>
                          <Badge variant={ip.type === "proxy" ? "destructive" : "secondary"}>
                            {ip.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{ip.eventCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Suspicious Patterns */}
          <TabsContent value="patterns">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Multiple IP Users</CardTitle>
                  <CardDescription>Users accessing from many different IPs</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {data.multiIPUsers.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded">
                        <div>
                          <div className="font-medium">
                            {item.user?.firstName} {item.user?.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">{item.user?.email}</div>
                        </div>
                        <Badge variant="secondary">{item.ipCount} IPs</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">High Activity Users</CardTitle>
                  <CardDescription>Users with unusually high event counts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {data.highFrequencyUsers.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded">
                        <div>
                          <div className="font-medium">
                            {item.user?.firstName} {item.user?.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">{item.user?.email}</div>
                        </div>
                        <Badge variant="secondary">{item.eventCount} events</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">High Cancellation Users</CardTitle>
                  <CardDescription>Users with many cancelled bookings (potential abuse)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {data.highCancellationUsers.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded">
                        <div>
                          <div className="font-medium">
                            {item.user?.firstName} {item.user?.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">{item.user?.email}</div>
                        </div>
                        <Badge variant="destructive">{item.cancellations} cancels</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Flagged Reviews */}
          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Flagged Reviews
                </CardTitle>
                <CardDescription>
                  Reviews that may be fake or suspicious
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rating</TableHead>
                      <TableHead>Comment</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Worker</TableHead>
                      <TableHead>Flag</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.flaggedReviews.map((review) => (
                      <TableRow key={review.id}>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            {review.rating}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{review.comment}</TableCell>
                        <TableCell>{review.customer}</TableCell>
                        <TableCell>{review.worker}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-orange-600">
                            {review.flag}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(review.createdAt), "MMM d")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Fraud Signal</DialogTitle>
            <DialogDescription>
              Take action on this fraud signal. You can optionally suspend or ban the user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedSignal && (
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={getSeverityColor(selectedSignal.severity)}>
                    {selectedSignal.severity}
                  </Badge>
                  <span className="font-medium">{getFraudTypeLabel(selectedSignal.type)}</span>
                </div>
                <p className="text-sm text-muted-foreground">{selectedSignal.description}</p>
                {selectedSignal.user && (
                  <p className="text-sm mt-2">
                    User: <strong>{selectedSignal.user.name}</strong> ({selectedSignal.user.email})
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={resolveAction} onValueChange={setResolveAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Select action (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No action on user</SelectItem>
                  <SelectItem value="warn">Warn user</SelectItem>
                  <SelectItem value="suspend">Suspend user (7 days)</SelectItem>
                  <SelectItem value="ban">Ban user permanently</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Resolution Notes</Label>
              <Textarea
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="Add notes about why this was resolved..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResolveSignal} disabled={resolving}>
              {resolving ? "Resolving..." : "Resolve Signal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
