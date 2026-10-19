import React, { useEffect, useState } from "react";
import { CheckCircle2, Clock, Sparkles, Target, Trophy, Lock } from "lucide-react";
import { gamificationService } from "../services/gamificationService.js";

function GemIcon({ className = "h-3.5 w-3.5 text-cyan-500" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.5 3h11L21 9l-9 12L3 9l3.5-6Z" fill="currentColor" />
      <path d="M6.5 3 12 9l5.5-6M3 9h18M9.5 9 12 21l2.5-12" stroke="white" strokeOpacity="0.45" strokeWidth="0.6" strokeLinejoin="round" />
    </svg>
  );
}

const DEFAULT_QUESTS = [
  {
    id: "quest_focus_1",
    title: "Complete 1 Focus Session",
    description: "Run a focus timer session for at least 10 minutes",
    xpReward: 20,
    gemReward: 5,
    progress: 0,
    target: 1,
    completed: false,
    unit: "session",
  },
  {
    id: "quest_flashcards_10",
    title: "Review 10 Flashcards",
    description: "Test active recall with flashcards in your library",
    xpReward: 10,
    gemReward: 3,
    progress: 0,
    target: 10,
    completed: false,
    unit: "cards",
  },
  {
    id: "quest_quiz_ace",
    title: "Score ≥80% on a Quiz",
    description: "Ace a study quiz to earn bonus XP and gems",
    xpReward: 25,
    gemReward: 5,
    progress: 0,
    target: 1,
    completed: false,
    unit: "quiz",
  },
];

const WEEKLY_CHALLENGE = {
  id: "challenge_weekly_120m",
  title: "120-Minute Study Sprint",
  description: "Accumulate 120 minutes of total focus study time this week",
  xpReward: 50,
  gemReward: 30,
  progress: 0,
  target: 120,
  completed: false,
  unit: "mins",
};

export function QuestList() {
  const [quests, setQuests] = useState(DEFAULT_QUESTS);
  const [weeklyChallenge] = useState(WEEKLY_CHALLENGE);
  const [backendAvailable, setBackendAvailable] = useState(false);

  useEffect(() => {
    let isMounted = true;
    gamificationService.getQuests().then((res) => {
      if (!isMounted) return;
      if (res && res.available && Array.isArray(res.data) && res.data.length > 0) {
        setQuests(res.data);
        setBackendAvailable(true);
      } else {
        setBackendAvailable(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

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
          {!backendAvailable && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300" title="Daily Quests backend spec G-06 pending review">
              <Lock className="h-3 w-3 text-slate-400" /> Preview Mode
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <Clock className="h-3 w-3" /> Resets 3:00 AM
          </span>
        </div>
      </div>

      {/* Quests Grid */}
      <div className="grid gap-3 sm:grid-cols-3">
        {quests.map((quest) => {
          const pct = Math.min(100, Math.round((quest.progress / quest.target) * 100));
          return (
            <div
              key={quest.id}
              className="flex flex-col justify-between rounded-2xl bg-white p-4 shadow-surface dark:bg-[#18211f] transition hover:shadow-surface-hover"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xs font-extrabold text-slate-900 dark:text-white line-clamp-1">{quest.title}</h3>
                  {quest.completed ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <Target className="h-4 w-4 shrink-0 text-slate-400" />
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{quest.description}</p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  <span>{quest.progress} / {quest.target} {quest.unit}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-600 dark:text-amber-400">+{quest.xpReward} XP</span>
                    <span className="flex items-center gap-0.5 text-cyan-600 dark:text-cyan-400">
                      <GemIcon className="h-3 w-3 text-cyan-500" /> +{quest.gemReward}
                    </span>
                  </div>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-500 dark:bg-amber-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Weekly Challenge Banner */}
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
            </div>
            <h3 className="mt-0.5 text-sm font-extrabold text-white">{weeklyChallenge.title}</h3>
            <p className="text-xs text-amber-50">{weeklyChallenge.description}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:text-right">
          <div className="text-xs font-bold text-white">
            <div className="flex items-center gap-2 justify-end">
              <span>+{weeklyChallenge.xpReward} XP</span>
              <span className="flex items-center gap-0.5">
                <GemIcon className="h-3.5 w-3.5 text-white" /> +{weeklyChallenge.gemReward}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-amber-100">
              {weeklyChallenge.progress} / {weeklyChallenge.target} mins
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuestList;
