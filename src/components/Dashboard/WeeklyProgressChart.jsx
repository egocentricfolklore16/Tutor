import React, { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp, RefreshCw, AlertCircle, Target } from "lucide-react";
import { useProfile } from "../../app/ProfileContext";
import supabase from "../../lib/supabase";

export default function WeeklyProgressChart() {
  const { profile } = useProfile();
  const [trackingData, setTrackingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const dailyGoalMinutes = profile?.daily_goal_minutes || 30;

  const fetchTracking = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      const startIso = start.toISOString().slice(0, 10);

      const { data, error: fetchErr } = await supabase
        .from("daily_session_tracking")
        .select("activity_date, total_duration_seconds")
        .eq("user_id", user.id)
        .gte("activity_date", startIso);

      if (fetchErr) throw fetchErr;
      setTrackingData(data || []);
    } catch (err) {
      console.error("Weekly progress fetch error:", err);
      setError("Failed to load progress chart.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
  }, []);

  // Compute 7 continuous days (Sun-Sat or past 7 days)
  const chartPoints = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const trackingMap = new Map(
      trackingData.map((item) => [item.activity_date, Math.round((item.total_duration_seconds || 0) / 60)])
    );

    const todayKey = new Date().toISOString().slice(0, 10);

    return Array.from({ length: 7 }, (_, index) => {
      const d = new Date(start);
      d.setDate(start.getDate() + index);
      const key = d.toISOString().slice(0, 10);
      const minutes = trackingMap.get(key) || 0;
      const isToday = key === todayKey;

      return {
        key,
        dayLabel: d.toLocaleDateString("en-US", { weekday: "short" }),
        minutes,
        hours: Number((minutes / 60).toFixed(1)),
        isToday,
        goalMinutes: dailyGoalMinutes,
      };
    });
  }, [trackingData, dailyGoalMinutes]);

  const totalWeeklyMinutes = useMemo(
    () => chartPoints.reduce((acc, point) => acc + point.minutes, 0),
    [chartPoints]
  );

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800/80 dark:bg-[#18211f]"
      aria-labelledby="weekly-progress-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
              <TrendingUp className="h-4 w-4" />
            </span>
            <h2 id="weekly-progress-heading" className="text-lg font-extrabold text-slate-900 dark:text-white">
              Weekly Progress
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Real study minutes logged over the last 7 days
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              This Week
            </p>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              {Math.floor(totalWeeklyMinutes / 60)}h {totalWeeklyMinutes % 60}m
            </p>
          </div>

          {error && (
            <button
              type="button"
              onClick={fetchTracking}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-xl bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300"
              title="Retry fetching weekly progress"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-900/40" aria-busy="true">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading chart...
            </div>
          </div>
        ) : error ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl bg-rose-50/50 p-4 text-center dark:bg-rose-950/20">
            <AlertCircle className="h-6 w-6 text-rose-500" />
            <p className="mt-2 text-xs font-bold text-rose-800 dark:text-rose-300">{error}</p>
            <button
              type="button"
              onClick={fetchTracking}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        ) : totalWeeklyMinutes === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/30">
            <Target className="h-8 w-8 text-slate-400" />
            <h3 className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-200">
              No study time logged this week yet
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              Complete a study session in the Study environment to see your real daily progress on this chart.
            </p>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartPoints} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="dayLabel" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs shadow-lg dark:border-slate-800 dark:bg-slate-900">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {data.dayLabel} {data.isToday ? "(Today)" : ""}
                          </p>
                          <p className="mt-1 text-emerald-600 font-extrabold dark:text-emerald-400">
                            {data.minutes} mins ({data.hours} hrs)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="minutes"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorMinutes)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}
