import React from "react";
import Avatar from "../../../../components/common/Avatar";
import { formatMetricValue } from "../../utils/rankUtils";

export default function YourRankCard({ me, metric }) {
  if (!me) return null;

  return (
    <div
      role="region"
      aria-label="Your current leaderboard rank"
      className="sticky bottom-4 z-20 rounded-3xl border-2 border-emerald-500/80 bg-white/95 p-4 shadow-overlay backdrop-blur-md dark:border-emerald-600/80 dark:bg-[#14171c]/95 min-h-[44px] transition-all"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="shrink-0 inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-3 py-1 text-xs font-black text-white shadow-xs dark:bg-emerald-500 dark:text-slate-950">
            #{me.rank || "—"}
          </span>

          <Avatar
            src={me.user_img}
            name={me.full_name}
            username={me.username}
            size="sm"
            level={me.level}
          />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {me.full_name || me.username || "You"}
              </p>
              <span className="shrink-0 rounded-2xl bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                YOU
              </span>
            </div>
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
              Keep studying to climb the board!
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <span className="block text-xs font-black text-emerald-700 dark:text-emerald-400">
            {formatMetricValue(me.value, metric)}
          </span>
        </div>
      </div>
    </div>
  );
}
