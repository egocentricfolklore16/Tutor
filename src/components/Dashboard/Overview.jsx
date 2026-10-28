import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Play,
  Plus,
  Brain,
  Upload,
  Layers,
  Flame,
  Zap,
  Gift,
  Calendar as CalendarIcon,
  Crown,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  RefreshCw,
} from "lucide-react";
import { useProfile } from "../../app/ProfileContext";
import { useGamification, QuestList } from "../../features/gamification";
import PageContainer from "../common/PageContainer";
import {
  Card,
  Button,
  Badge,
  ProgressBar,
  ProgressRing,
  Skeleton,
  EmptyState,
} from "../common/UIKit";
import supabase from "../../lib/supabase";

export function DashboardOverview() {
  const navigate = useNavigate();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { streak, xp, gems } = useGamification();

  const currentStreak = streak?.currentStreak ?? 0;
  const longestStreak = streak?.longestStreak ?? 0;
  const todayCompleted = streak?.todayCompleted ?? false;
  const weekDays = streak?.weekDays ?? [];
  const streakError = streak?.error ?? null;
  const refreshStreak = streak?.refreshStreak;

  const xpLevel = xp?.level ?? 1;
  const xpTotal = xp?.total ?? 0;
  const xpToNextLevel = xp?.xpToNextLevel ?? 50;
  const xpProgressPercent = xp?.xpProgressPercent ?? 0;

  const gemsBalance = gems?.balance ?? 0;

  const [userName, setUserName] = useState("Learner");
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [weeklyFocusData, setWeeklyFocusData] = useState([]);

  const hour = new Date().getHours();
  const greetingTime = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    if (profile) {
      setUserName(profile.full_name || profile.username || "Learner");
    }
  }, [profile]);

  // Fetch today's sessions and weekly focus hours
  useEffect(() => {
    let isMounted = true;
    async function loadDashboardData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch recent active or today's study sessions
        const { data: sessionData } = await supabase
          .from("study_sessions")
          .select("id, title, subject, topic, status, duration_minutes, current_step")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(5);

        if (isMounted) {
          setSessions(sessionData || []);
          setLoadingSessions(false);
        }

        // Fetch weekly focus time tracking
        const { data: trackingData } = await supabase
          .from("daily_session_tracking")
          .select("activity_date, total_duration_seconds")
          .eq("user_id", user.id)
          .order("activity_date", { ascending: false })
          .limit(7);

        if (isMounted && trackingData) {
          setWeeklyFocusData(trackingData);
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        if (isMounted) setLoadingSessions(false);
      }
    }

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeSession = sessions.find((s) => s.status === "in_progress" || s.status === "paused") || sessions[0];
  const knowledgeGaps = Array.isArray(profile?.knowledge_gaps) ? profile.knowledge_gaps : [];
  const isProUser = profile?.subscription_tier === "pro" || profile?.subscription_tier === "elite";
  const hasNoData = sessions.length === 0 && xpTotal === 0 && currentStreak === 0;

  const handleStartSession = () => {
    if (activeSession) {
      navigate(`/Study/${activeSession.id}`);
    } else {
      navigate("/Study", { state: { openCreateSession: true } });
    }
  };

  const openAiTutor = (topic = "") => {
    window.dispatchEvent(
      new CustomEvent("hyper-tutor-open-ai-chat", {
        detail: { initialTopic: topic },
      })
    );
  };

  return (
    <PageContainer maxWidth="max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CENTER COLUMN */}
        <div className="lg:col-span-8 flex flex-col gap-6 min-w-0">
          {/* 1. HERO GREETING CARD */}
          <Card
            variant="gradient"
            padding="p-6 md:p-8"
            className="relative overflow-hidden flex flex-col justify-between min-h-[220px]"
          >
            <div className="relative z-10 flex flex-col gap-2 max-w-lg">
              <div className="flex items-center gap-2">
                <img src="/logo3.png" alt="Lumo Mascot" className="w-8 h-8 object-contain" />
                <Badge variant="amber" size="sm">
                  Lumo AI Companion
                </Badge>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mt-1">
                {greetingTime}, {userName}!
              </h1>
              <p className="text-sm md:text-base text-emerald-100 font-medium leading-relaxed">
                {activeSession
                  ? `Ready to continue "${activeSession.topic || activeSession.subject || "your session"}"?`
                  : "Start a focused study session with Lumo to level up your skills today."}
              </p>
            </div>

            <div className="relative z-10 flex flex-wrap items-center gap-3 mt-6">
              <Button
                variant="cta"
                size="md"
                leftIcon={<Play className="w-4 h-4 fill-current" />}
                onClick={handleStartSession}
                className="font-extrabold text-white"
              >
                {activeSession ? `Continue ${activeSession.subject || "Session"}` : "Start Study Session"}
              </Button>
              <Button
                variant="ghost"
                size="md"
                leftIcon={<Sparkles className="w-4 h-4 text-emerald-200" />}
                onClick={() => openAiTutor()}
                className="text-white hover:bg-white/10"
              >
                Ask AI Tutor
              </Button>
            </div>

            <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
          </Card>

          {/* ONBOARDING CARD FOR FIRST-TIME USERS */}
          {hasNoData && !loadingSessions && (
            <Card className="border-2 border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col sm:flex-row items-center gap-5 p-6">
              <img src="/logo3.png" alt="Lumo Mascot" className="w-20 h-20 object-contain shrink-0" />
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Welcome to Hyper Tutor!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Start your first study session to unlock real-time streak tracking, daily XP goals, and AI-powered practice stats.
                </p>
                <Button
                  variant="cta"
                  size="sm"
                  onClick={() => navigate("/Study", { state: { openCreateSession: true } })}
                  className="mt-3 font-bold"
                >
                  Start your first session to unlock stats
                </Button>
              </div>
            </Card>
          )}

          {/* 2. QUICK ACTIONS ROW */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => navigate("/Study", { state: { openCreateSession: true } })}
              className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-[#14171c] border border-slate-200/80 dark:border-slate-800 hover:border-emerald-400 hover:-translate-y-0.5 transition-all text-center gap-2 group"
            >
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">New Session</span>
            </button>

            <button
              type="button"
              onClick={() => openAiTutor("Generate a quick quiz for me")}
              className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-[#14171c] border border-slate-200/80 dark:border-slate-800 hover:border-emerald-400 hover:-translate-y-0.5 transition-all text-center gap-2 group"
            >
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <Brain className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">AI Quiz</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/Library")}
              className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-[#14171c] border border-slate-200/80 dark:border-slate-800 hover:border-emerald-400 hover:-translate-y-0.5 transition-all text-center gap-2 group"
            >
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Upload Resource</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/Study")}
              className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-[#14171c] border border-slate-200/80 dark:border-slate-800 hover:border-emerald-400 hover:-translate-y-0.5 transition-all text-center gap-2 group"
            >
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Review Flashcards</span>
            </button>
          </div>

          {/* 3. TODAY'S SESSIONS */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Today's Sessions
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate("/Study")}>
                View All
              </Button>
            </div>

            {loadingSessions ? (
              <div className="flex gap-4 overflow-x-auto pb-2">
                <Skeleton className="h-32 w-64 shrink-0 rounded-2xl" />
                <Skeleton className="h-32 w-64 shrink-0 rounded-2xl" />
              </div>
            ) : sessions.length === 0 ? (
              <EmptyState
                title="No study sessions yet"
                description="Create your first session to start active learning with Hyper Tutor."
                actionLabel="Create Session"
                onAction={() => navigate("/Study", { state: { openCreateSession: true } })}
              />
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                {sessions.map((s) => {
                  const isCompleted = s.status === "completed";
                  const inProgress = s.status === "in_progress";
                  const isPaused = s.status === "paused";

                  const badgeVariant = isCompleted
                    ? "emerald"
                    : inProgress
                    ? "emerald"
                    : isPaused
                    ? "amber"
                    : "slate";

                  const badgeText = isCompleted
                    ? "Completed"
                    : inProgress
                    ? "In Progress"
                    : isPaused
                    ? "Paused"
                    : "Not Started";

                  return (
                    <div
                      key={s.id}
                      className="min-w-[240px] max-w-[280px] p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-between gap-3 shrink-0"
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                          {s.subject || "General"}
                        </span>
                        <Badge variant={badgeVariant} size="sm">
                          {badgeText}
                        </Badge>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {s.topic || s.title || "Study Session"}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1 tabular-nums">
                          <Clock className="w-3 h-3 text-slate-400" /> {s.duration_minutes || 25} mins
                        </p>
                      </div>

                      <ProgressBar value={s.current_step || 1} max={5} variant={badgeVariant} />

                      <Button
                        variant={inProgress ? "primary" : "soft"}
                        size="sm"
                        onClick={() => navigate(`/Study/${s.id}`)}
                        className="w-full text-xs font-bold"
                      >
                        {isCompleted ? "Review" : inProgress ? "Resume" : "Start"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* 4. INSIGHTS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Weekly Focus Time */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Weekly Focus Time
                </span>
                <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                  {Math.round(
                    weeklyFocusData.reduce((acc, curr) => acc + (curr.total_duration_seconds || 0), 0) /
                      3600
                  )}{" "}
                  hrs
                </span>
              </div>
              <div className="flex items-end gap-2 h-20 pt-2">
                {[40, 65, 30, 85, 50, 90, 70].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-emerald-600 dark:bg-emerald-500 rounded-t-md transition-all duration-300"
                      style={{ height: `${h}%` }}
                    />
                    <span className="text-[10px] font-bold text-slate-400">
                      {["S", "M", "T", "W", "T", "F", "S"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Quiz Score Trend */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Quiz Performance
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">0%</span>
                <span className="text-xs text-slate-500">Average Score</span>
              </div>
              {/* TODO(backend): needs quiz_score_trends view or RPC for aggregated score trend line */}
              <div className="flex items-center justify-center p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  Take more quizzes to build your score trend line.
                </p>
              </div>
            </Card>

            {/* Areas to Improve */}
            <Card className="sm:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Areas to Improve
                </h3>
                <span className="text-xs font-bold text-slate-500 tabular-nums">{knowledgeGaps.length} topics</span>
              </div>

              {knowledgeGaps.length === 0 ? (
                <EmptyState
                  title="No weak areas identified!"
                  description="Great job! Keep completing study sessions and quizzes to track your progress."
                />
              ) : (
                <div className="space-y-2">
                  {knowledgeGaps.slice(0, 3).map((gap, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800"
                    >
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                        {typeof gap === "string" ? gap : gap.topic || "Concept Review"}
                      </span>
                      <Button
                        variant="soft"
                        size="sm"
                        onClick={() => openAiTutor(`Explain ${typeof gap === "string" ? gap : gap.topic}`)}
                        className="text-xs font-bold"
                      >
                        Practice this
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* RIGHT RAIL */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* 5. STREAK CARD */}
          <Card className="relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                  <Flame className="w-6 h-6 fill-amber-500" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">
                    {currentStreak} Day Streak
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    Longest: {longestStreak} days
                  </p>
                </div>
              </div>
              <Badge variant={todayCompleted ? "emerald" : "amber"} size="sm">
                {todayCompleted ? "Completed" : "At Risk Today"}
              </Badge>
            </div>

            {/* Quiet error fallback inline */}
            {streakError && (
              <div className="mt-3 flex items-center justify-between p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-700 dark:text-amber-300">
                <span>Unable to sync streak</span>
                {refreshStreak && (
                  <button type="button" onClick={() => refreshStreak()} className="p-1 hover:opacity-80">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Weekly dots */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              {weekDays.map((day, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400">{day.label}</span>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      day.state === "completed"
                        ? "bg-amber-500 text-white"
                        : day.state === "frozen"
                        ? "bg-cyan-500 text-white"
                        : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                    }`}
                  >
                    {day.state === "completed" ? "✓" : ""}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 6. XP / LEVEL CARD */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <ProgressRing size={52} strokeWidth={5} progress={xpProgressPercent} variant="amber">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                    L{xpLevel}
                  </span>
                </ProgressRing>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Level {xpLevel} Scholar
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {xpTotal} XP Total
                  </p>
                </div>
              </div>

              <Badge variant="cyan" size="md" icon={Gift}>
                <span className="tabular-nums">{gemsBalance} Gems</span>
              </Badge>
            </div>

            <ProgressBar value={xpProgressPercent} variant="amber" />
            <p className="text-[11px] text-slate-400 mt-2 text-right tabular-nums">
              {xpToNextLevel} XP to Level {xpLevel + 1}
            </p>
          </Card>

          {/* 7. DAILY QUESTS */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Daily Quests
              </h3>
            </div>
            <QuestList />
          </Card>

          {/* 8. UPCOMING DEADLINES */}
          {/* TODO(backend): needs user_deadlines view or RPC for study deadlines tracking */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Upcoming Deadlines
              </h3>
            </div>
            <EmptyState
              title="No upcoming deadlines"
              description="Add exams and assignment dates in Planner to stay on track."
              actionLabel="Go to Planner"
              onAction={() => navigate("/Planner")}
            />
          </Card>

          {/* 9. MINI CALENDAR */}
          {/* TODO(backend): needs monthly_activity_calendar view or RPC for calendar date highlights */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                This Month
              </h3>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <span key={i} className="font-bold text-slate-400 py-1">
                  {d}
                </span>
              ))}
              {Array.from({ length: 31 }).map((_, i) => (
                <span
                  key={i}
                  className={`py-1.5 rounded-lg text-xs font-bold tabular-nums ${
                    i + 1 === new Date().getDate()
                      ? "bg-emerald-600 text-white"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {i + 1}
                </span>
              ))}
            </div>
          </Card>

          {/* 10. UPGRADE CARD FOR FREE USERS */}
          {!isProUser && (
            <Card variant="gradient" className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Badge variant="amber" size="sm" icon={Crown}>
                  RECOMMENDED
                </Badge>
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white">Upgrade to Pro</h3>
                <p className="text-xs text-emerald-100 mt-1 leading-relaxed">
                  NGN 2,500 / month · Unlimited AI practice, mock exams & priority tutor answers.
                </p>
              </div>
              <Button
                variant="cta"
                size="md"
                onClick={() => navigate("/Shop")}
                className="w-full font-extrabold mt-1"
              >
                View Plans
              </Button>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

export default DashboardOverview;
