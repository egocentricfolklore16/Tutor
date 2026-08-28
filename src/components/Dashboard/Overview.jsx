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
import DashboardHeader from "./DashboardHeader";
import { MessageSquare } from "lucide-react";
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
  const { profile, isLoading: isProfileLoading } = useProfile();
  const [userName, setUserName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState({ heading: "", paragraph: "" });
  const knowledgeGaps = Array.isArray(profile?.knowledge_gaps) ? profile.knowledge_gaps : [];

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
      <div className="">
        <DashboardHeader />

        <div className="px-6">
          <div className="flex items-center justify-between gap-5">
            <div>
          <h1 className="premium-greeting relative pt-20 text-4xl font-bold md:text-5xl">
            <img src="/logo3.png" alt="Small Lumo mascot" className="pointer-events-none absolute left-1 top-[-20px] z-10 h-[100px] w-[100px] object-contain" />
            {/* {isLoading ? (
              <TypingText
                text="Loading your personalized greeting..."
                typingSpeed={75}
                showCursor={true}
              />
            ) : ( */}
              <TypingText
                text={greeting.heading}
                typingSpeed={75}
                showCursor={true}
              />
            {/* )} */}
          </h1>
          <p className="mt-3 mb-3">{greeting.paragraph}</p>
          {profile?.primary_goal && (
            <p className="mb-4 text-sm text-slate-600">
              Focus: <span className="font-semibold">{profile.primary_goal}</span>
              {profile.subjects?.length ? ` | ${profile.subjects.join(", ")}` : ""}
            </p>
          )}
            </div>
            <img src="/logo2.png" alt="Lumo mascot" className="lumo-float-left mt-[70px] hidden h-48 w-auto object-contain sm:block lg:h-64" />
          </div>
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
