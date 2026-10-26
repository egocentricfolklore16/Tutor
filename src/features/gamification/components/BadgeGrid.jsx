import React, { useState, useEffect, useCallback } from "react";
import { Check, CheckCircle2, Lock, Award, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import AchievementIcon from "../../../components/common/AchievementIcon";
import Modal from "../../../components/common/ResponsiveSheet";
import { gamificationService } from "../services/gamificationService";

import { sortBadges } from "../utils/badgeUtils";

export default function BadgeGrid({
  userId,
  compact = false,
  limit,
  onBadgeClick,
  className = "",
}) {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedBadge, setSelectedBadge] = useState(null);

  const fetchBadges = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    const { data, error } = await gamificationService.getBadges(userId);
    if (error) {
      setErrorMsg(error.message || "Failed to load achievements.");
      setBadges([]);
    } else {
      setBadges(data || []);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  const sortedBadges = sortBadges(badges);

  const rawCategories = Array.from(
    new Set(badges.map((b) => b.category).filter(Boolean))
  );

  const categories = [
    { id: "all", label: "All Badges" },
    ...rawCategories.map((cat) => ({
      id: cat,
      label: cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, " "),
    })),
  ];

  const filteredBadges = sortedBadges.filter((b) => {
    if (activeCategory === "all") return true;
    return b.category?.toLowerCase() === activeCategory.toLowerCase();
  });

  const displayBadges = typeof limit === "number" ? filteredBadges.slice(0, limit) : filteredBadges;

  const handleCardClick = (badge) => {
    if (typeof onBadgeClick === "function") {
      onBadgeClick(badge);
    } else {
      setSelectedBadge(badge);
    }
  };

  if (loading) {
    return (
      <div className={`flex min-h-[120px] items-center justify-center gap-2 rounded-2xl bg-slate-50/50 p-6 dark:bg-slate-900/40 ${className}`}>
        <Loader2 className="h-5 w-5 animate-spin text-emerald-600 dark:text-emerald-400" />
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Loading achievements...</span>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className={`flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/60 p-5 text-center dark:border-rose-900/40 dark:bg-rose-950/20 ${className}`}>
        <AlertCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
        <p className="mt-2 text-xs font-bold text-rose-900 dark:text-rose-200">{errorMsg}</p>
        <button
          type="button"
          onClick={fetchBadges}
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/40 ${className}`}>
        <Award className="h-8 w-8 text-slate-400 dark:text-slate-600" />
        <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          No achievements available yet.
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`grid grid-cols-3 gap-2 ${className}`}>
        {displayBadges.map((badge) => {
          const isEarned = badge.earned;
          return (
            <div
              key={badge.id || badge.title}
              onClick={() => handleCardClick(badge)}
              className={`flex flex-col items-center justify-between rounded-xl border p-2.5 text-center cursor-pointer transition ${
                isEarned
                  ? "border-amber-300/80 bg-amber-50/60 shadow-2xs dark:border-amber-500/30 dark:bg-amber-950/20"
                  : "border-slate-200/80 bg-white/40 opacity-70 dark:border-slate-800 dark:bg-slate-900/30"
              }`}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                {isEarned ? (
                  <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AchievementIcon icon={badge.icon} className="h-4 w-4" textClassName="text-xs font-bold" />
                )}
              </span>
              <p className="mt-1.5 text-[11px] font-semibold leading-3.5 line-clamp-2 text-slate-900 dark:text-slate-100">
                {badge.title}
              </p>
              <div className="mt-1 text-[10px] font-bold">
                {isEarned ? (
                  <span className="text-emerald-700 dark:text-emerald-400">Earned</span>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400">
                    {badge.progress || 0}/{badge.target || 1}
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
    <div className={`space-y-4 ${className}`}>
      {categories.length > 2 && (
        <div className="flex w-full gap-1 overflow-x-auto no-scrollbar rounded-2xl bg-slate-100 p-1 dark:bg-[#18211f]">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition shrink-0 ${
                activeCategory === cat.id
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {filteredBadges.length === 0 ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-[#14171c]">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            No achievements found in this category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {displayBadges.map((badge) => {
            const isEarned = badge.earned;
            const progress = badge.progress || 0;
            const target = badge.target || 1;
            const progressPct = Math.min(100, Math.round((progress / target) * 100));

            return (
              <div
                key={badge.id || badge.title}
                onClick={() => handleCardClick(badge)}
                className={`relative flex flex-col justify-between rounded-3xl border p-4 cursor-pointer transition transform hover:scale-102 ${
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
                      <Lock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
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
                      <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
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
      )}

      {selectedBadge && (
        <Modal
          isOpen={Boolean(selectedBadge)}
          onClose={() => setSelectedBadge(null)}
          title={selectedBadge?.title || "Badge Detail"}
          maxWidth="max-w-sm"
          closeOnOverlayClick={true}
        >
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/50">
              <AchievementIcon
                icon={selectedBadge.icon}
                className="h-10 w-10 text-amber-600 dark:text-amber-400"
                textClassName="text-5xl"
              />
            </div>

            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
              {selectedBadge.description}
            </p>

            <div className="mt-4 rounded-2xl bg-amber-50 p-3 dark:bg-amber-950/30 text-xs font-bold text-amber-900 dark:text-amber-200">
              {selectedBadge.earned ? (
                <span>Unlocked on {new Date(selectedBadge.unlocked_at || Date.now()).toLocaleDateString()} · +{selectedBadge.xp_reward || 0} XP Rewarded</span>
              ) : (
                <span>Requires {selectedBadge.progress || 0} / {selectedBadge.target || 1} to unlock (+{selectedBadge.xp_reward || 0} XP reward)</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedBadge(null)}
              className="mt-5 w-full rounded-2xl bg-slate-900 py-2.5 text-xs font-bold text-white dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
