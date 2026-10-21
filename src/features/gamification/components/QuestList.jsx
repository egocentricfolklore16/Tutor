import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Loader2, RotateCcw, Sparkles, Target, Trophy } from "lucide-react";
import { gamificationService } from "../services/gamificationService.js";
import { useProfile } from "../../../app/ProfileContext.jsx";

function GemIcon({ className = "h-3.5 w-3.5 text-cyan-500" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.5 3h11L21 9l-9 12L3 9l3.5-6Z" fill="currentColor" />
      <path d="M6.5 3 12 9l5.5-6M3 9h18M9.5 9 12 21l2.5-12" stroke="white" strokeOpacity="0.45" strokeWidth="0.6" strokeLinejoin="round" />
    </svg>
  );
}

function formatResetTime(isoString) {
  if (!isoString) return "Resets 3:00 AM";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "Resets 3:00 AM";

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const localTimeString = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (diffMs <= 0) return `Resets ${localTimeString}`;

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours >= 24) {
    const days = Math.floor(diffHours / 24);
    const hours = diffHours % 24;
    return `Resets in ${days}d ${hours}h`;
  }

  return `Resets in ${diffHours}h ${diffMins}m (${localTimeString})`;
}

export function QuestList() {
  const { refreshProfile } = useProfile();
  const [questData, setQuestData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [claimingKey, setClaimingKey] = useState(null);

  const fetchQuests = useCallback(async () => {
    setIsLoading(true);
    setError("");

    // Automatically check for any uncollected rewards first
    await gamificationService.checkAndClaimQuests(refreshProfile);

    const { data, error: fetchErr } = await gamificationService.getMyQuests();
    if (fetchErr) {
      setError(fetchErr.message || "Failed to load quests.");
    } else {
      setQuestData(data || null);
    }
    setIsLoading(false);
  }, [refreshProfile]);

  useEffect(() => {
    fetchQuests();

    const handleQuestsUpdated = () => {
      gamificationService.getMyQuests().then(({ data, error: fetchErr }) => {
        if (!fetchErr && data) {
          setQuestData(data);
        }
      });
    };

    window.addEventListener("hyper-tutor-quests-updated", handleQuestsUpdated);
    window.addEventListener("hyper-tutor-check-quests", fetchQuests);
    window.addEventListener("hyper-tutor-session-completed", fetchQuests);

    return () => {
      window.removeEventListener("hyper-tutor-quests-updated", handleQuestsUpdated);
      window.removeEventListener("hyper-tutor-check-quests", fetchQuests);
      window.removeEventListener("hyper-tutor-session-completed", fetchQuests);
    };
  }, [fetchQuests]);

  const handleClaim = async (key) => {
    if (!key || claimingKey) return;
    setClaimingKey(key);

    const { data, error: claimErr } = await gamificationService.claimQuest(key);
    if (claimErr) {
      setError(claimErr.message || "Failed to claim quest.");
    } else if (data && data.error) {
      setError(data.error);
    } else {
      if (typeof refreshProfile === "function") {
        await refreshProfile();
      }
      // Trigger quest data refetch
      const { data: updatedData } = await gamificationService.getMyQuests();
      if (updatedData) {
        setQuestData(updatedData);
      }
    }
    setClaimingKey(null);
  };

  const questsList = Array.isArray(questData?.quests) ? questData.quests : [];
  const dailyQuests = questsList.filter((q) => q.kind === "daily").sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const weeklyQuest = questsList.find((q) => q.kind === "weekly");

  const dailyResetLabel = formatResetTime(questData?.daily_resets_at);
  const weeklyResetLabel = formatResetTime(questData?.weekly_resets_at);

  return (
    <div className="space-y-4">
      {/* Quests Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-4 shadow-surface dark:bg-[#18211f]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Daily Quests &amp; Challenge</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Complete daily objectives for XP and Gems</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <Clock className="h-3 w-3" /> {dailyResetLabel}
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200 shadow-surface">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span className="truncate">{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchQuests}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Quests Grid */}
      {isLoading && !questData ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex h-32 flex-col justify-between animate-pulse rounded-2xl bg-white p-4 shadow-surface dark:bg-[#18211f]">
              <div className="space-y-2">
                <div className="h-3 w-3/4 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="h-2 w-1/2 rounded-full bg-slate-100 dark:bg-slate-800" />
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {dailyQuests.map((quest) => {
            const target = quest.target || 1;
            const progress = quest.progress || 0;
            const pct = Math.min(100, Math.round((progress / target) * 100));
            const isCompleted = quest.completed;
            const isClaimed = quest.claimed;
            const isClaiming = claimingKey === quest.key;

            return (
              <div
                key={quest.key}
                className="flex flex-col justify-between rounded-2xl bg-white p-4 shadow-surface dark:bg-[#18211f] transition hover:shadow-surface-hover"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-extrabold text-slate-900 dark:text-white line-clamp-1">{quest.title}</h3>
                    {isClaimed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" /> Claimed
                      </span>
                    ) : isCompleted ? (
                      <button
                        type="button"
                        onClick={() => handleClaim(quest.key)}
                        disabled={isClaiming}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-white transition hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 shadow-button-primary disabled:opacity-50"
                      >
                        {isClaiming ? <Loader2 className="h-3 w-3 animate-spin" /> : "Claim"}
                      </button>
                    ) : (
                      <Target className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{quest.description}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    <span>{progress} / {target} {quest.metric || ""}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-600 dark:text-amber-400">+{quest.xp || 0} XP</span>
                      <span className="flex items-center gap-0.5 text-cyan-600 dark:text-cyan-400">
                        <GemIcon className="h-3 w-3 text-cyan-500" /> +{quest.gems || 0}
                      </span>
                    </div>
                  </div>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isClaimed ? "bg-emerald-500 dark:bg-emerald-400" : "bg-amber-400 dark:bg-amber-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Weekly Challenge Banner */}
      {weeklyQuest && (
        <div className="flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white shadow-surface sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
                  Weekly Challenge
                </span>
                <span className="text-[10px] font-semibold text-amber-100">
                  {weeklyResetLabel}
                </span>
              </div>
              <h3 className="mt-0.5 text-sm font-extrabold text-white">{weeklyQuest.title}</h3>
              <p className="text-xs text-amber-50">{weeklyQuest.description}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:text-right">
            <div className="text-xs font-bold text-white">
              <div className="flex items-center gap-2 justify-end">
                <span>+{weeklyQuest.xp || 0} XP</span>
                <span className="flex items-center gap-0.5">
                  <GemIcon className="h-3.5 w-3.5 text-white" /> +{weeklyQuest.gems || 0}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-amber-100">
                {weeklyQuest.progress || 0} / {weeklyQuest.target || 1} {weeklyQuest.metric || "mins"}
              </div>
            </div>
            {weeklyQuest.claimed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-extrabold text-white">
                <CheckCircle2 className="h-3.5 w-3.5" /> Claimed
              </span>
            ) : weeklyQuest.completed ? (
              <button
                type="button"
                onClick={() => handleClaim(weeklyQuest.key)}
                disabled={claimingKey === weeklyQuest.key}
                className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-extrabold text-orange-600 transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shadow-md disabled:opacity-50"
              >
                {claimingKey === weeklyQuest.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Claim Rewards"}
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default QuestList;
