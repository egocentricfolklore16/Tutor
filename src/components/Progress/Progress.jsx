import React, { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BookOpen, CalendarCheck, Clock3, Library, Loader2, Target } from "lucide-react";
import supabase from "../../lib/supabase";
import LoadingCompanion from "../common/LoadingCompanion";
import AchievementsCard from "../Dashboard/AchievementsCard";
import Leaderboard from "../Dashboard/Leaderboard";

const dateKey = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

function Progress() {
  const [sessions, setSessions] = useState([]);
  const [resourceCount, setResourceCount] = useState(0);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const loadProgress = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus("unauthenticated"); return; }

      const [{ data: sessionData, error: sessionError }, { data: historyData }, { count, error: resourceError }] = await Promise.all([
        supabase.from("Study").select("id, Subject, Topic, Date, Duration").eq("user_id", user.id).neq("session_status", "completed"),
        supabase.from("study_history").select("id, subject, topic, completed_at, duration_minutes").eq("user_id", user.id),
        supabase.from("session_resources").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      if (sessionError || resourceError) { setStatus("error"); return; }

      // Merge active and historical study sessions into progress computation
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
      setStatus("ready");
    };
    loadProgress();
  }, []);

  const analytics = useMemo(() => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(23, 59, 59, 999);
    const pastSessions = sessions.filter((item) => new Date(item.Date) <= today);
    const plannedHours = sessions.reduce((total, item) => total + (Number.parseFloat(item.Duration) || 0), 0);
    const completedHours = pastSessions.reduce((total, item) => total + (Number.parseFloat(item.Duration) || 0), 0);
    const studyDays = new Set(pastSessions.map((item) => dateKey(item.Date)).filter(Boolean)).size;
    const subjects = new Set(sessions.map((item) => item.Subject).filter(Boolean)).size;
    const last30Days = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(now);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (29 - index));
      return { key: dateKey(date), day: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }), hours: 0 };
    });
    // BOLT OPTIMIZATION: Index 30-day buckets by date key into a Map for O(1) lookups.
    // Replaces O(30 * N) linear `.find(...)` array searches per session with O(30 + N) total complexity.
    const daysMap = new Map(last30Days.map((day) => [day.key, day]));
    sessions.forEach((item) => {
      const point = daysMap.get(dateKey(item.Date));
      if (point) point.hours += Number.parseFloat(item.Duration) || 0;
    });
    const subjectHours = sessions.reduce((result, item) => {
      const subject = item.Subject || "Uncategorised";
      result[subject] = (result[subject] || 0) + (Number.parseFloat(item.Duration) || 0);
      return result;
    }, {});
    const topSubjects = Object.entries(subjectHours).sort(([, left], [, right]) => right - left).slice(0, 5);
    return { plannedHours, completedHours, pastSessions: pastSessions.length, upcoming: sessions.length - pastSessions.length, studyDays, subjects, last30Days, topSubjects };
  }, [sessions]);

  if (status === "loading") return <LoadingCompanion message="Loading progress..." />;
  if (status === "unauthenticated") return <div className="p-8 text-slate-500">Sign in to view your progress.</div>;
  if (status === "error") return <div className="m-8 rounded-lg bg-red-50 p-6 text-red-700">Unable to load your progress.</div>;

  const completionRate = analytics.plannedHours ? Math.round((analytics.completedHours / analytics.plannedHours) * 100) : 0;
  const cards = [
    [Clock3, `${analytics.completedHours.toFixed(1)}h`, "Time completed", "text-indigo-600"],
    [CalendarCheck, analytics.pastSessions, "Sessions completed", "text-emerald-600"],
    [Target, `${completionRate}%`, "Plan completion", "text-orange-600"],
    [Library, resourceCount, "Resources collected", "text-rose-600"],
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 md:px-10 dark:bg-[#0c0f12]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Your learning journey</p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">Progress</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">See how consistently you study and how your plan is moving forward.</p>
        </header>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map(([Icon, value, label, color]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"><Icon className={`mb-4 h-5 w-5 ${color}`} /><p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{label}</p></div>)}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 lg:col-span-2">
            <div className="mb-5 flex items-end justify-between gap-4"><div><h2 className="font-semibold text-slate-900 dark:text-white">30-day study trend</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Planned hours across your recent schedule</p></div><span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{analytics.plannedHours.toFixed(1)}h total</span></div>
            <div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={analytics.last30Days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} /><XAxis dataKey="day" stroke="#94a3b8" fontSize={11} interval={4} /><YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} /><Tooltip formatter={(value) => [`${value} hrs`, "Planned time"]} contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc", borderRadius: "0.75rem" }} /><Area type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={2} fill="#6366f1" fillOpacity={0.2} /></AreaChart></ResponsiveContainer></div>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"><h2 className="font-semibold text-slate-900 dark:text-white">Consistency snapshot</h2><div className="mt-5 space-y-5"><div><div className="flex justify-between text-sm"><span className="text-slate-500 dark:text-slate-400">Study days</span><strong className="text-slate-800 dark:text-slate-200">{analytics.studyDays}</strong></div><div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-emerald-400" style={{ width: `${Math.min(analytics.studyDays / 30 * 100, 100)}%` }} /></div></div><div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800"><span className="text-slate-500 dark:text-slate-400">Upcoming sessions</span><strong className="text-slate-800 dark:text-slate-200">{analytics.upcoming}</strong></div><div className="flex items-center justify-between"><span className="text-slate-500 dark:text-slate-400">Subjects explored</span><strong className="text-slate-800 dark:text-slate-200">{analytics.subjects}</strong></div></div></section>
        </div>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"><div className="mb-5 flex items-center gap-2"><BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /><div><h2 className="font-semibold text-slate-900 dark:text-white">Time investment by subject</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Where your planned study time is going</p></div></div>{analytics.topSubjects.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">Create study sessions to see subject progress.</p> : <div className="grid gap-4 md:grid-cols-2">{analytics.topSubjects.map(([subject, hours]) => <div key={subject}><div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate font-medium text-slate-700 dark:text-slate-300">{subject}</span><span className="shrink-0 text-slate-500 dark:text-slate-400">{hours.toFixed(1)}h</span></div><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-indigo-400" style={{ width: `${analytics.plannedHours ? hours / analytics.plannedHours * 100 : 0}%` }} /></div></div>)}</div>}</section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2" aria-label="Achievements and leaderboard">
          <AchievementsCard />
          <Leaderboard />
        </section>
      </div>
    </main>
  );
}

export default Progress;