import React from "react";
import { BookOpen, ArrowRight, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../../app/ProfileContext";

export default function WeakAreaCard() {
  const navigate = useNavigate();
  const { profile } = useProfile();

  const knowledgeGaps = Array.isArray(profile?.knowledge_gaps) ? profile.knowledge_gaps : [];

  if (knowledgeGaps.length === 0) {
    return (
      <section
        className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-[#18211f]"
        aria-labelledby="weak-areas-title"
      >
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300">
            <BookOpen className="h-4 w-4" />
          </span>
          <h2 id="weak-areas-title" className="text-base font-bold text-slate-900 dark:text-white">
            Concepts to Revisit
          </h2>
        </div>

        <div className="py-6 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
          <p className="mt-2 text-xs font-bold text-slate-800 dark:text-slate-200">All clear!</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            No knowledge gaps recorded in your profile.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50/60 via-white to-orange-50/40 p-5 shadow-sm dark:border-amber-600/30 dark:bg-gradient-to-br dark:from-[#1d2222] dark:via-[#18211f] dark:to-[#1d2222]"
      aria-labelledby="weak-areas-title"
    >
      <div className="flex items-center justify-between gap-2 border-b border-amber-100 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
            <BookOpen className="h-4 w-4" />
          </span>
          <div>
            <h2 id="weak-areas-title" className="text-base font-bold text-slate-900 dark:text-white">
              Concepts to Revisit
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {knowledgeGaps.length} topic{knowledgeGaps.length === 1 ? "" : "s"} identified for review
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {knowledgeGaps.slice(0, 3).map((gap, index) => {
          const topicName = typeof gap === "string" ? gap : gap?.topic || "Concept Review";
          return (
            <div
              key={`${topicName}-${index}`}
              className="flex items-center justify-between rounded-xl border border-amber-100 bg-white/80 px-3 py-2 text-xs dark:border-amber-900/40 dark:bg-slate-900/60"
            >
              <span className="truncate font-bold text-slate-800 dark:text-slate-200">{topicName}</span>
              <button
                type="button"
                onClick={() => navigate("/Study")}
                className="ml-2 inline-flex shrink-0 items-center gap-1 font-semibold text-amber-700 hover:underline dark:text-amber-300"
              >
                <span>Review</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
