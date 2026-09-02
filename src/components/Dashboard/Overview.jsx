import React, { useEffect, useState } from "react";
import Leaderboard from "./Leaderboard";
import RecentActivity from "./RecentActivity";
import PerformanceDashboard from "./AnalyticsDashboard";
import StudyStreak from "./StudyStreak";
import AISuggestions from "./AISuggestions";
import StudyCompanion from "../Study/studyEnviron/StudyCompanion";
import DashboardStatsBar from "./DashboardStatsBar";
import QuickShortcuts from "./QuickShortcuts";
import CommunitySpotlight from "./CommunitySpotlight";
import AchievementsCard from "./AchievementsCard";
import { ArrowRight, Bot, CalendarCheck2, Flame, MessageSquare, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import supabase from "../../lib/supabase";
import { useProfile } from "../../app/ProfileContext";

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
  const { profile, isLoading: isProfileLoading } = useProfile();
  const [userName, setUserName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState({ heading: "", paragraph: "" });
  const knowledgeGaps = Array.isArray(profile?.knowledge_gaps) ? profile.knowledge_gaps : [];
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";

  useEffect(() => {
    const fetchUsername = async () => {
      setIsLoading(true);
      try {
        // Get the current user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setUserName("User");
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Supabase fetch error:", error);
          setUserName("User");
        } else {
          setUserName(data?.username || "User");
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setUserName("User");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsername();
  }, []);

  useEffect(() => {
    if (!isLoading && userName) {
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
  }, [isLoading, userName, knowledgeGaps.length]);

  useEffect(() => {
    if (!isProfileLoading && profile) {
      setUserName(profile.full_name || profile.username || "Learner");
    }
  }, [isProfileLoading, profile]);

  return (
    <>
      <div>
        <div className="px-6">
          <section className="rounded-2xl bg-white/70 px-4 py-4 md:px-5" aria-labelledby="dashboard-greeting-title">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-sky-700"><Sun className="h-3.5 w-3.5" />{timeOfDay}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-orange-700"><Flame className="h-3.5 w-3.5" />22d Streak</span>
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50"><img src="/logo3.png" alt="Lumo mascot" className="h-9 w-9 object-contain" /></div>
                <h1 id="dashboard-greeting-title" className="min-w-0 text-2xl font-bold text-slate-950 md:text-3xl"><TypingText text={greeting.heading} typingSpeed={75} showCursor={true} /></h1>
              </div>
              <button type="button" onClick={() => navigate("/Study")} className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 sm:self-auto"><Bot className="h-4 w-4" />Ask AI &amp; Study</button>
            </div>

            <p className="mt-2 pl-14 text-sm text-slate-600">{greeting.paragraph}</p>
            {profile?.primary_goal && <p className="mt-1 pl-14 text-xs text-slate-500">Focus: <span className="font-semibold text-slate-700">{profile.primary_goal}</span>{profile.subjects?.length ? ` | ${profile.subjects.join(", ")}` : ""}</p>}

            <div className="mt-4 flex flex-col gap-2 rounded-xl bg-slate-50 px-3 py-2.5 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-2 text-sm"><span className="h-2 w-2 shrink-0 rounded-full bg-orange-500" /><CalendarCheck2 className="h-4 w-4 shrink-0 text-orange-500" /><strong className="truncate text-slate-800">{knowledgeGaps.length ? `Review ${knowledgeGaps.length} concept${knowledgeGaps.length === 1 ? "" : "s"}` : "Keep your learning momentum"}</strong><span className="hidden truncate text-slate-500 sm:inline">{knowledgeGaps.length ? "before your next session" : "Your next focused session is ready"}</span></div>
              <button type="button" onClick={() => navigate("/Study")} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-orange-600 hover:text-orange-700 sm:ml-auto">Review now <ArrowRight className="h-4 w-4" /></button>
            </div>
          </section>
          <DashboardStatsBar />
          <QuickShortcuts />
        </div>
      </div>
      <div className="w-[90%] lg:w-[96%] mx-6 grid grid-cols-1 lg:grid-cols-3 lg:grid-row-11 gap-6 p-2 [box-shadow:rgba(128,128,128,0.5)_3px_3px_6px_0px_inset,rgba(255,255,255,0.5)_-3px_-3px_6px_1px_inset]">
        <div className="lg:col-span-2 lg:row-span-5">
          <PerformanceDashboard />
        </div>
        <div className="lg:col-span-1 row-span-5">
          <StudyCompanion topic={profile?.current_topic || "your studies"} />
        </div>

        <div className="lg:col-span-1 lg:col-start-3 row-span-3">
          <Leaderboard />
        </div>

        <div className="lg:col-span-1">
          <CommunitySpotlight />
        </div>
        <div className="lg:col-span-1">
          <AchievementsCard />
        </div>

        <div className="lg:col-span-2">
          <div className="row-span-6 mb-6">
            <StudyStreak />
          </div>

          <div className="lg:col-span-2 row-span-3">
            <AISuggestions />
          </div>
        </div>
      </div>
      <button type="button" title="Send feedback" className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-700"><MessageSquare className="h-4 w-4" /> Feedback</button>
    </>
  );
}

export default Overview;
