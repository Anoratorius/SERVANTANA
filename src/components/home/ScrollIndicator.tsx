"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export function ScrollIndicator() {
  const [isAtBottom, setIsAtBottom] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Consider "at bottom" when within 100px of bottom
      setIsAtBottom(scrollTop + windowHeight >= documentHeight - 100);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial position

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = () => {
    if (isAtBottom) {
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Scroll to bottom
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-8 right-8 cursor-pointer p-3 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg transition-all duration-300 z-50 animate-bounce"
      aria-label={isAtBottom ? "Scroll to top" : "Scroll to bottom"}
    >
      {isAtBottom ? (
        <ChevronUp className="h-6 w-6 text-white" />
      ) : (
        <ChevronDown className="h-6 w-6 text-white" />
      )}
    </button>
  );
}
