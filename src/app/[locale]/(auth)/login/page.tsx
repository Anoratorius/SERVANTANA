"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/layout";
import { HeroBackground } from "@/components/home/HeroBackground";

function LoginForm() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(error ? "Invalid credentials" : "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      // Store remember me preference in cookie before signing in
      if (rememberMe) {
        document.cookie = "remember-me=true; path=/; max-age=2592000"; // 30 days
      } else {
        document.cookie = "remember-me=; path=/; max-age=0";
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setErrorMessage("Invalid email or password");
      } else {
        // Force full page reload to ensure session cookies are properly set
        window.location.href = callbackUrl;
      }
    } catch {
      setErrorMessage("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md relative z-10">
      <CardHeader className="text-center">
        <div className="mb-4">
          <Link href="/" className="text-2xl uppercase bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-logo)' }}>
            {t("common.appName")}
          </Link>
        </div>
        <CardTitle className="text-2xl">{t("auth.login.title")}</CardTitle>
        <CardDescription className="font-bold">{t("auth.login.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        {errorMessage && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="nope">
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.login.email")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="nope"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.login.password")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="new-password"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              {t("auth.login.rememberMe")}
            </label>
            <Link href="/forgot-password" className="text-primary hover:underline">
              {t("auth.login.forgotPassword")}
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("auth.login.loginButton")
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {t("auth.login.noAccount")}{" "}
          <Link href="/signup" className="text-primary hover:underline">
            {t("auth.login.signupLink")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function LoginFormSkeleton() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <Skeleton className="h-8 w-32 mx-auto mb-4" />
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-40 mx-auto mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center bg-muted/30 px-4">
        <HeroBackground />
        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
