import React, { useEffect, useState, useMemo, Component } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AlertCircle, RefreshCw, TrendingUp } from "lucide-react";
import supabase from "../../lib/supabase";

class ChartErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error("StudyTrendChart error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50/80 p-4 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          <p className="font-semibold">Unable to display chart.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function StudyTrendChart() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trackingData, setTrackingData] = useState([]);

  const fetchData = async () => {
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
      const startStr = start.toISOString().slice(0, 10);
      const todayStr = today.toISOString().slice(0, 10);

      const { data, error: fetchErr } = await supabase
        .from("daily_session_tracking")
        .select("activity_date, total_duration_seconds, total_study_hours")
        .eq("user_id", user.id)
        .gte("activity_date", startStr)
        .lte("activity_date", todayStr);

      if (fetchErr) {
        throw fetchErr;
      }

      setTrackingData(data || []);
    } catch (err) {
      console.error("Error loading StudyTrendChart data:", err);
      setError(err.message || "Failed to load study trend data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const { chartData, totalMinutes, hasSessions } = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const map = new Map();
    (trackingData || []).forEach((row) => {
      const mins = row.total_duration_seconds
        ? Math.round(row.total_duration_seconds / 60)
        : Math.round((Number(row.total_study_hours) || 0) * 60);
      map.set(row.activity_date, mins);
    });

    let sum = 0;
    const chart = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const dateStr = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
      const minutes = map.get(dateStr) || 0;
      sum += minutes;
      const isToday = dateStr === todayStr;

      return {
        dateStr,
        day: isToday ? `${dayLabel} (Today)` : dayLabel,
        rawDay: dayLabel,
        minutes,
        hours: Number((minutes / 60).toFixed(1)),
        isToday,
      };
    });

    return { chartData: chart, totalMinutes: sum, hasSessions: sum > 0 };
  }, [trackingData]);

  if (loading) {
    return (
      <div className="h-72 w-full animate-pulse rounded-lg border border-gray-200 bg-gray-50 p-5 dark:border-slate-800 dark:bg-slate-900/50 flex flex-col justify-between">
        <div className="flex justify-between items-center">
          <div className="h-5 w-32 rounded bg-gray-200 dark:bg-slate-800" />
          <div className="h-4 w-16 rounded bg-gray-200 dark:bg-slate-800" />
        </div>
        <div className="h-48 rounded bg-gray-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-semibold">Unable to load weekly study trend.</p>
        </div>
        <button
          type="button"
          onClick={fetchData}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }

  return (
    <ChartErrorBoundary>
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Weekly Progress</h2>
            </div>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
              Study time recorded over the last 7 days
            </p>
          </div>
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
            {totalMinutes >= 60
              ? `${(totalMinutes / 60).toFixed(1)} hrs total`
              : `${totalMinutes} mins total`}
          </span>
        </div>

        {!hasSessions ? (
          <div className="flex h-56 flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/30">
            <TrendingUp className="h-8 w-8 text-gray-400 dark:text-slate-600 mb-2" />
            <p className="text-sm font-medium text-gray-600 dark:text-slate-400">
              No study sessions recorded in the last 7 days
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
              Complete a study session or Pomodoro timer to see your weekly trend here!
            </p>
          </div>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="studyTrendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-slate-800" />
                <XAxis
                  dataKey="day"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  allowDecimals={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => [`${value} mins`, "Study time"]}
                  labelFormatter={(label) => `Day: ${label}`}
                  contentStyle={{
                    backgroundColor: "var(--color-tooltip-bg, #0f172a)",
                    borderColor: "var(--color-tooltip-border, #334155)",
                    borderRadius: "8px",
                    color: "#f8fafc",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="minutes"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#studyTrendGradient)"
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (payload?.isToday) {
                      return (
                        <circle
                          key={payload.dateStr}
                          cx={cx}
                          cy={cy}
                          r={5}
                          fill="#f97316"
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      );
                    }
                    return (
                      <circle
                        key={payload.dateStr}
                        cx={cx}
                        cy={cy}
                        r={3}
                        fill="#6366f1"
                      />
                    );
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </ChartErrorBoundary>
  );
}

export default StudyTrendChart;
