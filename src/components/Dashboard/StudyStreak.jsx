import React from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Flame,
  Lock,
  RefreshCw,
  ShieldCheck,
  Snowflake,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function getNextStreakMilestone(streak) {
  const value = Number(streak) || 0;
  if (value < 7) return { daysLeft: 7 - value, label: "7-day Streak Society" };
  if (value < 30) return { daysLeft: 30 - value, label: "30-day 2x Gem Multiplier" };
  if (value < 100) return { daysLeft: 100 - value, label: "100-day Centurion Badge" };
  return { daysLeft: Math.max(0, 365 - value), label: "365-day Legend" };
}

function StudyStreak({
  currentStreak,
  longestStreak,
  todayCompleted,
  freezeTokens = 0,
  weekDays = [],
  activeFriendStreaks = 0,
  loading,
  error,
  onRetry,
}) {
  const navigate = useNavigate();
  const isSocietyUnlocked = (currentStreak ?? 0) >= 7;
  const nextMilestone = getNextStreakMilestone(currentStreak);

  if (error) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80" aria-labelledby="study-streak-title">
        <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl bg-slate-50 p-6 text-center dark:bg-slate-900">
          <AlertCircle className="h-6 w-6 text-rose-500" aria-hidden="true" />
          <h2 id="study-streak-title" className="text-base font-bold text-slate-900 dark:text-slate-100">Unable to load streak</h2>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Check your connection and try again.</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:bg-emerald-500 dark:hover:bg-emerald-400 motion-reduce:transition-none"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Retry
            </button>
          )}
        </div>
      </section>
    );
  }

  if (loading || currentStreak === null) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80" aria-labelledby="study-streak-title" aria-busy="true">
        <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl bg-slate-50 p-6 text-center dark:bg-slate-900">
          <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Study streak</span>
          <span className="h-10 w-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          <p id="study-streak-title" className="text-sm leading-6 text-slate-600 dark:text-slate-300">Loading streak…</p>
        </div>
      </section>
    );
  }

  const milestoneMessage = nextMilestone.daysLeft > 0
    ? `${nextMilestone.daysLeft} day${nextMilestone.daysLeft === 1 ? "" : "s"} away from ${nextMilestone.label}.`
    : `Achieved ${nextMilestone.label}. Keep it up!`;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80" aria-labelledby="study-streak-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300">
            <Flame className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="study-streak-title" className="text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">Study streak</h2>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              {todayCompleted
                ? `Streak safe for today. ${currentStreak} days secured.`
                : `Complete a session before 3:00 AM to protect your ${currentStreak}-day streak.`}
            </p>
          </div>
        </div>
        <div className="flex items-baseline gap-2 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
          <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">{currentStreak}</span>
          <span className="text-sm text-slate-600 dark:text-slate-300">days in a row</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Longest streak</p>
          <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">{longestStreak ?? "–"} days</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Freeze tokens</p>
          <p className="mt-1 flex items-center gap-2 text-sm font-bold text-sky-700 dark:text-sky-300">
            <Snowflake className="h-4 w-4" aria-hidden="true" /> {freezeTokens}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">This week</h3>
        <ul className="mt-3 grid grid-cols-7 gap-2" aria-label="Streak activity this week">
          {weekDays.map((day, index) => {
            const state = day.state;
            const statusLabels = {
              completed: "Completed",
              frozen: "Protected by a freeze",
              "today-pending": "Needs a session today",
              missed: "Missed",
              future: "Upcoming",
            };
            const label = statusLabels[state] || "No activity";
            return (
              <li key={`${day.label}-${day.dateStr || index}`} className="flex min-w-0 flex-col items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{day.label}</span>
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
                    state === "completed"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                      : state === "frozen"
                        ? "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
                        : state === "today-pending"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
                          : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                  aria-label={`${day.label}: ${label}`}
                  title={`${day.label}: ${label}`}
                >
                  {state === "completed" ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : null}
                  {state === "frozen" ? <Snowflake className="h-4 w-4" aria-hidden="true" /> : null}
                  {state === "today-pending" ? <Flame className="h-4 w-4" aria-hidden="true" /> : null}
                  {state === "missed" || state === "future" ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-sm leading-6 text-amber-800 dark:text-amber-200">{milestoneMessage}</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
          <Users className="h-5 w-5 shrink-0 text-orange-500" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Friend streaks</h3>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{activeFriendStreaks} active friend streaks</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/Community")}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-emerald-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:text-emerald-300 dark:hover:bg-slate-800 motion-reduce:transition-none"
          >
            View <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
          <span className={`mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${isSocietyUnlocked ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
            {isSocietyUnlocked ? <ShieldCheck className="h-4 w-4" aria-hidden="true" /> : <Lock className="h-4 w-4" aria-hidden="true" />}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Streak Society</h3>
              {isSocietyUnlocked && <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">Unlocked</span>}
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {isSocietyUnlocked
                ? "You are a member of the Streak Society with 2x bonus rewards."
                : "Reach a 7-day streak to join the Streak Society and earn exclusive rewards."}
            </p>
          </div>
        </div>
      </div>

      {!todayCompleted && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate("/courses")}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:bg-emerald-500 dark:hover:bg-emerald-400 motion-reduce:transition-none"
          >
            Protect streak <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}

export default StudyStreak;
