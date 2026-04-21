"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BackButton } from "@/components/ui/back-button";
import {
  FileText,
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Trash2,
  Eye,
  Shield,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface Document {
  id: string;
  type: string;
  status: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  expiresAt: string | null;
  rejectionNote: string | null;
  createdAt: string;
  verifiedAt: string | null;
  verifiedBy: { firstName: string; lastName: string } | null;
}

const DOCUMENT_TYPES = [
  { value: "GOVERNMENT_ID", label: "Government ID" },
  { value: "DRIVERS_LICENSE", label: "Driver's License" },
  { value: "PASSPORT", label: "Passport" },
  { value: "BUSINESS_LICENSE", label: "Business License" },
  { value: "INSURANCE_CERTIFICATE", label: "Insurance Certificate" },
  { value: "BACKGROUND_CHECK", label: "Background Check" },
  { value: "OTHER", label: "Other Document" },
];

export default function DocumentsPage() {
  const router = useRouter();
  const t = useTranslations();
  const { data: session, status: authStatus } = useSession();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedType, setSelectedType] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    } else if (authStatus === "authenticated" && session?.user?.role !== "WORKER") {
      router.push("/dashboard");
    }
  }, [authStatus, session, router]);

  useEffect(() => {
    if (authStatus === "authenticated" && session?.user?.role === "WORKER") {
      fetchDocuments();
    }
  }, [authStatus, session]);

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/worker/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedType) {
      toast.error("Please select a file and document type");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("type", selectedType);
      if (expiresAt) {
        formData.append("expiresAt", expiresAt);
      }

      const res = await fetch("/api/worker/documents", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        toast.success("Document uploaded successfully");
        setSelectedFile(null);
        setSelectedType("");
        setExpiresAt("");
        fetchDocuments();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to upload document");
      }
    } catch {
      toast.error("Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const res = await fetch(`/api/worker/documents/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Document deleted");
        fetchDocuments();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete document");
      }
    } catch {
      toast.error("Failed to delete document");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        );
      case "VERIFIED":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (authStatus === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        
        <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </div>
        </main>
        
      </div>
    );
  }

  const verifiedCount = documents.filter((d) => d.status === "VERIFIED").length;
  const pendingCount = documents.filter((d) => d.status === "PENDING").length;

  return (
    <div className="min-h-screen flex flex-col">
      

      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <BackButton />
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
              <Shield className="h-6 w-6" />
              Document Verification
            </h1>
            <p className="text-muted-foreground mt-1">
              Upload documents to verify your identity and qualifications
            </p>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{verifiedCount}</p>
                <p className="text-sm text-muted-foreground">Verified</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </CardContent>
            </Card>
            <Card className="col-span-2">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  {verifiedCount > 0 ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-sm font-medium text-green-700">
                        Your profile is verified
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      <span className="text-sm font-medium text-yellow-700">
                        Upload at least one document to get verified
                      </span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upload Form */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload New Document
              </CardTitle>
              <CardDescription>
                Supported formats: JPEG, PNG, WebP, PDF (max 20MB)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Expiration Date (optional)</Label>
                  <Input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>File</Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>

              <Button
                onClick={handleUpload}
                disabled={isUploading || !selectedFile || !selectedType}
                className="w-full"
              >
                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Upload Document
              </Button>
            </CardContent>
          </Card>

          {/* Documents List */}
          <Card>
            <CardHeader>
              <CardTitle>Your Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-start justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">
                            {DOCUMENT_TYPES.find((t) => t.value === doc.type)?.label ||
                              doc.type}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {doc.fileName} • {formatFileSize(doc.fileSize)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                          </p>
                          {doc.status === "REJECTED" && doc.rejectionNote && (
                            <p className="text-sm text-red-600 mt-2">
                              Rejection reason: {doc.rejectionNote}
                            </p>
                          )}
                          {doc.status === "VERIFIED" && doc.verifiedAt && (
                            <p className="text-xs text-green-600 mt-1">
                              Verified {new Date(doc.verifiedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(doc.status)}
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </a>
                        {doc.status !== "VERIFIED" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(doc.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      
    </div>
  );
}
