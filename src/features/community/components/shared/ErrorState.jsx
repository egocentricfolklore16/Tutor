import React from "react";
import { AlertCircle } from "lucide-react";

export function ErrorState({ title = "Something went wrong", message, onRetry }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-rose-200 bg-rose-50/60 p-8 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
      <AlertCircle className="h-8 w-8 text-rose-600" />
      <h3 className="mt-2 text-sm font-bold text-rose-900 dark:text-rose-200">{title}</h3>
      {message && <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">{message}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
