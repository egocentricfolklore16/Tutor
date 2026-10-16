import React from "react";
import { Globe, Users, Shield, Award } from "lucide-react";

export function FeedFilters({ activeFilter, onSelectFilter }) {
  const filters = [
    { id: "all", label: "All Activity", icon: Globe },
    { id: "friends", label: "Friends", icon: Users },
    { id: "groups", label: "My Groups", icon: Shield },
    { id: "milestones", label: "Milestones", icon: Award },
  ];

  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar rounded-2xl bg-slate-100 p-1.5 dark:bg-[#18211f]" role="tablist" aria-label="Activity Feed Filter">
      {filters.map((f) => {
        const Icon = f.icon;
        const isActive = activeFilter === f.id;
        return (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelectFilter(f.id)}
            className={`flex min-h-[44px] flex-1 min-w-[100px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              isActive
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{f.label}</span>
          </button>
        );
      })}
    </div>
  );
}
