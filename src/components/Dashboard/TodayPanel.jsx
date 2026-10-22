import React, { useEffect, useState } from "react";
import { Calendar, Clock, CheckCircle2, ChevronRight, AlertCircle, RefreshCw, Flame, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { QuestList } from "../../features/gamification";
import supabase from "../../lib/supabase";

export default function TodayPanel() {
  const navigate = useNavigate();
  const [nextSession, setNextSession] = useState(null);
  const [nearestDeadlines, setNearestDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTodayData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const todayIso = new Date().toISOString().slice(0, 10);

      const [sessionRes, deadlinesRes] = await Promise.all([
        supabase
          .from("Study")
          .select("id, Topic, Subject, Date, Start, Duration, session_status")
          .eq("user_id", user.id)
          .gte("Date", todayIso)
          .neq("session_status", "completed")
          .order("Date", { ascending: true })
          .order("Start", { ascending: true })
          .limit(1),
        supabase
          .from("deadlines")
          .select("id, title, due_date, subject, priority, status")
          .eq("user_id", user.id)
          .neq("status", "completed")
          .gte("due_date", todayIso)
          .order("due_date", { ascending: true })
          .limit(3),
      ]);

      if (sessionRes.error) throw sessionRes.error;
      if (deadlinesRes.error) throw deadlinesRes.error;

      setNextSession(sessionRes.data?.[0] || null);
      setNearestDeadlines(deadlinesRes.data || []);
    } catch (err) {
      console.error("TodayPanel fetch error:", err);
      setError("Unable to load today's schedule.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayData();
  }, []);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* Today's Focus & Countdown / Deadlines (lg: 5 cols) */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Upcoming Session Card */}
        <section
          className="relative flex-1 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-[#18211f]"
          aria-labelledby="upcoming-session-heading"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-amber-950/80 dark:text-amber-400">
                <Clock className="h-4 w-4" />
              </span>
              <h2 id="upcoming-session-heading" className="text-base font-bold text-slate-900 dark:text-white">
                Next Session
              </h2>
            </div>
            {error && (
              <button
                type="button"
                onClick={fetchTodayData}
                className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:underline dark:text-rose-400"
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            )}
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="space-y-2 animate-pulse" aria-busy="true">
                <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            ) : nextSession ? (
              <div>
                <span className="inline-block rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                  {nextSession.Subject || "General"}
                </span>
                <h3 className="mt-2 text-lg font-extrabold text-slate-900 dark:text-white">
                  {nextSession.Topic || "Scheduled Study Session"}
                </h3>
                <p className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {nextSession.Date} {nextSession.Start ? `at ${nextSession.Start}` : ""} ({nextSession.Duration || 1}h)
                  </span>
                </p>

                <button
                  type="button"
                  onClick={() => navigate(`/Study/${encodeURIComponent(nextSession.id)}`)}
                  className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-orange-600 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
                >
                  <span>Start Session</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  No upcoming sessions scheduled today.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/Planner")}
                  className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Schedule in Planner</span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Nearest Deadlines Card */}
        <section
          className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-[#18211f]"
          aria-labelledby="upcoming-deadlines-heading"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400">
                <Target className="h-4 w-4" />
              </span>
              <h2 id="upcoming-deadlines-heading" className="text-base font-bold text-slate-900 dark:text-white">
                Upcoming Deadlines
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate("/Planner")}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              View all
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {loading ? (
              <div className="space-y-2 animate-pulse" aria-busy="true">
                <div className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800" />
                <div className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800" />
              </div>
            ) : nearestDeadlines.length > 0 ? (
              nearestDeadlines.map((dl) => (
                <div
                  key={dl.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-900/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-900 dark:text-white">{dl.title}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Due: {dl.due_date} {dl.subject ? `· ${dl.subject}` : ""}
                    </p>
                  </div>
                  {dl.priority && (
                    <span
                      className={`ml-2 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                        dl.priority === "high"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300"
                          : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {dl.priority}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <p className="py-2 text-center text-xs text-slate-500 dark:text-slate-400">
                No active deadlines due soon.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Daily Quests & Challenges Suite (lg: 7 cols) */}
      <div className="lg:col-span-7 flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-[#18211f]">
        <QuestList />
      </div>
    </div>
  );
}
