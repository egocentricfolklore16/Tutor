import React, { useState } from "react";
import DashboardHero from "./DashboardHero";
import KeepsSlipping from "./KeepsSlipping";
import TodayPanel from "./TodayPanel";
import WeeklyProgressChart from "./WeeklyProgressChart";
import TimeBySubjectCard from "./TimeBySubjectCard";
import WeakAreaCard from "./WeakAreaCard";
import SocialSection from "./SocialSection";
import RewardsSection from "./RewardsSection";
import AISuggestions from "./AISuggestions";
import StudyStreak from "./StudyStreak";
import PageContainer from "../common/PageContainer";
import FeedbackDialog from "../common/FeedbackDialog";
import { MessageSquare, Sparkles } from "lucide-react";
import { useGamification } from "../../features/gamification";

function Overview() {
  const { streak } = useGamification();
  const { currentStreak, loading: streakLoading, error: streakError, refreshStreak } = streak;
  const [feedbackVisible, setFeedbackVisible] = useState(true);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <PageContainer maxWidth="max-w-7xl">
      <div className="space-y-6 animate-fadeIn motion-reduce:animate-none">
        {/* HERO SECTION */}
        <section aria-label="Dashboard Hero">
          <DashboardHero />
        </section>

        {/* OVERDUE SESSIONS BANNER (If any overdue/slipping sessions exist) */}
        <section aria-label="Keeps Slipping Alert">
          <KeepsSlipping />
        </section>

        {/* TODAY SECTION (Countdown to next session, Deadlines, Daily Quests) */}
        <section aria-label="Today Schedule and Quests">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
              Today&apos;s Focus
            </h2>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Schedule &amp; Quests
            </span>
          </div>
          <TodayPanel />
        </section>

        {/* PROGRESS SECTION (7-Day Chart + Time by Subject + Weak Areas) */}
        <section aria-label="Learning Progress">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
              Study Analytics
            </h2>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Real Backend Data
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="lg:col-span-7 flex flex-col">
              <WeeklyProgressChart />
            </div>
            <div className="lg:col-span-5 flex flex-col gap-5">
              <TimeBySubjectCard />
              <WeakAreaCard />
            </div>
          </div>
        </section>

        {/* REWARDS SECTION (Achievements + Level Roadmap) */}
        <section aria-label="Level Roadmap and Achievements">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
              Rewards &amp; Level Roadmap
            </h2>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Gamification Progress
            </span>
          </div>
          <RewardsSection />
        </section>

        {/* SOCIAL SECTION (Leaderboard + Community) */}
        <section aria-label="Social Rankings and Community">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
              Community &amp; Rankings
            </h2>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Global Leaderboard
            </span>
          </div>
          <SocialSection />
        </section>

        {/* STREAK CELEBRATION CARD */}
        <section aria-label="Study Streak Celebration">
          <StudyStreak
            currentStreak={currentStreak}
            loading={streakLoading}
            error={streakError}
            onRetry={refreshStreak}
          />
        </section>

        {/* AI SUGGESTIONS SECTION */}
        <section aria-label="AI Recommendations">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
              AI Tutor Recommendations
            </h2>
          </div>
          <AISuggestions />
        </section>
      </div>

      {/* Floating Feedback Dialog */}
      {feedbackVisible && (
        <div className="fixed bottom-24 right-6 z-50 hidden sm:block">
          <div className="relative flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-xl shadow-slate-900/10 ring-1 ring-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">
            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              className="flex items-center gap-2 cursor-pointer text-left focus:outline-none"
            >
              <span>Give us feedback!</span>
              <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            </button>
            <button
              type="button"
              title="Close feedback"
              aria-label="Close feedback"
              onClick={() => setFeedbackVisible(false)}
              className="ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white transition hover:bg-slate-950 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              ×
            </button>
          </div>
        </div>
      )}
      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </PageContainer>
  );
}

export default Overview;
