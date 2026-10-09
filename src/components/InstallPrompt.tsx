import React, { useState, useEffect } from "react";
import { Smartphone, X, Zap, WifiOff, Bell, Share2, PlusSquare, Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAITutor } from "../app/AITutorContext";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const INSTALL_DISMISSAL_KEY = "hyper-tutor-install-prompt-dismissed";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface InstallPromptProps {
  userId?: string | null;
}

export default function InstallPrompt({ userId }: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [visible, setVisible] = useState(false);

  const location = useLocation();
  const { isOpen: isAiChatOpen } = useAITutor();

  // Check standalone mode
  const isStandalone =
    (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches) ||
    (typeof navigator !== "undefined" && (navigator as unknown as { standalone?: boolean }).standalone === true);

  // Active study session route check
  const isStudySession = location.pathname.startsWith("/Study/") && location.pathname !== "/Study";

  useEffect(() => {
    if (!userId || isStandalone) {
      setVisible(false);
      return;
    }

    // Check dismissal timestamp from localStorage
    try {
      const lastDismissed = localStorage.getItem(INSTALL_DISMISSAL_KEY);
      if (lastDismissed) {
        const timestamp = Number(lastDismissed);
        if (!isNaN(timestamp) && Date.now() - timestamp < SEVEN_DAYS_MS) {
          setVisible(false);
          return;
        }
      }
    } catch (e) {
      console.error("Error reading install prompt dismissal from localStorage:", e);
    }

    // Detect iOS
    if (typeof navigator !== "undefined") {
      const userAgent = navigator.userAgent || "";
      const iosDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
      setIsIos(iosDevice);

      if (iosDevice) {
        const timer = setTimeout(() => {
          setVisible(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }

    // Android/Desktop Chrome beforeinstallprompt handler
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const handleAppInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [userId, isStandalone]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(INSTALL_DISMISSAL_KEY, String(Date.now()));
    } catch (e) {
      console.error("Error writing install prompt dismissal to localStorage:", e);
    }
    setVisible(false);
  };

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setVisible(false);
      }
    } catch (err) {
      console.error("Error triggering install prompt:", err);
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  // Guard conditions: do not show if not visible, no user, standalone, active study session, or AI chat open
  if (!visible || !userId || isStandalone || isStudySession || isAiChatOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-[calc(9.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-[80] animate-slide-up sm:right-auto sm:w-[380px] md:bottom-6 md:left-6">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-4 text-slate-900 shadow-xl backdrop-blur-md transition-all dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-100">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Close install prompt"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
            <Smartphone size={22} />
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <h3 className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
              Install Hyper Tutor
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Add to your home screen for mobile notifications & fast access
            </p>

            {/* Chips */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                <Zap size={11} />
                Faster access
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                <WifiOff size={11} />
                Works offline
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                <Bell size={11} />
                Notifications
              </span>
            </div>

            {/* iOS Step-by-Step Guide */}
            {isIos && showIosGuide && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                <p className="font-semibold text-emerald-900 dark:text-emerald-300">
                  To install on iPhone / iPad:
                </p>
                <ol className="mt-1.5 space-y-1 pl-1 text-[11px]">
                  <li className="flex items-center gap-1.5">
                    1. Tap the <Share2 size={12} className="inline text-emerald-600 dark:text-emerald-400" /> <strong>Share</strong> button in Safari's bottom toolbar.
                  </li>
                  <li className="flex items-center gap-1.5">
                    2. Scroll down and tap <PlusSquare size={12} className="inline text-emerald-600 dark:text-emerald-400" /> <strong>Add to Home Screen</strong>.
                  </li>
                  <li>3. Tap <strong>Add</strong> in the top right corner.</li>
                </ol>
                <p className="mt-2 text-[10px] text-emerald-700 dark:text-emerald-400">
                  Note: Web push notifications on iPhone require adding to the home screen (iOS 16.4+).
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {isInstalling ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Installing…
                  </>
                ) : (
                  "Add to home screen"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
