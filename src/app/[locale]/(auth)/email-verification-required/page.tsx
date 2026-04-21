"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, LogOut, CheckCircle } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { Header } from "@/components/layout";
import { HeroBackground } from "@/components/home/HeroBackground";
import { toast } from "sonner";

export default function EmailVerificationRequiredPage() {
  const t = useTranslations();
  const router = useRouter();
  const { data: session } = useSession();
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleResend = async () => {
    setIsResending(true);
    setResendSuccess(false);

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setResendSuccess(true);
        toast.success(t("emailVerification.resendSuccess"));
      } else {
        toast.error(data.error || t("emailVerification.resendFailed"));
      }
    } catch {
      toast.error(t("emailVerification.resendFailed"));
    } finally {
      setIsResending(false);
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center bg-muted/30 px-4">
        <HeroBackground />
        <Card className="w-full max-w-md relative z-10">
          <CardHeader className="text-center">
            <BackButton />
            <div className="mb-4">
              <Link href="/" className="text-2xl uppercase bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-logo)' }}>
                {t("common.appName")}
              </Link>
            </div>
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t("emailVerification.title")}</CardTitle>
            <CardDescription className="font-medium">
              {t("emailVerification.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center text-sm text-muted-foreground">
              <p>{t("emailVerification.description")}</p>
              {session?.user?.email && (
                <p className="font-semibold text-foreground mt-2">
                  {session.user.email}
                </p>
              )}
            </div>

            {resendSuccess && (
              <div className="bg-green-500/10 text-green-700 dark:text-green-400 text-sm p-3 rounded-md flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {t("emailVerification.emailSent")}
              </div>
            )}

            <Button
              onClick={handleResend}
              variant="outline"
              className="w-full"
              disabled={isResending}
            >
              {isResending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              {t("emailVerification.resendButton")}
            </Button>

            <div className="pt-4 border-t">
              <p className="text-center text-sm text-muted-foreground mb-3">
                {t("emailVerification.wrongAccount")}
              </p>
              <Button
                onClick={handleSignOut}
                variant="ghost"
                className="w-full text-muted-foreground"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t("nav.logout")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
