import React from "react";
import { Target } from "lucide-react";

export function DailyGoalRing({ currentMinutes = 0, targetMinutes = 30 }) {
  const percent = Math.min(100, Math.round((currentMinutes / targetMinutes) * 100));
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#18211f]">
      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
        <svg className="h-16 w-16 -rotate-90 transform" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r={radius}
            stroke="currentColor"
            strokeWidth="6"
            className="text-slate-100 dark:text-slate-800"
            fill="transparent"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            stroke="currentColor"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="text-emerald-500 transition-all duration-700 ease-out"
            fill="transparent"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-xs font-black text-slate-900 dark:text-white">{percent}%</span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Daily study goal
        </div>
        <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">
          {currentMinutes} / {targetMinutes} mins
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {percent >= 100 ? "Goal completed today!" : `${targetMinutes - currentMinutes} mins remaining`}
        </p>
      </div>
    </div>
  );
}

export default DailyGoalRing;
