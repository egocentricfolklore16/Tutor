import { useEffect, useState, useRef } from "react";

export default function SplashScreen({ appReady = true, onUnmount }) {
  const [exiting, setExiting] = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  const sequenceFinishedRef = useRef(false);
  const exitTriggeredRef = useRef(false);

  // Lock body scroll while splash is active
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Handle exit phase and unmount cleanup
  const triggerExit = () => {
    if (exitTriggeredRef.current) return;
    exitTriggeredRef.current = true;
    setExiting(true);

    const unmountTimer = setTimeout(() => {
      setIsMounted(false);
      if (onUnmount) onUnmount();
    }, 400);

    return unmountTimer;
  };

  useEffect(() => {
    // Sequence completes after ~2.2s
    const sequenceTimer = setTimeout(() => {
      sequenceFinishedRef.current = true;
      if (appReady) {
        triggerExit();
      }
    }, 2200);

    return () => {
      clearTimeout(sequenceTimer);
    };
  }, []);

  // Hold on final frame if app is not ready yet, then exit as soon as app is ready
  useEffect(() => {
    if (sequenceFinishedRef.current && appReady) {
      triggerExit();
    }
  }, [appReady]);

  if (!isMounted) return null;

  return (
    <div
      role="presentation"
      onClick={triggerExit}
      aria-label="Skip splash screen"
      className={`fixed inset-0 z-[100] h-[100dvh] w-screen flex flex-col items-center justify-center select-none cursor-pointer transition-all duration-400 ease-in-out ${
        exiting ? "opacity-0 -translate-y-4 pointer-events-none" : "opacity-100 translate-y-0"
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
}
