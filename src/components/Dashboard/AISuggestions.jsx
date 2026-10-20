import React, { memo } from 'react';
import { CalendarDays, Plus, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../../app/ProfileContext";
import { getLearnerTypeSuggestion } from "../../lib/learnerType.js";
import { getPreferredTimeNote } from "../../lib/preferredTime.js";
import { getWeeklyHours } from "../../lib/weeklyHours.js";
import { getLearningStyleSuggestion } from "../../lib/learningStyle.js";
import { getEducationLevelSuggestion } from "../../lib/educationLevel.js";
import { getUserSubjectsFormatted } from "../../lib/userSubjects.js";
import { getPrimaryGoalNote } from "../../lib/primaryGoal.js";

function AISuggestions() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const subjects = getUserSubjectsFormatted(profile);
  const weeklyHours = getWeeklyHours(profile);
  const styleInfo = getLearningStyleSuggestion(profile?.learning_style);
  const learnerTypeInfo = getLearnerTypeSuggestion(profile?.learner_type);
  const timeNote = getPreferredTimeNote(profile?.preferred_time);
  const levelInfo = getEducationLevelSuggestion(profile?.education_level);
  const goalNote = getPrimaryGoalNote(profile?.primary_goal);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-sky-100 to-sky-200 p-6 shadow-overlay transition-colors dark:from-slate-900 dark:to-slate-800">
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
        <p className="rounded-xl bg-white/60 p-4 leading-7 text-slate-800 backdrop-blur-sm shadow-surface dark:bg-slate-950/50 dark:text-slate-200">
          Start with {subjects} and plan {weeklyHours} focused hours this week, {levelInfo.contextNote}.
          As a <span className="font-semibold text-slate-900 dark:text-slate-100">{styleInfo.label}</span>, prioritize {styleInfo.strategy}. {timeNote}
          <br />
          <br />
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {goalNote} {learnerTypeInfo.recommendation}
          </span>
        </p>
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => navigate("/Planner")}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-white px-4 py-3 text-left text-sm font-bold text-slate-800 shadow-surface transition hover:shadow-surface-hover hover:bg-emerald-50 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-700/90"
          >
            <CalendarDays className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Visit your planner
          </button>
          <button
            type="button"
            onClick={() => navigate("/Study")}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-emerald-600 px-4 py-3 text-left text-sm font-bold text-white shadow-button-primary transition hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            <Plus className="h-5 w-5" />
            Create a study session
          </button>
        </div>
      </div>
    </div>
  );
}

// BOLT OPTIMIZATION: Memoize AISuggestions to prevent unnecessary re-renders when parent
// components (like Overview.jsx) re-render frequently (e.g. Overview's TypingText animation state ticks every 75ms).
export default memo(AISuggestions);
