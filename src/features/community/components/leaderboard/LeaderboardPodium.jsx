import React from "react";
import { Crown, ArrowUp, ArrowDown } from "lucide-react";
import Avatar from "../../../../components/common/Avatar";
import { formatMetricValue } from "../../utils/rankUtils";

function RankChangeBadge({ change }) {
  if (!change) return null;
  if (change > 0) {
    return (
      <span
        className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100/90 px-2 py-0.5 text-[10px] font-black text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 shadow-xs"
        title={`Up ${change} positions this period`}
      >
        <ArrowUp className="h-3 w-3 stroke-[3]" />+{change}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full bg-rose-100/90 px-2 py-0.5 text-[10px] font-black text-rose-900 dark:bg-rose-950 dark:text-rose-300 shadow-xs"
      title={`Down ${Math.abs(change)} positions this period`}
    >
      <ArrowDown className="h-3 w-3 stroke-[3]" />{change}
    </span>
  );
}

export default function LeaderboardPodium({ top1, top2, top3, metric, onUserClick }) {
  if (!top1 && !top2 && !top3) return null;

  const count = (top1 ? 1 : 0) + (top2 ? 1 : 0) + (top3 ? 1 : 0);

  const gridClass =
    count === 1
      ? "flex justify-center pt-2 pb-2"
      : count === 2
      ? "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-end max-w-2xl mx-auto pt-2 pb-2"
      : "grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end pt-2 pb-2";

  return (
    <div className={gridClass}>
      {/* Rank 2 - Silver */}
      {top2 && (
        <div
          onClick={() => onUserClick?.(top2.user_id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onUserClick?.(top2.user_id)}
          aria-label={`2nd Place: ${top2.full_name || top2.username}, ${formatMetricValue(top2.value, metric)}`}
          className={`${count === 3 ? "order-2 sm:order-1" : "order-2"} w-full sm:max-w-xs relative flex min-h-[44px] flex-col items-center justify-center rounded-3xl border border-slate-200/90 bg-gradient-to-b from-slate-100/90 via-slate-50 to-white p-5 text-center shadow-surface hover:shadow-surface-hover dark:border-slate-700/60 dark:from-slate-800/40 dark:via-[#18211f] dark:to-[#14171c] cursor-pointer hover:-translate-y-1 transition-all duration-200 group focus-visible:outline-none focus-visible:shadow-focus`}
        >
          <div className="relative mb-2 flex items-center gap-1.5">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-300 text-xs font-black text-slate-900 shadow-xs dark:bg-slate-700 dark:text-slate-100">
              {top2.rank}
            </span>
            <RankChangeBadge change={top2.rank_change} />
          </div>

          <div className="relative">
            <Avatar
              src={top2.user_img}
              name={top2.full_name}
              username={top2.username}
              size="lg"
              level={top2.level}
              className="ring-4 ring-slate-300 group-hover:ring-slate-400 group-hover:scale-105 transition-all duration-200 dark:ring-slate-600"
            />
          </div>

          <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
            {top2.full_name || top2.username || "Learner"}
          </p>

          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Level {top2.level || 1}
          </p>

          <div className="mt-2 inline-flex items-center rounded-2xl bg-slate-200/80 px-3 py-1 text-xs font-black text-slate-800 dark:bg-slate-800 dark:text-slate-200">
            {formatMetricValue(top2.value, metric)}
          </div>
        </div>
      )}

      {/* Rank 1 - Gold Champion */}
      {top1 && (
        <div
          onClick={() => onUserClick?.(top1.user_id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onUserClick?.(top1.user_id)}
          aria-label={`1st Place Champion: ${top1.full_name || top1.username}, ${formatMetricValue(top1.value, metric)}`}
          className={`${count === 3 ? "order-1 sm:order-2" : "order-1"} w-full sm:max-w-xs relative flex min-h-[44px] flex-col items-center justify-center rounded-3xl border-2 border-amber-300 bg-gradient-to-b from-amber-100/90 via-amber-50/60 to-white p-6 text-center shadow-surface-hover dark:border-amber-500/60 dark:from-amber-950/40 dark:via-[#18211f] dark:to-[#14171c] cursor-pointer hover:-translate-y-1.5 transition-all duration-200 group focus-visible:outline-none focus-visible:shadow-focus`}
        >
          <div className="relative mb-2 flex items-center gap-1.5">
            <Crown className="h-6 w-6 text-amber-500 animate-pulse" />
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-amber-950 shadow-sm dark:bg-amber-500 dark:text-amber-950">
              {top1.rank}
            </span>
            <RankChangeBadge change={top1.rank_change} />
          </div>

          <div className="relative">
            <Avatar
              src={top1.user_img}
              name={top1.full_name}
              username={top1.username}
              size="xl"
              level={top1.level}
              className="ring-4 ring-amber-400 group-hover:ring-amber-300 group-hover:scale-105 transition-all duration-200 shadow-md dark:ring-amber-500"
            />
          </div>

          <p className="mt-3 text-base font-black text-slate-900 dark:text-white truncate max-w-[160px]">
            {top1.full_name || top1.username || "Champion"}
          </p>

          <p className="mt-0.5 text-xs text-amber-700 font-bold dark:text-amber-300">
            Level {top1.level || 1}
          </p>

          <div className="mt-2.5 inline-flex items-center rounded-2xl bg-amber-200/90 px-3.5 py-1 text-xs font-black text-amber-950 dark:bg-amber-950 dark:text-amber-200 shadow-xs">
            {formatMetricValue(top1.value, metric)}
          </div>
        </div>
      )}

      {/* Rank 3 - Bronze */}
      {top3 && (
        <div
          onClick={() => onUserClick?.(top3.user_id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onUserClick?.(top3.user_id)}
          aria-label={`3rd Place: ${top3.full_name || top3.username}, ${formatMetricValue(top3.value, metric)}`}
          className="order-3 w-full sm:max-w-xs relative flex min-h-[44px] flex-col items-center justify-center rounded-3xl border border-amber-800/20 bg-gradient-to-b from-amber-100/50 via-amber-50/20 to-white p-5 text-center shadow-surface hover:shadow-surface-hover dark:border-amber-900/40 dark:from-amber-950/20 dark:via-[#18211f] dark:to-[#14171c] cursor-pointer hover:-translate-y-1 transition-all duration-200 group focus-visible:outline-none focus-visible:shadow-focus"
        >
          <div className="relative mb-2 flex items-center gap-1.5">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-800 text-xs font-black text-amber-100 shadow-xs dark:bg-amber-900 dark:text-amber-200">
              {top3.rank}
            </span>
            <RankChangeBadge change={top3.rank_change} />
          </div>

          <div className="relative">
            <Avatar
              src={top3.user_img}
              name={top3.full_name}
              username={top3.username}
              size="lg"
              level={top3.level}
              className="ring-4 ring-amber-700/40 group-hover:ring-amber-700/60 group-hover:scale-105 transition-all duration-200 dark:ring-amber-800"
            />
          </div>

          <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
            {top3.full_name || top3.username || "Learner"}
          </p>

          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Level {top3.level || 1}
          </p>

          <div className="mt-2 inline-flex items-center rounded-2xl bg-amber-100 px-3 py-1 text-xs font-black text-amber-900 dark:bg-amber-950/80 dark:text-amber-300">
            {formatMetricValue(top3.value, metric)}
          </div>
        </div>
      )}
    </div>
  );
}
