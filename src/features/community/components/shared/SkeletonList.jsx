import React from "react";

export function SkeletonList({ count = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#14171c] animate-pulse"
        >
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-2">
              <div className="h-3.5 w-32 rounded-md bg-slate-200 dark:bg-slate-800" />
              <div className="h-2.5 w-20 rounded-md bg-slate-100 dark:bg-slate-800/60" />
            </div>
          </div>
          <div className="h-4 w-16 rounded-md bg-slate-200 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  );
}
