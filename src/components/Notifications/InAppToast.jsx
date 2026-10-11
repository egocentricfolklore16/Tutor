import React from "react";
import { Bell, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useInAppNotifications } from "../../hooks/useInAppNotifications";

export default function InAppToast() {
  const { activeToast, dismissToast, markAsRead } = useInAppNotifications();
  const navigate = useNavigate();

  if (!activeToast) return null;

  const handleTap = () => {
    if (activeToast.notification?.id) {
      markAsRead(activeToast.notification.id);
    }
    dismissToast();
    if (activeToast.route) {
      navigate(activeToast.route);
    }
  };

  return (
    <div
      onClick={handleTap}
      className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-[999] cursor-pointer rounded-2xl border border-emerald-300 bg-white/95 p-3.5 shadow-2xl backdrop-blur-md dark:border-emerald-800 dark:bg-[#14171c]/95 dark:text-white transition-all transform animate-in slide-in-from-top-4 duration-300"
    >
      <div className="flex items-start gap-3">
        {activeToast.avatar ? (
          <img
            src={activeToast.avatar}
            alt={activeToast.title}
            className="h-9 w-9 rounded-full object-cover shrink-0 ring-2 ring-emerald-500"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 ring-2 ring-emerald-500">
            <Bell className="h-4 w-4" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
            {activeToast.title}
          </p>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
            {activeToast.text}
          </p>
        </div>

        <button
          type="button"
          aria-label="Dismiss toast"
          onClick={(e) => {
            e.stopPropagation();
            dismissToast();
          }}
          className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
