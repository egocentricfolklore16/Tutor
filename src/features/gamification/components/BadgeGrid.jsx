import React from "react";
import { Check, CheckCircle2, Lock, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import AchievementIcon from "../../../components/common/AchievementIcon";
import { sortBadges } from "../utils/badgeUtils";

/**
 * BadgeGrid component for rendering achievement badges in compact (card preview) or full grid layout.
 * Supports locked/unlocked states, progress bars, and honest loading/empty/error states.
 */
export default function BadgeGrid({
  badges = [],
  loading = false,
  error = null,
  compact = false,
  limit = null,
  onBadgeClick = null,
  onRetry = null,
}) {
  if (loading) {
    return (
      <div className="flex min-h-[140px] items-center justify-center gap-2 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 p-4">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-600 dark:text-emerald-400" />
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading badges...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 p-4 text-center border border-rose-200 dark:border-rose-900/40">
        <AlertCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
        <p className="mt-1.5 text-xs font-bold text-rose-900 dark:text-rose-200">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-rose-700"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        )}
      </div>
    );
  }

  const sortedBadges = sortBadges(badges);
  const displayBadges = limit ? sortedBadges.slice(0, limit) : sortedBadges;

  if (displayBadges.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
        No achievement badges available yet.
      </div>
    );
  }

  if (compact) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {displayBadges.map((badge) => {
          const isEarned = Boolean(badge.earned);
          const progress = badge.progress || 0;
          const target = badge.target || 1;

          return (
            <div
              key={badge.id || badge.title}
              onClick={() => onBadgeClick?.(badge)}
              className={`flex flex-col items-center justify-between rounded-xl border border-current/20 p-2.5 text-center transition ${
                onBadgeClick ? "cursor-pointer hover:scale-102" : ""
              } ${isEarned ? "bg-white/80 dark:bg-white/10" : "bg-white/40 dark:bg-slate-800/40 opacity-70"}`}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-current/15">
                {isEarned ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <AchievementIcon icon={badge.icon} className="h-4 w-4" textClassName="text-xs font-bold" />
                )}
              </span>
              <p className="mt-1.5 text-[11px] font-semibold leading-3.5 line-clamp-2">
                {badge.title}
              </p>
              <div className="mt-1 text-[10px] font-bold opacity-80">
                {isEarned ? (
                  <span className="text-emerald-700 dark:text-emerald-400">Earned</span>
                ) : (
                  <span>
                    {progress}/{target}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {displayBadges.map((badge) => {
        const isEarned = Boolean(badge.earned);
        const progress = badge.progress || 0;
        const target = badge.target || 1;
        const progressPct = Math.min(100, Math.round((progress / target) * 100));

        return (
          <div
            key={badge.id || badge.title}
            onClick={() => onBadgeClick?.(badge)}
            className={`relative flex flex-col justify-between rounded-3xl border p-4 transition ${
              onBadgeClick ? "cursor-pointer transform hover:scale-102" : ""
            } ${
              isEarned
                ? "border-amber-300 bg-gradient-to-b from-amber-50 to-white shadow-xs dark:border-amber-500/40 dark:from-amber-950/20 dark:to-[#14171c]"
                : "border-slate-200 bg-slate-50/50 opacity-60 grayscale dark:border-slate-800 dark:bg-[#14171c]"
            }`}
          >
            <div>
              <div className="flex items-start justify-between">
                <AchievementIcon
                  icon={badge.icon}
                  className="h-7 w-7 text-amber-600 dark:text-amber-400"
                  textClassName="text-3xl"
                />
                {isEarned ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Lock className="h-4 w-4 text-slate-400" />
                )}
              </div>

              <h3 className="mt-2 text-sm font-black text-slate-900 dark:text-white line-clamp-1">
                {badge.title}
              </h3>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                {badge.description}
              </p>
            </div>

            <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800/60">
              {isEarned ? (
                <div className="flex items-center justify-between text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  <span>Unlocked</span>
                  <span>+{badge.xp_reward || 0} XP</span>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                    <span>Progress</span>
                    <span>
                      {progress} / {target}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
