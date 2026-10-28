import React, { useState, useEffect } from "react";
import { Smartphone, X, Zap, WifiOff, Bell, Share2, PlusSquare, Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAITutor } from "../app/AITutorContext";
import { Card, Button, Badge } from "./common/UIKit";

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

  const isStandalone =
    (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches) ||
    (typeof navigator !== "undefined" && (navigator as unknown as { standalone?: boolean }).standalone === true);

  const isStudySession = location.pathname.startsWith("/Study/") && location.pathname !== "/Study";

  useEffect(() => {
    if (!userId || isStandalone) {
      setVisible(false);
      return;
    }

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
      console.error("Error reading install prompt dismissal:", e);
    }

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
      console.error("Error writing install prompt dismissal:", e);
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

  const isChatThread =
    location.pathname.toLowerCase().includes("/chat/") &&
    location.pathname.toLowerCase().split("/chat/")[1]?.trim().length > 0;

  if (!visible || !userId || isStandalone || isStudySession || isAiChatOpen || isChatThread) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[80] md:bottom-6 md:left-auto md:right-6 md:w-96">
      <Card variant="elevated" padding="p-4" className="relative border-violet-200 dark:border-violet-900/40">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          aria-label="Close install prompt"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-500/20">
            <Smartphone size={20} />
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Install Hyper Tutor App
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Add to your home screen for quick offline access and instant notifications.
            </p>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <Badge variant="violet" size="sm" icon={Zap}>
                Faster
              </Badge>
              <Badge variant="mint" size="sm" icon={WifiOff}>
                Offline
              </Badge>
              <Badge variant="amber" size="sm" icon={Bell}>
                Alerts
              </Badge>
            </div>

            {isIos && showIosGuide && (
              <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/80 p-3 text-xs text-violet-950 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
                <p className="font-semibold text-violet-900 dark:text-violet-300">
                  To install on iOS:
                </p>
                <ol className="mt-1.5 space-y-1 text-[11px]">
                  <li>
                    1. Tap <Share2 size={11} className="inline text-violet-600" /> <strong>Share</strong> in Safari.
                  </li>
                  <li>
                    2. Tap <PlusSquare size={11} className="inline text-violet-600" /> <strong>Add to Home Screen</strong>.
                  </li>
                </ol>
              </div>
            )}

            <div className="mt-3 flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={handleDismiss}>
                Dismiss
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleInstallClick}
                isLoading={isInstalling}
                className="font-bold"
              >
                Add to Home Screen
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
