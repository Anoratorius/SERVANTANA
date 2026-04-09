"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { useTranslations } from "next-intl";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const t = useTranslations();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error" | "no-token">(
    token ? "loading" : "no-token"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;

    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(data.message || "Email verified successfully!");
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed");
        }
      } catch {
        setStatus("error");
        setMessage("An error occurred during verification");
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <BackButton href="/login" />
        {status === "loading" && (
          <div className="space-y-4">
            <Loader2 className="h-16 w-16 text-blue-500 mx-auto animate-spin" />
            <h1 className="text-2xl font-bold text-gray-900">Verifying your email...</h1>
            <p className="text-gray-600">Please wait while we verify your email address.</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold text-gray-900">Email Verified!</h1>
            <p className="text-gray-600">{message}</p>
            <p className="text-gray-600">You now have full access to your account.</p>
            <div className="pt-4">
              <Link href="/login">
                <Button className="w-full">Sign In to Your Account</Button>
              </Link>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <XCircle className="h-16 w-16 text-red-500 mx-auto" />
            <h1 className="text-2xl font-bold text-gray-900">Verification Failed</h1>
            <p className="text-gray-600">{message}</p>
            <div className="pt-4 space-y-3">
              <Link href="/login">
                <Button variant="outline" className="w-full">Go to Login</Button>
              </Link>
              <p className="text-sm text-gray-500">
                Need a new verification link? Sign in and request a new one from your dashboard.
              </p>
            </div>
          </div>
        )}

        {status === "no-token" && (
          <div className="space-y-4">
            <Mail className="h-16 w-16 text-gray-400 mx-auto" />
            <h1 className="text-2xl font-bold text-gray-900">Check Your Email</h1>
            <p className="text-gray-600">
              We have sent a verification link to your email address. Please click the link to verify your account.
            </p>
            <div className="bg-blue-50 rounded-lg p-4 mt-6">
              <p className="text-sm text-blue-800">
                <strong>Did not receive the email?</strong>
                <br />
                Check your spam folder or sign in to request a new verification email.
              </p>
            </div>
            <div className="pt-4">
              <Link href="/login">
                <Button variant="outline" className="w-full">Go to Login</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
