import React from "react";
import { Zap, Lock, CheckCircle2, Gift } from "lucide-react";
import { calculateXpLevel, LEVEL_MILESTONES, getNextLevelMilestone } from "../utils/levelCurve.js";

export function LevelProgressCard({ totalXp = 0, onMilestoneClick }) {
  const levelInfo = calculateXpLevel(totalXp);
  const { level, xpPoints, xpInCurrentLevel, xpForNextLevel, xpToNextLevel, xpProgressPercent } = levelInfo;
  const nextMilestone = getNextLevelMilestone(level);
  const isMaxMilestone = level >= nextMilestone.level;

  return (
    <section className="rounded-2xl border border-amber-200/80 bg-linear-to-br from-amber-50/70 via-white to-orange-50/50 p-5 shadow-surface dark:border-amber-900/40 dark:from-amber-950/20 dark:via-[#14171c] dark:to-orange-950/20">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-surface dark:bg-amber-600">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Level {level}
              </span>
              <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-extrabold text-amber-900 dark:bg-amber-500/30 dark:text-amber-200">
                {xpPoints.toLocaleString()} Total XP
              </span>
            </div>
            <h3 className="mt-0.5 text-lg font-black text-slate-900 dark:text-white">
              Level & XP Milestones
            </h3>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 rounded-xl bg-white/80 p-3.5 shadow-surface dark:bg-white/5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
          <span>Level {level}</span>
          <span>
            {xpInCurrentLevel} / {xpForNextLevel} XP
          </span>
          <span>Level {level + 1}</span>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
            style={{ width: `${xpProgressPercent}%` }}
          />
        </div>
        <p className="mt-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400">
          {xpToNextLevel} XP needed for Level {level + 1}
        </p>
      </div>

      {/* Milestone Preview Box */}
      <div className="mt-4 rounded-xl border border-amber-200/60 bg-white/90 p-4 shadow-surface dark:border-amber-900/30 dark:bg-[#18211f]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <p className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
              {isMaxMilestone ? "Highest Milestone Reached!" : `Next Major Milestone: Level ${nextMilestone.level}`}
            </p>
          </div>
          {!isMaxMilestone && (
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
              <Lock className="h-3 w-3" /> Locked
            </span>
          )}
        </div>

        <div className="mt-2.5 flex items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
              {nextMilestone.title}
            </h4>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              {nextMilestone.perk}
            </p>
          </div>
        </div>
      </div>

      {/* Milestones List */}
      <div className="mt-4 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Milestone Roadmap</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {LEVEL_MILESTONES.map((m) => {
            const isUnlocked = level >= m.level;
            return (
              <div
                key={m.level}
                onClick={() => onMilestoneClick?.(m)}
                className={`flex items-center gap-2.5 rounded-xl border p-2.5 transition ${
                  isUnlocked
                    ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                    : "border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40 opacity-75"
                }`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    isUnlocked
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {isUnlocked ? <CheckCircle2 className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`truncate text-xs font-bold ${isUnlocked ? "text-emerald-900 dark:text-emerald-200" : "text-slate-700 dark:text-slate-300"}`}>
                      Level {m.level}: {m.title}
                    </p>
                  </div>
                  <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                    {m.perk}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default LevelProgressCard;
