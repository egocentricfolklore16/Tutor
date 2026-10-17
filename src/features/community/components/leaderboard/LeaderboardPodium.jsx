import React from "react";
import { Crown } from "lucide-react";
import Avatar from "../../../../components/common/Avatar";
import { formatMetricValue } from "../../utils/rankUtils";

export default function LeaderboardPodium({ top1, top2, top3, metric, onUserClick }) {
  if (!top1 && !top2 && !top3) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-end">
      {/* Rank 2 - Silver */}
      {top2 && (
        <div
          onClick={() => onUserClick?.(top2.user_id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onUserClick?.(top2.user_id)}
          aria-label={`Rank 2, ${top2.full_name || top2.username}, ${formatMetricValue(top2.value, metric)}`}
          className="order-2 sm:order-1 flex flex-col items-center justify-center rounded-3xl border border-sky-200 bg-gradient-to-b from-sky-50 to-white p-5 text-center shadow-surface dark:border-sky-900/40 dark:from-sky-950/20 dark:to-[#14171c] cursor-pointer hover:scale-102 transition group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-200 text-xs font-black text-sky-950 dark:bg-sky-900 dark:text-sky-100">
            2
          </span>
          <Avatar
            src={top2.user_img}
            name={top2.full_name}
            username={top2.username}
            size="lg"
            level={top2.level}
            className="mt-3 ring-4 ring-sky-300 group-hover:scale-105 transition-transform"
          />
          <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
            {top2.full_name || top2.username || "Learner"}
          </p>
          <p className="text-xs text-sky-700 dark:text-sky-300 font-extrabold mt-1">
            {formatMetricValue(top2.value, metric)}
          </p>
        </div>
      )}

      {/* Rank 1 - Gold */}
      {top1 && (
        <div
          onClick={() => onUserClick?.(top1.user_id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onUserClick?.(top1.user_id)}
          aria-label={`Rank 1, ${top1.full_name || top1.username}, ${formatMetricValue(top1.value, metric)}`}
          className="order-1 sm:order-2 flex flex-col items-center justify-center rounded-3xl border border-amber-300 bg-gradient-to-b from-amber-50 to-white p-6 text-center shadow-surface-hover dark:border-amber-500/40 dark:from-amber-950/30 dark:to-[#14171c] cursor-pointer hover:scale-102 transition group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <div className="flex items-center gap-1">
            <Crown className="h-5 w-5 text-amber-500 drop-shadow-xs" />
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-300 text-xs font-black text-amber-950 dark:bg-amber-500/40 dark:text-amber-200">
              1
            </span>
          </div>
          <Avatar
            src={top1.user_img}
            name={top1.full_name}
            username={top1.username}
            size="xl"
            level={top1.level}
            className="mt-3 ring-4 ring-amber-400 group-hover:scale-105 transition-transform"
          />
          <p className="mt-2 text-base font-black text-slate-900 dark:text-white truncate max-w-[160px]">
            {top1.full_name || top1.username || "Learner"}
          </p>
          <p className="text-sm font-extrabold text-amber-600 dark:text-amber-300 mt-1">
            {formatMetricValue(top1.value, metric)}
          </p>
        </div>
      )}

      {/* Rank 3 - Bronze */}
      {top3 && (
        <div
          onClick={() => onUserClick?.(top3.user_id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onUserClick?.(top3.user_id)}
          aria-label={`Rank 3, ${top3.full_name || top3.username}, ${formatMetricValue(top3.value, metric)}`}
          className="order-3 flex flex-col items-center justify-center rounded-3xl border border-rose-200 bg-gradient-to-b from-rose-50 to-white p-5 text-center shadow-surface dark:border-rose-900/40 dark:from-rose-950/20 dark:to-[#14171c] cursor-pointer hover:scale-102 transition group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-200 text-xs font-black text-rose-950 dark:bg-rose-900 dark:text-rose-100">
            3
          </span>
          <Avatar
            src={top3.user_img}
            name={top3.full_name}
            username={top3.username}
            size="lg"
            level={top3.level}
            className="mt-3 ring-4 ring-rose-300 group-hover:scale-105 transition-transform"
          />
          <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
            {top3.full_name || top3.username || "Learner"}
          </p>
          <p className="text-xs text-rose-700 dark:text-rose-300 font-extrabold mt-1">
            {formatMetricValue(top3.value, metric)}
          </p>
        </div>
      )}
    </div>
  );
}
