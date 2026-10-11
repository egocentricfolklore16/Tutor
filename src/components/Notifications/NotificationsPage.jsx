import React, { useState, useEffect } from "react";
import { ArrowLeft, BellRing, CheckCheck, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useInAppNotifications } from "../../hooks/useInAppNotifications";
import NotificationCenter from "./NotificationCenter";
import ErrorBoundary from "../common/ErrorBoundary";

export default function NotificationsPage() {
  const navigate = useNavigate();

  return (
    <ErrorBoundary>
      <div className="min-h-[100dvh] w-full bg-slate-50 dark:bg-[#14171c] dark:text-slate-100 flex flex-col">
        {/* Mobile Full Page Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-[#14171c]/95">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-full p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                Notifications
              </h1>
            </div>
          </div>
        </div>

        {/* Render notification content full width */}
        <div className="flex-1 p-3 sm:p-6 max-w-2xl mx-auto w-full">
          <NotificationCenter inlineMode={true} onClose={() => navigate(-1)} />
        </div>
      </div>
    </ErrorBoundary>
  );
}
