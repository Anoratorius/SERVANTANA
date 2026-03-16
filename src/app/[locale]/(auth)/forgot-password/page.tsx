"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail,
  Phone,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle,
  KeyRound,
  Shield,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";

type Step = "identifier" | "verify" | "reset" | "success";
type ResetType = "email" | "phone";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("identifier");
  const [resetType, setResetType] = useState<ResetType>("email");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [maskedIdentifier, setMaskedIdentifier] = useState("");

  const handleRequestCode = async () => {
    if (!identifier.trim()) {
      toast.error(resetType === "email" ? "Please enter your email" : "Please enter your phone number");
      return;
    }

    // Basic validation
    if (resetType === "email" && !identifier.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          type: resetType,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMaskedIdentifier(data.message);
        setStep("verify");
        toast.success("Verification code sent!");
      } else {
        toast.error(data.error || "Failed to send reset code");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          code,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep("reset");
        toast.success("Code verified!");
      } else {
        toast.error(data.error || "Invalid code");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      toast.error("Password must contain uppercase, lowercase, and a number");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          code,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep("success");
        toast.success("Password reset successfully!");
      } else {
        toast.error(data.error || "Failed to reset password");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          type: resetType,
        }),
      });

      if (response.ok) {
        toast.success("New code sent!");
        setCode("");
      } else {
        toast.error("Failed to resend code");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white py-12">
        <div className="container mx-auto px-4 max-w-md">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {["identifier", "verify", "reset", "success"].map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s
                      ? "bg-blue-500 text-white"
                      : ["identifier", "verify", "reset", "success"].indexOf(step) > i
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {["identifier", "verify", "reset", "success"].indexOf(step) > i ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < 3 && (
                  <div
                    className={`w-8 h-1 ${
                      ["identifier", "verify", "reset", "success"].indexOf(step) > i
                        ? "bg-green-500"
                        : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <Card>
            {/* Step 1: Enter Email or Phone */}
            {step === "identifier" && (
              <>
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <KeyRound className="h-8 w-8 text-blue-500" />
                  </div>
                  <CardTitle className="text-2xl">Forgot Password?</CardTitle>
                  <CardDescription>
                    No worries! Enter your email or phone number and we&apos;ll send you a reset code.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Tabs value={resetType} onValueChange={(v) => setResetType(v as ResetType)}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="email" className="gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </TabsTrigger>
                      <TabsTrigger value="phone" className="gap-2">
                        <Phone className="h-4 w-4" />
                        Phone
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="space-y-2">
                    <Label htmlFor="identifier">
                      {resetType === "email" ? "Email Address" : "Phone Number"}
                    </Label>
                    <Input
                      id="identifier"
                      type={resetType === "email" ? "email" : "tel"}
                      placeholder={resetType === "email" ? "john@example.com" : "+1234567890"}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRequestCode()}
                    />
                  </div>

                  <Button
                    onClick={handleRequestCode}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4 mr-2" />
                    )}
                    Send Reset Code
                  </Button>

                  <div className="text-center">
                    <Link href="/login">
                      <Button variant="ghost" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Login
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </>
            )}

            {/* Step 2: Verify Code */}
            {step === "verify" && (
              <>
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                    <Shield className="h-8 w-8 text-purple-500" />
                  </div>
                  <CardTitle className="text-2xl">Enter Verification Code</CardTitle>
                  <CardDescription>{maskedIdentifier}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="code">6-Digit Code</Label>
                    <Input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                      onKeyDown={(e) => e.key === "Enter" && handleVerifyCode()}
                      className="text-center text-2xl tracking-widest font-mono"
                    />
                  </div>

                  <Button
                    onClick={handleVerifyCode}
                    disabled={isLoading || code.length !== 6}
                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4 mr-2" />
                    )}
                    Verify Code
                  </Button>

                  <div className="flex justify-between items-center text-sm">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep("identifier")}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Change {resetType}
                    </Button>
                    <button
                      onClick={handleResendCode}
                      disabled={isLoading}
                      className="text-blue-600 hover:underline"
                    >
                      Resend Code
                    </button>
                  </div>
                </CardContent>
              </>
            )}

            {/* Step 3: Reset Password */}
            {step === "reset" && (
              <>
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <KeyRound className="h-8 w-8 text-green-500" />
                  </div>
                  <CardTitle className="text-2xl">Create New Password</CardTitle>
                  <CardDescription>
                    Choose a strong password with at least 8 characters.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Must contain uppercase, lowercase, and a number
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
                    />
                  </div>

                  {/* Password strength indicator */}
                  {password && (
                    <div className="space-y-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded ${
                              password.length >= i * 3 &&
                              (i < 3 || /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password))
                                ? i <= 2
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                                : "bg-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className={password.length >= 8 ? "text-green-600" : "text-gray-400"}>
                          ✓ 8+ characters
                        </span>
                        <span className={/[A-Z]/.test(password) ? "text-green-600" : "text-gray-400"}>
                          ✓ Uppercase
                        </span>
                        <span className={/[a-z]/.test(password) ? "text-green-600" : "text-gray-400"}>
                          ✓ Lowercase
                        </span>
                        <span className={/\d/.test(password) ? "text-green-600" : "text-gray-400"}>
                          ✓ Number
                        </span>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleResetPassword}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Reset Password
                  </Button>
                </CardContent>
              </>
            )}

            {/* Step 4: Success */}
            {step === "success" && (
              <>
                <CardHeader className="text-center">
                  <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="h-10 w-10 text-green-500" />
                  </div>
                  <CardTitle className="text-2xl text-green-600">Password Reset!</CardTitle>
                  <CardDescription>
                    Your password has been successfully reset. You can now log in with your new password.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => router.push("/login")}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600"
                  >
                    Go to Login
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
