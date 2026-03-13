import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { getLocale } from "next-intl/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const ethnocentric = localFont({
  src: "../../public/fonts/ethnocentric.ttf",
  variable: "--font-logo",
});

export const metadata: Metadata = {
  title: "Servantana - Find Trusted Cleaners",
  description: "Book professional cleaning services in minutes. Verified cleaners, transparent pricing, and hassle-free booking.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Servantana",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

type Props = {
  children: React.ReactNode;
};

export default async function RootLayout({ children }: Props) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${ethnocentric.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
