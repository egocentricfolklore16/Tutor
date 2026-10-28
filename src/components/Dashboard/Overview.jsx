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
  BookOpen,
  RefreshCw,
  Rocket,
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
  Lumo,
  ErrorState,
  SectionLabel,
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

  // Time-aware greeting using profile timezone
  const getTimeOfDayGreeting = () => {
    try {
      const userTz = profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      const hour = new Date().toLocaleTimeString("en-US", { timeZone: userTz, hour12: false, hour: "2-digit" });
      const currentHour = parseInt(hour, 10);
      if (currentHour < 12) return "Good morning";
      if (currentHour < 18) return "Good afternoon";
      return "Good evening";
    } catch {
      const hour = new Date().getHours();
      if (hour < 12) return "Good morning";
      if (hour < 18) return "Good afternoon";
      return "Good evening";
    }
  };

  const greetingTime = getTimeOfDayGreeting();

  useEffect(() => {
    if (profile) {
      const name = profile.full_name?.split(" ")[0] || profile.username || "Learner";
      setUserName(name);
    }
  }, [profile]);

  useEffect(() => {
    let isMounted = true;
    async function loadDashboardData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

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
      } font-medium {
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
        {/* CENTER COLUMN (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6 min-w-0">
          {/* 1. HERO GREETING CARD */}
          <Card
            variant="gradient"
            padding="p-6 md:p-8"
            className="relative overflow-hidden flex flex-col justify-between min-h-[180px] md:min-h-[200px]"
          >
            <div className="relative z-10 flex items-start justify-between">
              <div className="flex flex-col gap-1.5 max-w-lg">
                <Badge variant="amber" size="sm" icon={Sparkles}>
                  Lumo AI Companion
                </Badge>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mt-1">
                  {greetingTime}, {userName}!
                </h1>
                <p className="text-xs md:text-sm text-emerald-100 font-medium leading-relaxed mt-0.5">
                  {activeSession
                    ? `You have a session waiting: "${activeSession.topic || activeSession.subject || "Study Session"}".`
                    : currentStreak > 0
                    ? `Study 10 minutes to keep your ${currentStreak}-day streak going!`
                    : "Ready for a focused study session?"}
                </p>
              </div>
              <Lumo pose="greeting" size="lg" className="hidden sm:block shrink-0" />
            </div>

            <div className="relative z-10 flex flex-wrap items-center gap-3 mt-6">
              <Button
                variant="cta"
                size="md"
                leftIcon={<Play className="w-4 h-4 fill-current" />}
                onClick={handleStartSession}
                className="font-extrabold text-white"
              >
                {activeSession ? `Resume ${activeSession.subject || "Session"}` : "Start Study Session"}
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

          {/* ONBOARDING CARD FOR BRAND NEW ACCOUNTS */}
          {hasNoData && !loadingSessions && (
            <Card className="border-2 border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col sm:flex-row items-center gap-5 p-6">
              <Lumo pose="greeting" size="lg" className="shrink-0" />
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
                  className="mt-3 font-extrabold"
                >
                  Start your first session to unlock your stats
                </Button>
              </div>
            </Card>
          )}

          {/* 2. CONTINUE LEARNING CARDS */}
          {sessions.length > 0 && (
            <div className="flex flex-col gap-3">
              <SectionLabel>CONTINUE LEARNING</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sessions.slice(0, 2).map((s) => (
                  <Card key={s.id} className="flex flex-col justify-between gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-extrabold text-sm">
                          {s.subject?.charAt(0) || "S"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate">
                            {s.subject || "General"}
                          </p>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {s.topic || s.title || "Study Session"}
                          </h4>
                        </div>
                      </div>
                    </div>

                    <ProgressBar value={s.current_step || 1} max={5} variant="orange" />

                    <div className="flex items-center justify-between text-xs font-bold pt-1">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> {s.duration_minutes || 25} min
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate(`/Study/${s.id}`)}
                        className="text-orange-500 hover:text-orange-600 dark:text-orange-400 font-extrabold hover:underline"
                      >
                        Resume session →
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* 3. QUICK ACTIONS ROW */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => navigate("/Study", { state: { openCreateSession: true } })}
              className="flex flex-col items-center justify-center p-4 rounded-3xl bg-white dark:bg-[#141923] border border-slate-200/80 dark:border-white/10 hover:border-emerald-400 hover:-translate-y-0.5 transition-all text-center gap-2 group shadow-surface"
            >
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">New Session</span>
            </button>

            <button
              type="button"
              onClick={() => openAiTutor("Generate a quick quiz for me")}
              className="flex flex-col items-center justify-center p-4 rounded-3xl bg-white dark:bg-[#141923] border border-slate-200/80 dark:border-white/10 hover:border-emerald-400 hover:-translate-y-0.5 transition-all text-center gap-2 group shadow-surface"
            >
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <Brain className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">AI Quiz</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/Library")}
              className="flex flex-col items-center justify-center p-4 rounded-3xl bg-white dark:bg-[#141923] border border-slate-200/80 dark:border-white/10 hover:border-emerald-400 hover:-translate-y-0.5 transition-all text-center gap-2 group shadow-surface"
            >
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Upload Resource</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/Study")}
              className="flex flex-col items-center justify-center p-4 rounded-3xl bg-white dark:bg-[#141923] border border-slate-200/80 dark:border-white/10 hover:border-emerald-400 hover:-translate-y-0.5 transition-all text-center gap-2 group shadow-surface"
            >
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Review Flashcards</span>
            </button>
          </div>

          {/* 4. TODAY'S SESSIONS */}
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
                title="No study sessions planned for today"
                description="Schedule your learning activity in Planner."
                actionLabel="Plan today's study"
                onAction={() => navigate("/Planner")}
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
                      className="min-w-[240px] max-w-[280px] p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-between gap-3 shrink-0"
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
                          <Clock className="w-3.5 h-3.5 text-slate-400" /> {s.duration_minutes || 25} mins
                        </p>
                      </div>

                      <ProgressBar value={s.current_step || 1} max={5} variant={badgeVariant} />

                      <Button
                        variant={inProgress ? "cta" : "soft"}
                        size="sm"
                        onClick={() => navigate(`/Study/${s.id}`)}
                        className="w-full text-xs font-bold"
                      >
                        {isCompleted ? "View" : inProgress ? "Resume" : "Start"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* 5. INSIGHTS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Weekly Focus Time */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <SectionLabel>WEEKLY FOCUS TIME</SectionLabel>
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
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        i === new Date().getDay() ? "bg-orange-500" : "bg-emerald-600/80 dark:bg-emerald-500/80"
                      }`}
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
                <SectionLabel>QUIZ PERFORMANCE</SectionLabel>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">0%</span>
                <span className="text-xs font-semibold text-slate-500">Average Score</span>
              </div>
              {/* TODO(backend): needs quiz_score_trends view or RPC for aggregated score trend line */}
              <div className="flex items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">
                  Take your first quiz to see your trend.
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
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800"
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
                        Practice
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* RIGHT RAIL (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* FOCOTECH STYLE PROFILE CARD */}
          <Card className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-lg flex items-center justify-center overflow-hidden border-2 border-emerald-500">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  userName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                  {userName}
                </h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                  Level {xpLevel} Scholar
                </p>
              </div>
            </div>

            {/* 3 Mini Stat Tiles */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 text-center">
                <span className="block text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Streak</span>
                <span className="text-sm font-extrabold text-amber-900 dark:text-amber-200 tabular-nums">{currentStreak}d</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40 text-center">
                <span className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Quests</span>
                <span className="text-sm font-extrabold text-emerald-900 dark:text-emerald-200 tabular-nums">0</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/60 dark:border-cyan-900/40 text-center">
                <span className="block text-[10px] font-bold text-cyan-700 dark:text-cyan-400 uppercase">Gems</span>
                <span className="text-sm font-extrabold text-cyan-900 dark:text-cyan-200 tabular-nums">{gemsBalance}</span>
              </div>
            </div>

            {/* XP Progress to next level */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5 tabular-nums">
                <span>{xpTotal} XP</span>
                <span>{xpToNextLevel} XP to Level {xpLevel + 1}</span>
              </div>
              <ProgressBar value={xpProgressPercent} variant="amber" />
            </div>
          </Card>

          {/* WEEKLY STREAK CARD */}
          <Card className="relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                  <Flame className="w-6 h-6 fill-amber-500" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tabular-nums text-slate-900 dark:text-white">
                    {currentStreak} Day Streak
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                    Longest: {longestStreak} days
                  </p>
                </div>
              </div>
              {currentStreak > 0 && !todayCompleted && new Date().getHours() >= 18 && (
                <Badge variant="rose" size="sm">
                  At Risk
                </Badge>
              )}
            </div>

            {/* Quiet Error State */}
            {streakError && (
              <ErrorState
                message="Unable to sync streak"
                onRetry={refreshStreak}
                className="mt-3"
              />
            )}

            {/* Mon-Sun Pills */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              {weekDays.map((day, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400">{day.label}</span>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      day.state === "completed"
                        ? "bg-orange-500 text-white"
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

          {/* DAILY QUESTS */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Daily Quests
              </h3>
            </div>
            <QuestList />
          </Card>

          {/* UPCOMING DEADLINES */}
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
              description="Add exams and assignment dates in Planner or ask Lumo."
              actionLabel="Go to Planner"
              onAction={() => navigate("/Planner")}
            />
          </Card>

          {/* MINI CALENDAR */}
          {/* TODO(backend): needs monthly_activity_calendar view or RPC for calendar date highlights */}
          <Card className="hidden sm:block">
            <SectionLabel className="mb-3">THIS MONTH</SectionLabel>
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

          {/* UPGRADE CARD FOR FREE USERS */}
          {!isProUser && (
            <Card variant="gradient" className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Badge variant="amber" size="sm" icon={Crown}>
                  MOST POPULAR
                </Badge>
                <Lumo pose="greeting" size="md" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white">Go Pro</h3>
                <p className="text-xs text-emerald-100 mt-1 leading-relaxed">
                  NGN 2,500 / month · Unlimited AI tutor practice, mock exams & priority answers.
                </p>
              </div>
              <Button
                variant="cta"
                size="md"
                onClick={() => navigate("/Shop")}
                className="w-full font-extrabold mt-1"
              >
                Upgrade now
              </Button>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

export default DashboardOverview;
