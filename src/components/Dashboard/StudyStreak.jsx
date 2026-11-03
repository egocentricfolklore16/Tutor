import React from "react";
import { AlertCircle, ArrowRight, Flame, RefreshCw, ShieldCheck, Snowflake } from "lucide-react";
import { useNavigate } from "react-router-dom";

function StudyStreak({ streak, currentStreak: directStreak, todayCompleted, freezeTokens = 0, loading, error, onRetry }) {
  const navigate = useNavigate();
  const currentStreak = directStreak ?? streak?.display_current_streak ?? null;

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/20">
        <div className="flex flex-col items-center justify-center text-center">
          <AlertCircle className="h-8 w-8 text-rose-600 dark:text-rose-400" />
          <p className="mt-2 text-sm font-extrabold text-rose-900 dark:text-rose-200">Unable to load streak</p>
          <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">Check your connection and try again.</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (loading || currentStreak === null) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex min-h-[180px] items-center justify-center overflow-hidden rounded-lg bg-slate-50 px-5 md:px-8 dark:bg-slate-800/50">
          <div className="animate-pulse text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">Study streak</p>
            <p className="mt-1 text-7xl font-black text-slate-300 dark:text-slate-600 md:text-8xl">–</p>
            <p className="mt-2 text-sm font-medium text-slate-400">Loading streak...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={`relative flex min-h-[180px] items-center overflow-hidden rounded-lg px-5 md:px-8 ${currentStreak === 0 ? "justify-center bg-sky-50 dark:bg-sky-950/30" : "justify-end bg-red-50 dark:bg-red-950/30"}`}>
        {currentStreak === 0 ? <div className="relative z-10 flex flex-col items-center text-center"><img src="/logo5-removebg-preview.png" alt="Lumo ready to help you focus" className="h-44 w-56 object-contain md:h-52 md:w-64" /><p className="mt-1 text-2xl font-black text-sky-800 dark:text-sky-300">Let&apos;s get focused</p><p className="mt-1 text-sm font-medium text-sky-600 dark:text-sky-400">Start a session to build your streak.</p></div> : <>
        <img
          src="/logo8-removebg-preview.png"
          alt="Lumo mascot celebrating your study streak"
          className="absolute left-[8%] z-0 h-48 w-72 object-contain object-bottom opacity-95 md:left-[18%] md:h-56 md:w-[26rem]"
        />
        <div className="relative z-10 mr-[4%] text-center md:mr-[10%]">
          <img
            src="/streak.svg"
            alt=""
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 z-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 object-contain opacity-20 md:h-80 md:w-80"
          />
          <p className="text-sm font-semibold uppercase tracking-widest text-red-600 dark:text-red-400">
            Study streak
          </p>
          <p className="relative z-10 mt-1 text-7xl font-black leading-none text-red-700 dark:text-red-300 md:text-8xl">
            {currentStreak}
          </p>
          <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">days in a row</p>
        </div></>}
      </div>

      {!loading && !error && currentStreak > 0 && (
        <div className="mt-3 flex flex-col gap-2.5 rounded-xl bg-orange-50/80 p-3.5 sm:flex-row sm:items-center sm:justify-between dark:bg-orange-950/30 border border-orange-200/60 dark:border-orange-900/40">
          <div className="flex items-center gap-2.5 text-xs text-orange-900 dark:text-orange-200">
            {todayCompleted ? (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
              </span>
            ) : (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300">
                <Flame className="h-4 w-4 animate-pulse" />
              </span>
            )}
            <div className="min-w-0">
              <p className="font-bold">
                {todayCompleted
                  ? `Streak safe for today! ${currentStreak}-day streak secured.`
                  : `Keep your ${currentStreak}-day streak alive! Complete a session before 3:00 AM cutoff.`}
              </p>
              {!todayCompleted && freezeTokens > 0 && (
                <p className="mt-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300 flex items-center gap-1">
                  <Snowflake className="h-3 w-3" /> {freezeTokens} Streak Freeze Token available as backup.
                </p>
              )}
            </div>
          </div>

          {!todayCompleted && (
            <button
              type="button"
              onClick={() => navigate("/Study")}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-orange-600"
            >
              Protect Streak <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default StudyStreak;
