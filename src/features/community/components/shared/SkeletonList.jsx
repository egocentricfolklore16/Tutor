import React from "react";

export function SkeletonList({ count = 3, height = "h-20" }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`w-full rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse ${height}`}
        />
      ))}
    </div>
  );
}
