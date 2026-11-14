import React, { useEffect, useState } from "react";
import Leaderboard from "./Leaderboard";
import RecentActivity from "./RecentActivity";
import PerformanceDashboard from "./AnalyticsDashboard";
import StudyStreak from "./StudyStreak";
import AISuggestions from "./AISuggestions";
import KeepsSlipping from "./KeepsSlipping";
import StudyCompanion from "../Study/studyEnviron/StudyCompanion";
import DashboardStatsBar from "./DashboardStatsBar";
import QuickShortcuts from "./QuickShortcuts";
import CommunitySpotlight from "./CommunitySpotlight";
import AchievementsCard from "./AchievementsCard";
import { ArrowRight, Bot, CalendarCheck2, MessageSquare, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../../app/ProfileContext";
import { useGamification, DailyGoalRing, QuestList } from "../../features/gamification";
import PageContainer from "../common/PageContainer";
import supabase from "../../lib/supabase";
import FeedbackDialog from "../common/FeedbackDialog";
import { getDailyGoalMinutes } from "../../lib/weeklyHours";

// Typing Animation Component
const TypingText = ({ text, typingSpeed = 75, showCursor = true }) => {
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (!text) return;

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setDisplayText(text);
      setIsTyping(false);
      return;
    }

    let index = 0;
    setDisplayText("");
    setIsTyping(true);

    const typingInterval = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(typingInterval);
      }
    }, typingSpeed);

    return () => clearInterval(typingInterval);
  }, [text, typingSpeed]);

  return (
    <span>
      {displayText}
      {showCursor && isTyping && (
        <span className="ml-1 inline-block h-6 w-0.5 bg-emerald-600 motion-safe:animate-pulse" />
      )}
    </span>
  );
};

