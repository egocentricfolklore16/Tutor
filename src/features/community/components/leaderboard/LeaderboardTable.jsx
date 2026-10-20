import React from "react";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import Avatar from "../../../../components/common/Avatar";
import { formatMetricValue } from "../../utils/rankUtils";

export default function LeaderboardTable({ entries, currentUser, metric, onUserClick }) {
  if (!entries || entries.length === 0) return null;

  return (
    <div
      className="overflow-hidden rounded-3xl bg-white shadow-surface dark:bg-[#14171c]"
      role="list"
    >
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {entries.map((item, idx) => {
          const rankNum = item.rank || idx + 4;
          const isSelf = currentUser && (item.user_id === currentUser.id || item.is_me);

          return (
            <div
              key={item.user_id || idx}
              onClick={() => onUserClick?.(item.user_id)}
              role="listitem"
              tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onUserClick?.(item.user_id)}
              aria-label={`Rank ${rankNum}, ${item.full_name || item.username}, ${formatMetricValue(item.value, metric)}`}
              className={`flex items-center justify-between p-4 cursor-pointer transition min-h-[44px] focus-visible:outline-none focus-visible:shadow-focus ${
                isSelf
                  ? "bg-emerald-50/80 dark:bg-emerald-950/30 font-bold"
                  : "hover:bg-slate-50 dark:hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="w-8 text-center text-xs font-black text-slate-500 dark:text-slate-400 shrink-0">
                  #{rankNum}
                </span>

                <RankChangeIndicator change={item.rank_change} />

                <Avatar
                  src={item.user_img}
                  name={item.full_name}
                  username={item.username}
                  size="md"
                  level={item.level}
                />

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                      {item.full_name || item.username || "Learner"}
                    </p>
                    {isSelf && (
                      <span className="shrink-0 rounded-2xl bg-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">
                        YOU
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    @{item.username || "user"} · Level {item.level || 1}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-2xl">
                  {formatMetricValue(item.value, metric)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RankChangeIndicator({ change }) {
  if (change > 0) {
    return (
      <span
        className="flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0"
        title={`Up ${change} positions`}
      >
        <ArrowUp className="h-3 w-3" />
      </span>
    );
  }
  if (change < 0) {
    return (
      <span
        className="flex items-center text-[10px] font-bold text-rose-600 dark:text-rose-400 shrink-0"
        title={`Down ${Math.abs(change)} positions`}
      >
        <ArrowDown className="h-3 w-3" />
      </span>
    );
  }
  return (
    <span className="flex items-center text-[10px] text-slate-400 shrink-0" title="No rank change">
      <Minus className="h-3 w-3" />
    </span>
  );
}
