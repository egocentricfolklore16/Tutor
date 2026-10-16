import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export function ErrorState({ message = "Something went wrong loading data", onRetry }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
      <AlertCircle className="h-8 w-8 text-rose-600 dark:text-rose-400" />
      <p className="mt-2 text-xs font-bold text-rose-800 dark:text-rose-200">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 rounded-2xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-button-primary hover:bg-rose-700 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
}
