import React, { useState, useEffect } from "react";
import { Bell, X, ShieldAlert, Smartphone } from "lucide-react";
import { useNotifications } from "../../hooks/useNotifications";

const DISMISSAL_KEY = "hyper-tutor-push-prompt-dismissed";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function NotificationPromptCard({ userId, onDismiss }) {
  const { permissionState, enable, loading, error } = useNotifications(userId);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!userId) {
      setVisible(false);
      return;
    }

    if (permissionState === "granted") {
      setVisible(false);
      return;
    }

    // Check dismissal timestamp
    try {
      const lastDismissed = localStorage.getItem(DISMISSAL_KEY);
      if (lastDismissed) {
        const timePassed = Date.now() - Number(lastDismissed);
        if (timePassed < SEVEN_DAYS_MS) {
          setVisible(false);
          return;
        }
      }
    } catch (e) {
      // Ignore storage errors
    }

    setVisible(true);
  }, [userId, permissionState]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISSAL_KEY, String(Date.now()));
    } catch (e) {
      // Ignore storage errors
    }
    setVisible(false);
    onDismiss?.();
  };

  if (!visible) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-950 shadow-sm transition-all dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-100">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-3 top-3 text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200"
        title="Dismiss prompt"
      >
        <X size={18} />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="rounded-xl bg-emerald-600 p-2 text-white shrink-0">
          <Bell size={20} />
        </div>

        <div className="flex-1">
          <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
            Never miss a study session or streak!
          </h4>
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
            Enable web push notifications to get reminders before scheduled sessions and streak alerts even when the tab is closed.
          </p>

          {error && <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400">{error}</p>}

          <div className="mt-3 flex items-center gap-3">
            {permissionState === "denied" ? (
              <div className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300">
                <ShieldAlert size={14} />
                <span>Notifications are blocked in your browser settings. Please enable permissions for this site.</span>
              </div>
            ) : permissionState === "ios-install-needed" ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-300">
                <Smartphone size={14} />
                <span>Tap "Share" and "Add to Home Screen" to enable notifications on iOS.</span>
              </div>
            ) : permissionState === "unsupported" ? (
              <span className="text-xs text-emerald-700 dark:text-emerald-400">
                This browser doesn't support push notifications.
              </span>
            ) : (
              <button
                type="button"
                onClick={enable}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <Bell size={14} />
                {loading ? "Enabling..." : "Enable notifications"}
              </button>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
