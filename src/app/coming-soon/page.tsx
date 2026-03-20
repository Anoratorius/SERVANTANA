"use client";

import { useEffect, useState } from "react";

export default function ComingSoonPage() {
  const [ip, setIp] = useState<string>("");

  useEffect(() => {
    fetch("/api/ip")
      .then((res) => res.json())
      .then((data) => setIp(data.ip))
      .catch(() => setIp("unknown"));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-emerald-800 mb-2">Servantana</h1>
          <div className="w-24 h-1 bg-emerald-500 mx-auto rounded-full"></div>
        </div>

        <h2 className="text-3xl font-semibold text-gray-800 mb-4">
          Coming Soon
        </h2>

        <p className="text-gray-600 text-lg mb-8">
          We&apos;re working hard to bring you something amazing. Stay tuned!
        </p>

        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 shadow-lg">
          <p className="text-sm text-gray-500">
            Your IP: <span className="font-mono text-gray-700">{ip || "detecting..."}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
