"use client";

import { useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NotificationBell } from "./NotificationBell";
import { HeaderLocation } from "./HeaderLocation";
import { Menu, User, Settings, Calendar, MessageSquare, LogOut, Heart } from "lucide-react";

export function Header() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isLoginPage = pathname?.includes("/login");

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  }, [router]);

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  const userInitials = session?.user?.firstName && session?.user?.lastName
    ? `${session.user.firstName[0]}${session.user.lastName[0]}`
    : session?.user?.name?.split(" ").map(n => n[0]).join("") || "U";

  return (
    <header className="border-b bg-white sticky top-0 z-50 w-screen">
      <div className="relative w-full px-[5vw] py-4 flex items-center justify-between">
        {/* Left - Logo */}
        <div className="flex-shrink-0">
          <Link href="/" className="text-2xl uppercase bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-logo)' }}>
            {t("common.appName")}
          </Link>
        </div>

        {/* Center - Location (absolute center at 50vw) */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <HeaderLocation />
        </div>

        {/* Right - Actions */}
        <div className="flex-shrink-0 flex items-center gap-[2vw]">
          {isLoading ? (
            <div className="w-20 h-9 bg-muted animate-pulse rounded-md" />
          ) : isAuthenticated ? (
            <>
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={session?.user?.image || undefined} alt={session?.user?.name || ""} />
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{session?.user?.name}</p>
                    <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    {t("nav.dashboard")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/bookings" className="cursor-pointer">
                    <Calendar className="mr-2 h-4 w-4" />
                    {t("nav.bookings")}
                  </Link>
                </DropdownMenuItem>
                {session?.user?.role === "CUSTOMER" && (
                  <DropdownMenuItem asChild>
                    <Link href="/favorites" className="cursor-pointer">
                      <Heart className="mr-2 h-4 w-4" />
                      {t("nav.favorites")}
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/messages" className="cursor-pointer">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {t("nav.messages")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    {t("nav.settings")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {isSigningOut ? "..." : t("nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/login">
                <Button
                  variant={isLoginPage ? "default" : "ghost"}
                  size="sm"
                  className={isLoginPage ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {t("nav.login")}
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  variant={isLoginPage ? "ghost" : "default"}
                  size="sm"
                >
                  {t("nav.signup")}
                </Button>
              </Link>
            </div>
          )}

          <LanguageSwitcher />

          {/* Mobile Menu Button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <nav className="flex flex-col gap-4 mt-8">
                {!isAuthenticated && (
                  <>
                    <hr className="my-4" />
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button
                        variant={isLoginPage ? "default" : "outline"}
                        className={`w-full ${isLoginPage ? "bg-green-600 hover:bg-green-700" : ""}`}
                      >
                        {t("nav.login")}
                      </Button>
                    </Link>
                    <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                      <Button
                        variant={isLoginPage ? "outline" : "default"}
                        className="w-full"
                      >
                        {t("nav.signup")}
                      </Button>
                    </Link>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
