import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

export default function SplashScreen({ onUnmount }) {
  const [exiting, setExiting] = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  const exitTriggeredRef = useRef(false);
  const exitTimerRef = useRef(null);
  const unmountTimerRef = useRef(null);

  // Lock body scroll while splash is active
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Handle automatic 2.0s timeline sequence
  useEffect(() => {
    // 1.5s: Begin 500ms fade-out phase
    exitTimerRef.current = setTimeout(() => {
      if (exitTriggeredRef.current) return;
      exitTriggeredRef.current = true;
      setExiting(true);

      // 2.0s total: Complete unmount
      unmountTimerRef.current = setTimeout(() => {
        setIsMounted(false);
        if (onUnmount) onUnmount();
      }, 500);
    }, 1500);

    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current);
    };
  }, [onUnmount]);

  // Tap or click skips splash screen immediately with quick fade-out
  const handleSkip = () => {
    if (exitTriggeredRef.current) return;
    exitTriggeredRef.current = true;

    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current);

    setExiting(true);
    unmountTimerRef.current = setTimeout(() => {
      setIsMounted(false);
      if (onUnmount) onUnmount();
    }, 200);
  };

  if (!isMounted) return null;

  const splashContent = (
    <div
      role="presentation"
      onClick={handleSkip}
      aria-label="Skip splash screen"
      className={`fixed inset-0 z-[9999] h-[100dvh] w-screen flex flex-col items-center justify-center select-none cursor-pointer pointer-events-auto transition-opacity duration-500 ease-in-out ${
        exiting ? "opacity-0" : "opacity-100"
      } bg-slate-50 text-slate-900 dark:bg-[#0F1115] dark:text-slate-100 animate-splash-bg`}
    >
      <div className="relative flex flex-col items-center justify-center p-6 text-center">
        {/* Soft green radial glow behind owl mascot */}
        <div className="absolute w-48 h-48 md:w-60 md:h-60 rounded-full bg-emerald-500/20 dark:bg-emerald-500/25 blur-2xl pointer-events-none animate-splash-glow" />

        {/* Owl Mascot Logo */}
        <div className="relative z-10 animate-splash-owl mb-4">
          <img
            src="/logo5-removebg-preview.png"
            alt="Hyper Tutor Owl Mascot"
            width={200}
            height={200}
            className="w-[160px] h-[160px] md:w-[200px] md:h-[200px] object-contain drop-shadow-md"
            loading="eager"
            decoding="async"
          />
        </div>

        {/* Wordmark and Tagline */}
        <div className="relative z-10 animate-splash-wordmark flex flex-col items-center">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-200 bg-clip-text text-transparent">
            Hyper Tutor
          </h1>
          <p className="mt-1 text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400">
            AI Learning Platform
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(splashContent, document.body);
}
