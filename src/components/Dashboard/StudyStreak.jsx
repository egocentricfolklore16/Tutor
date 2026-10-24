import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

function StudyStreak({ streak, currentStreak: directStreak, loading, error, onRetry }) {
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
    </div>
  );
}

export default StudyStreak;
