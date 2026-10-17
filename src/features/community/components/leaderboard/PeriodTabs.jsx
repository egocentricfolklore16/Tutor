import React from "react";

export default function PeriodTabs({ period, onChange }) {
  const periods = [
    { id: "weekly", label: "Weekly" },
    { id: "monthly", label: "Monthly" },
    { id: "all_time", label: "All Time" },
  ];

  return (
    <div
      className="flex gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-[#18211f]"
      role="tablist"
      aria-label="Leaderboard period"
    >
      {periods.map((p) => {
        const isActive = period === p.id;
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(p.id)}
            className={`flex-1 min-h-[36px] rounded-xl py-1.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              isActive
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
