import React, { useEffect, useState } from "react";
import { CheckCircle2, Lock, Award, Loader2 } from "lucide-react";
import { useProfile } from "../../../app/ProfileContext.jsx";
import { gamificationService } from "../services/gamificationService.js";

/**
 * Reusable Badge Grid component for displaying user achievements.
 * Supports compact (dashboard) and full grid views with touch targets >= 44px.
 */
export function BadgeGrid({ compact = false, limit, category = "all", onSelectBadge }) {
  const { profile } = useProfile();
  const userId = profile?.user_id || profile?.id;

  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedModalBadge, setSelectedModalBadge] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      const res = await gamificationService.getBadges(userId);
      if (isMounted) {
        setBadges(res.data || []);
        setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const filtered = badges.filter((b) => {
    if (category === "all") return true;
    return b.category?.toLowerCase() === category.toLowerCase();
  });

  const displayed = limit ? filtered.slice(0, limit) : filtered;

  const handleBadgeClick = (badge) => {
    if (onSelectBadge) {
      onSelectBadge(badge);
    } else {
      setSelectedModalBadge(badge);
    }
  };

  if (loading) {
    return (
      <div className={`grid gap-3 ${compact ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"}`}>
        {Array.from({ length: limit || 4 }).map((_, idx) => (
          <div key={idx} className="animate-pulse rounded-2xl border border-slate-200 bg-slate-100 p-3 dark:border-slate-800 dark:bg-slate-800/50 min-h-[44px]">
            <div className="h-6 w-6 rounded-full bg-slate-300 dark:bg-slate-700 mb-2" />
            <div className="h-3 w-3/4 rounded bg-slate-300 dark:bg-slate-700" />
          </div>
        ))}
      </div>
    );
  }

  if (displayed.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
        No badges found in this category.
      </p>
    );
  }

  return (
    <>
      <div className={`grid gap-3 ${compact ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"}`}>
        {displayed.map((badge) => {
          const isEarned = badge.earned;
          const progress = badge.progress || 0;
          const target = badge.target || 1;
          const progressPct = Math.min(100, Math.round((progress / target) * 100));

          if (compact) {
            return (
              <button
                key={badge.id}
                type="button"
                onClick={() => handleBadgeClick(badge)}
                aria-label={`Badge: ${badge.title}. ${isEarned ? "Unlocked" : "Locked"}`}
                className={`flex min-h-[44px] flex-col items-center justify-center rounded-2xl border p-2 text-center transition hover:scale-102 cursor-pointer ${
                  isEarned
                    ? "border-amber-300 bg-amber-50/70 text-slate-900 shadow-xs dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-100"
                    : "border-slate-200 bg-slate-50/50 text-slate-400 opacity-70 grayscale dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-500"
                }`}
              >
                <span className="text-xl">{badge.icon || "🏆"}</span>
                <span className="mt-1 line-clamp-1 text-[11px] font-bold">{badge.title}</span>
              </button>
            );
          }

          return (
            <button
              key={badge.id}
              type="button"
              onClick={() => handleBadgeClick(badge)}
              aria-label={`Badge: ${badge.title}. ${isEarned ? "Unlocked" : `Progress ${progress} of ${target}`}`}
              className={`flex min-h-[44px] flex-col justify-between rounded-3xl border p-4 text-left transition hover:scale-102 cursor-pointer ${
                isEarned
                  ? "border-amber-300 bg-gradient-to-b from-amber-50 to-white shadow-xs dark:border-amber-500/40 dark:from-amber-950/20 dark:to-[#14171c]"
                  : "border-slate-200 bg-slate-50/50 opacity-60 grayscale dark:border-slate-800 dark:bg-[#14171c]"
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="text-3xl">{badge.icon || "🏆"}</span>
                  {isEarned ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Lock className="h-4 w-4 text-slate-400" />
                  )}
                </div>

                <h3 className="mt-2 line-clamp-1 text-sm font-black text-slate-900 dark:text-white">
                  {badge.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                  {badge.description}
                </p>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-2 dark:border-slate-800/60">
                {isEarned ? (
                  <div className="flex items-center justify-between text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    <span>Unlocked</span>
                    <span>+{badge.xp_reward || 0} XP</span>
                  </div>
                ) : (
                  <div>
                    <div className="mb-1 flex justify-between text-[10px] font-bold text-slate-500">
                      <span>Progress</span>
                      <span>
                        {progress} / {target}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Badge Detail Modal if not overridden */}
      {selectedModalBadge && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
          onClick={() => setSelectedModalBadge(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-2xl dark:border-slate-800 dark:bg-[#14171c]"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-6xl">{selectedModalBadge.icon || "🏆"}</span>
            <h3 className="mt-3 text-lg font-black text-slate-900 dark:text-white">
              {selectedModalBadge.title}
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              {selectedModalBadge.description}
            </p>
            <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              {selectedModalBadge.earned ? (
                <span>Unlocked · +{selectedModalBadge.xp_reward || 0} XP Rewarded</span>
              ) : (
                <span>Requires {selectedModalBadge.progress || 0} / {selectedModalBadge.target || 1} to unlock (+{selectedModalBadge.xp_reward || 0} XP reward)</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedModalBadge(null)}
              className="mt-5 w-full min-h-[44px] rounded-2xl bg-slate-900 py-2.5 text-xs font-bold text-white dark:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default BadgeGrid;
