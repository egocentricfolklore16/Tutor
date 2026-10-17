import React from "react";
import { Sparkles } from "lucide-react";

export function EmptyState({ icon: IconComponent = Sparkles, title, description, action }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#14171c]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <IconComponent className="h-6 w-6" />
      </div>
      <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-slate-500 max-w-sm dark:text-slate-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
