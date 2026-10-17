import React from "react";
import { Zap, Clock, Flame } from "lucide-react";

export default function MetricTabs({ metric, onChange }) {
  const metrics = [
    { id: "xp", label: "XP", icon: Zap },
    { id: "hours", label: "Hours", icon: Clock },
    { id: "streak", label: "Streak", icon: Flame },
  ];

  return (
    <div
      className="flex gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-[#18211f]"
      role="tablist"
      aria-label="Leaderboard metric"
    >
      {metrics.map((m) => {
        const Icon = m.icon;
        const isActive = metric === m.id;
        return (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(m.id)}
            className={`flex flex-1 min-h-[36px] items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              isActive
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
