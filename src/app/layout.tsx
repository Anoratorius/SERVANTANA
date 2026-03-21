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
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Servantana",
    startupImage: [
      { url: "/splash/splash-1170x2532.svg", media: "(device-width: 390px) and (device-height: 844px)" },
      { url: "/splash/splash-1284x2778.svg", media: "(device-width: 428px) and (device-height: 926px)" },
      { url: "/splash/splash-1290x2796.svg", media: "(device-width: 430px) and (device-height: 932px)" },
      { url: "/splash/splash-750x1334.svg", media: "(device-width: 375px) and (device-height: 667px)" },
      { url: "/splash/splash.svg" },
    ],
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
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          #splash-screen {
            position: fixed;
            inset: 0;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ffffff;
          }
          #splash-screen span {
            font-size: clamp(1.5rem, 6vw, 2.5rem);
            font-weight: 700;
            letter-spacing: 0.1em;
            background: linear-gradient(to right, #2563eb, #16a34a);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .splash-hidden { display: none !important; }
        `}} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${ethnocentric.variable} antialiased`}
      >
        <div id="splash-screen">
          <span style={{ fontFamily: 'var(--font-logo)' }}>SERVANTANA</span>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
          window.hideSplash = function() {
            var splash = document.getElementById('splash-screen');
            if (splash) splash.classList.add('splash-hidden');
          };
        `}} />
        {children}
      </body>
    </html>
  );
}
