import React from "react";
import Avatar from "../../../../components/common/Avatar";
import { formatMetricValue } from "../../utils/rankUtils";

export default function YourRankCard({ me, metric }) {
  if (!me) return null;

  return (
    <div className="sticky bottom-4 z-20 rounded-3xl border border-emerald-300 bg-emerald-50/95 p-4 shadow-overlay backdrop-blur-md dark:border-emerald-800 dark:bg-emerald-950/90">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-emerald-200 px-2.5 py-1 text-xs font-black text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">
            #{me.rank}
          </span>

          <Avatar
            src={me.user_img}
            name={me.full_name}
            username={me.username}
            size="sm"
            level={me.level}
          />

          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              {me.full_name || me.username || "You"}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Keep studying to climb higher!
            </p>
          </div>
        </div>

        <span className="text-xs font-black text-amber-600 dark:text-amber-400">
          {formatMetricValue(me.value, metric)}
        </span>
      </div>
    </div>
  );
}
