import React from "react";
import { Zap } from "lucide-react";

export function LevelProgress({ level, xpPoints, xpProgressPercent, xpToNextLevel }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-surface dark:bg-[#18211f]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Level {level}</p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">{xpPoints} XP</p>
          </div>
        </div>
        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
          {xpToNextLevel} XP to Level {level + 1}
        </span>
      </div>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-amber-400 transition-all duration-500 dark:bg-amber-500"
          style={{ width: `${Math.min(100, Math.max(0, xpProgressPercent))}%` }}
        />
      </div>
    </div>
  );
}

export default LevelProgress;
