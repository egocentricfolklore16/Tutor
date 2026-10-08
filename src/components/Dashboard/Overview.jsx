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
import { ArrowRight, Bot, CalendarCheck2, Flame, GraduationCap, MessageSquare, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../../app/ProfileContext";
import { getEducationLevelInfo } from "../../lib/educationLevel.js";
import supabase from "../../lib/supabase";
import PageContainer from "../common/PageContainer";

// Typing Animation Component
const TypingText = ({ text, typingSpeed = 75, showCursor = true }) => {
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (!text) return;

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
        <span className="inline-block w-0.5 h-6 bg-green-600 ml-1 animate-pulse" />
      )}
    </span>
  );
};

function Overview() {
  const navigate = useNavigate();
  const { profile, isLoading: isProfileLoading, streak } = useProfile();
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState(null);
  const [greeting, setGreeting] = useState({ heading: "", paragraph: "" });
  const [feedbackVisible, setFeedbackVisible] = useState(true);
  const knowledgeGaps = Array.isArray(profile?.knowledge_gaps) ? profile.knowledge_gaps : [];
  const educationLevelInfo = getEducationLevelInfo(profile?.education_level);
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
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
    <PageContainer>
      <div>
        <div className="px-0">
          <section className="rounded-2xl bg-transparent px-2 py-4 md:px-5" aria-labelledby="dashboard-greeting-title">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-sky-700"><Sun className="h-3.5 w-3.5" />{timeOfDay}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><GraduationCap className="h-3.5 w-3.5" />{educationLevelInfo.badge}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-orange-700"><Flame className="h-3.5 w-3.5" />{streak?.display_current_streak || 0}d Streak</span>
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50"><img src="/logo3.png" alt="Lumo mascot" className="h-9 w-9 object-contain" /></div>
                <h1 id="dashboard-greeting-title" className="min-w-0 truncate text-2xl font-bold text-slate-950 md:text-3xl"><span className="block truncate"><TypingText text={greeting.heading} typingSpeed={75} showCursor={true} /></span></h1>
              </div>
              <button type="button" onClick={() => navigate("/Study")} className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 sm:w-auto"><Bot className="h-4 w-4" />Ask AI &amp; Study</button>
            </div>

            <p className="mt-2 truncate pl-0 sm:pl-14 text-sm text-slate-600 dark:text-slate-300">{greeting.paragraph}</p>
            {profile?.primary_goal && <p className="mt-1 pl-0 sm:pl-14 text-xs text-slate-500 dark:text-slate-400">Focus: <span className="font-semibold text-slate-700 dark:text-slate-200">{profile.primary_goal}</span>{profile.subjects?.length ? ` | ${profile.subjects.join(", ")}` : ""}</p>}

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
  <button type="button" onClick={() => navigate("/Study")} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-orange-600 hover:text-orange-700 dark:text-amber-400 dark:hover:text-amber-300 sm:ml-auto">
    Review now <ArrowRight className="h-4 w-4" />
  </button>
</div>
          </section>
          <DashboardStatsBar />
          <QuickShortcuts />
        </div>
      </div>
      <div className="mt-4">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PerformanceDashboard />
          </div>
          <div className="lg:col-span-1">
            <StudyCompanion topic={profile?.current_topic || "your studies"} />
          </div>

          <div className="lg:col-span-1">
            <CommunitySpotlight />
          </div>
          <div className="lg:col-span-1">
            <AchievementsCard />
          </div>
          <div className="lg:col-span-1">
            <Leaderboard />
          </div>

          <div className="lg:col-span-2 space-y-6">
            <StudyStreak streak={streak} />
            <KeepsSlipping userId={userId} />
          </div>

          <div className="lg:col-span-3">
            <AISuggestions />
          </div>
        </div>
      </div>
      {feedbackVisible && <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 hidden sm:block">
        <span className="absolute -bottom-3 right-1 h-5 w-5 rounded-full bg-white shadow-md dark:bg-slate-800" aria-hidden="true" />
        <span className="absolute -bottom-6 right-0 h-3 w-3 rounded-full bg-white shadow-sm dark:bg-slate-800" aria-hidden="true" />
        <div className="relative flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-800 dark:text-slate-100 px-4 py-3 text-sm font-semibold text-slate-800 shadow-xl shadow-slate-900/10 ring-1 ring-slate-100 dark:ring-slate-700">
          <span>Give us feedback!</span>
          <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <button type="button" title="Close feedback" aria-label="Close feedback" onClick={() => setFeedbackVisible(false)} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white shadow-md transition hover:bg-slate-950">×</button>
        </div>
      </div>}
    </PageContainer>
  );
}

export default Overview;