function Overview() {
  const navigate = useNavigate();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { streak } = useGamification();
  const { currentStreak, longestStreak, todayCompleted, freezeTokens, weekDays, loading: streakLoading, error: streakError, refreshStreak } = streak;
  const [userName, setUserName] = useState("");
  const [_userId, setUserId] = useState(null);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [greeting, setGreeting] = useState({ heading: "", paragraph: "" });
  const [feedbackVisible, setFeedbackVisible] = useState(true);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const knowledgeGaps = Array.isArray(profile?.knowledge_gaps) ? profile.knowledge_gaps : [];
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";

  const targetMinutes = getDailyGoalMinutes(profile);

  useEffect(() => {
    const getUserAndMinutes = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const todayStr = new Date().toISOString().slice(0, 10);
        const { data: tracking } = await supabase
          .from("daily_session_tracking")
          .select("total_duration_seconds")
          .eq("user_id", user.id)
          .eq("activity_date", todayStr)
          .maybeSingle();

        if (tracking?.total_duration_seconds) {
          setTodayMinutes(Math.round(tracking.total_duration_seconds / 60));
        }
      }
    };
    getUserAndMinutes();
  }, []);

  useEffect(() => {
    if (!isProfileLoading && userName) {
      const rawUser = userName || "Guest";
      const user = rawUser.split("?")[0];
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

      setGreeting({
        heading: `${timeOfDay}, ${user}`,
        paragraph: knowledgeGaps.length
          ? `You have ${knowledgeGaps.length} concept${knowledgeGaps.length === 1 ? "" : "s"} to revisit before your next session.`
          : "Pick up where you left off with a focused tutoring session.",
      });
    }
  }, [isProfileLoading, userName, knowledgeGaps.length]);

  useEffect(() => {
    if (!isProfileLoading && profile) {
      setUserName(profile.full_name || "Learner");
    }
  }, [isProfileLoading, profile]);

  return (
    <PageContainer maxWidth="max-w-7xl">
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2 2xl:grid-cols-12">
        <section className="min-w-0 rounded-2xl bg-transparent py-2 xl:col-span-2 2xl:col-span-12" aria-labelledby="dashboard-greeting-title">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"><Sun className="h-3.5 w-3.5" />{timeOfDay}</span>
          </div>

          <div className="mt-3 flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/50"><img src="/logo3.png" alt="Lumo mascot" className="h-9 w-9 object-contain" /></div>
            <h1 id="dashboard-greeting-title" className="min-w-0 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
              <TypingText text={greeting.heading} typingSpeed={75} showCursor={true} />
            </h1>
          </div>

          <p className="mt-2 truncate pl-14 text-sm text-slate-600 dark:text-slate-400">{greeting.paragraph}</p>
          {profile?.primary_goal && <p className="mt-1 pl-14 text-xs text-slate-500 dark:text-slate-400">Focus: <span className="font-semibold text-slate-700 dark:text-slate-300">{profile.primary_goal}</span></p>}

          <div className="mt-4 flex min-w-0 flex-row items-center gap-2 rounded-full border border-transparent bg-slate-50 px-3 py-2.5 dark:border-amber-600/80 dark:bg-amber-950/40">
            <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
              <span className="h-2 w-2 shrink-0 rounded-full bg-orange-500 dark:bg-amber-500" />
              <CalendarCheck2 className="h-4 w-4 shrink-0 text-orange-500 dark:text-amber-500" />
              <strong className="truncate text-slate-800 dark:text-amber-400">
                {knowledgeGaps.length ? `Review ${knowledgeGaps.length} concept${knowledgeGaps.length === 1 ? "" : "s"}` : "Keep your learning momentum"}
              </strong>
              <span className="hidden truncate text-slate-500 dark:text-amber-500/70 sm:inline">
                {knowledgeGaps.length ? "before your next session" : "Your next focused session is ready"}
              </span>
            </div>
            <button type="button" onClick={() => navigate("/courses")} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-orange-600 transition hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:text-amber-200 dark:hover:text-amber-300 sm:ml-auto motion-reduce:transition-none">
              Review now <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* Daily goals and quests are the first dashboard module after the hero. */}
        <div className="min-w-0 xl:col-span-2 2xl:col-span-12 grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <DailyGoalRing currentMinutes={todayMinutes} targetMinutes={targetMinutes} />
          </div>
          <div className="lg:col-span-8">
            <QuestList />
          </div>
        </div>

        <div className="min-w-0 xl:col-span-2 2xl:col-span-12">
          <KeepsSlipping />
        </div>

        <div className="min-w-0 xl:col-span-2 2xl:col-span-12">
          <DashboardStatsBar />
        </div>

        <div className="min-w-0 xl:col-span-2 2xl:col-span-12">
          <QuickShortcuts />
          <div className="mt-4">
            <PerformanceDashboard />
          </div>
        </div>
        <div className="xl:col-span-4">
          <StudyCompanion topic={profile?.current_topic || "your studies"} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-3">
        <div className="min-w-0">
          <CommunitySpotlight />
        </div>
        <div className="min-w-0">
          <AchievementsCard />
        </div>
        <div className="min-w-0">
          <Leaderboard />
        </div>
      </div>

      <div className="min-w-0 2xl:col-span-12">
        <StudyStreak
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          todayCompleted={todayCompleted}
          freezeTokens={freezeTokens}
          weekDays={weekDays}
          activeFriendStreaks={profile?.active_friend_streaks ?? 0}
          loading={streakLoading}
          error={streakError}
          onRetry={refreshStreak}
        />
      </div>

      <AISuggestions />

      {feedbackVisible && <div className="fixed bottom-24 right-6 z-50 hidden pb-[env(safe-area-inset-bottom)] sm:block">
        <span className="absolute -bottom-3 right-1 h-5 w-5 rounded-full bg-white shadow-md" aria-hidden="true" />
        <span className="absolute -bottom-6 right-0 h-3 w-3 rounded-full bg-white shadow-sm" aria-hidden="true" />
        <div className="relative flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-xl shadow-slate-900/10 ring-1 ring-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:shadow-slate-950/30 dark:ring-slate-700">
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            className="flex min-h-11 items-center gap-2 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70"
          >
            <span>Give us feedback!</span>
            <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          </button>
          <button type="button" title="Close feedback" aria-label="Close feedback" onClick={() => setFeedbackVisible(false)} className="absolute -right-2 -top-2 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-200 text-xs text-slate-600 shadow-sm transition hover:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 motion-reduce:transition-none">×</button>
        </div>
      </div>}
      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </PageContainer>
  );
}

export default Overview;
