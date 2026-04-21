"use client";

import { Header, Footer } from "@/components/layout";
import { BackButton } from "@/components/ui/back-button";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container mx-auto px-4 pt-4 max-w-5xl">
        <BackButton />
      </div>
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
