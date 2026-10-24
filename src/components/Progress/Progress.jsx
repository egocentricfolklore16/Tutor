import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarCheck, Clock3, Library, Target } from "lucide-react";
import supabase from "../../lib/supabase";
import { toDate } from "../../lib/dates";
import LoadingCompanion from "../common/LoadingCompanion";
import PageContainer from "../common/PageContainer";
import AchievementsCard from "../Dashboard/AchievementsCard";
import Leaderboard from "../Dashboard/Leaderboard";
import StudyTrendChart from "./StudyTrendChart";
import { useGamification, LevelRoadmap, LEVEL_MILESTONES } from "../../features/gamification";

const dateKey = (value) => {
  const date = toDate(value);
  return date ? date.toISOString().slice(0, 10) : "";
};

function Progress() {
  const { xp, refreshAll } = useGamification();
  const [sessions, setSessions] = useState([]);
  const [resourceCount, setResourceCount] = useState(0);
  const [dailyGoalHours, setDailyGoalHours] = useState(0);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const loadProgress = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus("unauthenticated"); return; }

      const [
        { data: sessionData, error: sessionError },
        { data: historyData },
        { count, error: resourceError },
        { data: profileData }
      ] = await Promise.all([
        supabase.from("Study").select("id, Subject, Topic, Date, Duration").eq("user_id", user.id).neq("session_status", "completed"),
        supabase.from("study_history").select("id, subject, topic, completed_at, duration_minutes").eq("user_id", user.id),
        supabase.from("session_resources").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("profiles").select("daily_goal_minutes").eq("id", user.id).maybeSingle(),
      ]);
      if (sessionError || resourceError) { setStatus("error"); return; }

      const historicalAsSessions = (historyData || []).map((h) => ({
        id: h.id,
        Subject: h.subject,
        Topic: h.topic,
        Date: h.completed_at,
        Duration: (h.duration_minutes || 0) / 60,
        isCompleted: true,
      }));

      setSessions([...(sessionData || []), ...historicalAsSessions]);
      setResourceCount(count || 0);

      if (profileData && profileData.daily_goal_minutes) {
        setDailyGoalHours(profileData.daily_goal_minutes / 60);
      }

      setStatus("ready");
    };
    loadProgress();
  }, []);

  // Performance optimization: Single-pass O(N) calculation for all session analytics metrics.
  // Replaces multiple array iterations (.filter, .reduce, .map) and temporary array allocations,
  // reducing execution time and garbage collection overhead when processing session histories.
  const analytics = useMemo(() => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(23, 59, 59, 999);

    let plannedHours = 0;
    let completedHours = 0;
    let pastSessionsCount = 0;

    const studyDaysSet = new Set();
    const subjectsSet = new Set();
    const subjectHours = {};

    for (let i = 0; i < sessions.length; i++) {
      const item = sessions[i];
      const duration = Number.parseFloat(item.Duration) || 0;
      plannedHours += duration;

      if (item.Subject) {
        subjectsSet.add(item.Subject);
      }
      const subjectKey = item.Subject || "Uncategorised";
      subjectHours[subjectKey] = (subjectHours[subjectKey] || 0) + duration;

      const d = toDate(item.Date);
      if (d && d <= today) {
        pastSessionsCount++;
        completedHours += duration;
        const dKey = dateKey(item.Date);
        if (dKey) {
          studyDaysSet.add(dKey);
        }
      }
    }

    const topSubjects = Object.entries(subjectHours)
      .sort(([, left], [, right]) => right - left)
      .slice(0, 5);

    return {
      plannedHours,
      completedHours,
      pastSessions: pastSessionsCount,
      upcoming: sessions.length - pastSessionsCount,
      studyDays: studyDaysSet.size,
      subjects: subjectsSet.size,
      topSubjects,
    };
  }, [sessions]);

  if (status === "loading") return <LoadingCompanion message="Loading progress..." />;
  if (status === "unauthenticated") return <div className="p-8 text-slate-500">Sign in to view your progress.</div>;
  if (status === "error") return <div className="m-8 rounded-lg bg-red-50 p-6 text-red-700 shadow-surface">Unable to load your progress.</div>;

  const completionRate = analytics.plannedHours ? Math.round((analytics.completedHours / analytics.plannedHours) * 100) : 0;
  const cards = [
    [Clock3, `${analytics.completedHours.toFixed(1)}h`, "Time completed", "text-indigo-600"],
    [CalendarCheck, analytics.pastSessions, "Sessions completed", "text-emerald-600"],
    [Target, `${completionRate}%`, "Plan completion", "text-orange-600"],
    [Library, resourceCount, "Resources collected", "text-rose-600"],
  ];

  return (
    <PageContainer maxWidth="max-w-6xl">
        <header className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-indigo-600">Your learning journey</p>
          <h1 className="text-3xl font-bold text-slate-900 md:text-4xl dark:text-white">Progress</h1>
          <p className="mt-2 text-slate-500">See how consistently you study and how your plan is moving forward.</p>
        </header>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map(([Icon, value, label, color]) => <div key={label} className="rounded-xl bg-white p-5 shadow-surface dark:bg-[#14171c]"><Icon className={`mb-4 h-5 w-5 ${color}`} /><p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></div>)}
        </div>

        <div className="mt-6">
          <LevelRoadmap
            level={xp.level}
            totalXp={xp.total}
            xpInLevel={xp.xpInCurrentLevel}
            xpForLevel={xp.xpForNextLevel}
            milestones={LEVEL_MILESTONES}
            onRetry={refreshAll}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <StudyTrendChart
              sessions={sessions}
              dailyGoalHours={dailyGoalHours}
              title="30-day study trend"
              subtitle="Planned hours across your recent schedule"
              plannedHoursTotal={analytics.plannedHours}
            />
          </section>
          <section className="rounded-xl bg-white p-5 shadow-surface dark:bg-[#14171c]"><h2 className="font-semibold text-slate-900 dark:text-white">Consistency snapshot</h2><div className="mt-5 space-y-5"><div><div className="flex justify-between text-sm"><span className="text-slate-500">Study days</span><strong className="text-slate-800 dark:text-slate-200">{analytics.studyDays}</strong></div><div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-emerald-400" style={{ width: `${Math.min(analytics.studyDays / 30 * 100, 100)}%` }} /></div></div><div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-4"><span className="text-slate-500">Upcoming sessions</span><strong className="text-slate-800 dark:text-slate-200">{analytics.upcoming}</strong></div><div className="flex items-center justify-between"><span className="text-slate-500">Subjects explored</span><strong className="text-slate-800 dark:text-slate-200">{analytics.subjects}</strong></div></div></section>
        </div>

        <section className="mt-6 rounded-xl bg-white p-5 shadow-surface dark:bg-[#14171c]"><div className="mb-5 flex items-center gap-2"><BookOpen className="h-5 w-5 text-indigo-600" /><div><h2 className="font-semibold text-slate-900 dark:text-white">Time investment by subject</h2><p className="mt-1 text-sm text-slate-500">Where your planned study time is going</p></div></div>{analytics.topSubjects.length === 0 ? <p className="text-sm text-slate-500">Create study sessions to see subject progress.</p> : <div className="grid gap-4 md:grid-cols-2">{analytics.topSubjects.map(([subject, hours]) => <div key={subject}><div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate font-medium text-slate-700 dark:text-slate-300">{subject}</span><span className="shrink-0 text-slate-500">{hours.toFixed(1)}h</span></div><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-indigo-400" style={{ width: `${analytics.plannedHours ? hours / analytics.plannedHours * 100 : 0}%` }} /></div></div>)}</div>}</section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2" aria-label="Achievements and leaderboard">
          <AchievementsCard />
          <Leaderboard />
        </section>
    </PageContainer>
  );
}

export default Progress;
