import React from "react";
import { Globe, Users, Shield } from "lucide-react";

export default function ScopeTabs({ scope, onChange }) {
  const scopes = [
    { id: "global", label: "Global", icon: Globe },
    { id: "friends", label: "Friends", icon: Users },
    { id: "group", label: "Group", icon: Shield },
  ];

  return (
    <div
      className="flex gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-[#18211f]"
      role="tablist"
      aria-label="Leaderboard scope"
    >
      {scopes.map((s) => {
        const Icon = s.icon;
        const isActive = scope === s.id;
        return (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(s.id)}
            className={`flex flex-1 min-h-[36px] items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              isActive
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}
