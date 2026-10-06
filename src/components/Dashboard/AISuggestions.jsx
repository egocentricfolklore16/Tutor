import React from 'react'
import { CalendarDays, Plus, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../../app/ProfileContext";
import { getLearnerTypeSuggestion } from "../../lib/learnerType.js";
import { getPreferredTimeNote } from "../../lib/preferredTime.js";

function AISuggestions() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const subjects = profile?.subjects?.length ? profile.subjects.join(", ") : "your priority subjects";
  const weeklyHours = profile?.weekly_hours || 5;
  const learningStyle = profile?.learning_style?.toLowerCase() || "your preferred style";
  const learnerTypeInfo = getLearnerTypeSuggestion(profile?.learner_type);
  const timeNote = getPreferredTimeNote(profile?.preferred_time);

  return (
    <div className="min-h-[360px] rounded-2xl bg-gradient-to-br from-sky-100 to-sky-200 p-6 shadow-xl transition-colors dark:border dark:border-slate-800 dark:from-slate-900 dark:to-slate-800">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100">
          <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          AI Suggestions
        </h1>
        <span className="rounded-full bg-emerald-700/15 px-3 py-1 text-xs font-semibold text-emerald-950 dark:bg-emerald-500/20 dark:text-emerald-300">
          {learnerTypeInfo.badge}
        </span>
      </div>
      <div>
        <p className="rounded-xl border border-slate-200/50 bg-white/60 p-4 leading-7 text-slate-800 backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/50 dark:text-slate-200">
          Start with {subjects} and plan {weeklyHours} focused hours this week.
          Your {learningStyle} approach will work well with a short active-recall
          session, followed by practice questions and a quick review tomorrow. {timeNote}
          <br />
          <br />
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {learnerTypeInfo.recommendation}
          </span>
        </p>
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => navigate("/Planner")}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-left text-sm font-bold text-slate-800 shadow-sm transition hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-700/90"
          >
            <CalendarDays className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Visit your planner
          </button>
          <button
            type="button"
            onClick={() => navigate("/Study")}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-emerald-600 px-4 py-3 text-left text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            <Plus className="h-5 w-5" />
            Create a study session
          </button>
        </div>
      </div>
    </div>
  );
}

export default AISuggestions;
