import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Award, ArrowLeft, Sparkles } from "lucide-react";
import PageContainer from "../common/PageContainer";
import BadgeGrid from "../../features/gamification/components/BadgeGrid";
import { syncAndCheckAchievements } from "../../lib/achievementSync.js";

export default function AchievementsPage({ targetUserId }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!targetUserId) {
      syncAndCheckAchievements({ quiet: false }).catch((err) => {
        console.warn("syncAndCheckAchievements warning:", err);
      });
    }
  }, [targetUserId]);

  return (
    <PageContainer maxWidth="max-w-5xl">
      {/* Top Navigation */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 rounded-2xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#14171c] sm:p-8 mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-300 mb-2">
              <Award className="h-4 w-4 text-amber-600" /> Achievement Badges
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
              Learning Milestones
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Unlock badges as you study, maintain streaks, and help fellow community learners!
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/30 shrink-0">
            <Sparkles className="h-8 w-8 text-amber-500" />
            <div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Unlock achievements to earn XP and rewards
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Badges Grid */}
      <BadgeGrid userId={targetUserId} />
    </PageContainer>
  );
}
