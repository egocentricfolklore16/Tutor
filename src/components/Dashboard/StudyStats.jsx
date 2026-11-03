import React, { useEffect, useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import supabase from "../../lib/supabase";
import { computeStudyStatsAnalytics } from "../../lib/studyStatsUtils";

const PerformanceDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const loadStatsData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          return;
        }

        const [{ data: studyData, error: studyError }, { data: historyData, error: historyError }] =
          await Promise.all([
            supabase
              .from("Study")
              .select("id, Subject, Date, Duration, session_status")
              .eq("user_id", user.id),
            supabase
              .from("study_history")
              .select("id, subject, completed_at, duration_minutes")
              .eq("user_id", user.id),
          ]);

        if (studyError) {
          console.error("Error loading study sessions for stats:", studyError);
        }
        if (historyError) {
          console.error("Error loading study history for stats:", historyError);
        }

        if (isMounted) {
          setSessions(studyData || []);
          setHistory(historyData || []);
        }
      } catch (err) {
        console.error("Failed to load performance stats:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadStatsData();

    return () => {
      isMounted = false;
    };
  }, []);

  const analytics = useMemo(
    () => computeStudyStatsAnalytics(sessions, history),
    [sessions, history]
  );

  if (loading) {
    return (
      <div className="p-5 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-center text-sm text-slate-500">
        Loading performance stats...
      </div>
    );
  }

  return (
    <div className="p-2 lg:p-5 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
      <div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Progress Chart */}
          <div className="lg:col-span-2">
            {/* Progress Area Chart - Main Container */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-6 h-fit justify-center">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                  Weekly Progress
                </h2>
                <div className="text-sm text-gray-600 dark:text-slate-400 font-medium">
                  Total: {analytics.weekHours.toFixed(1)} hours this week
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={analytics.chart}
                    margin={{
                      top: 10,
                      right: 0,
                      left: -20,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-slate-800" />
                    <XAxis dataKey="day" className="text-gray-500 dark:text-slate-400" stroke="currentColor" fontSize={12} />
                    <YAxis className="text-gray-500 dark:text-slate-400" stroke="currentColor" fontSize={12} />
                    <Tooltip
                      formatter={(value) => [`${Number(value).toFixed(1)} hrs`, "Study time"]}
                      contentStyle={{
                        backgroundColor: "var(--color-tooltip-bg, #1e293b)",
                        borderColor: "var(--color-tooltip-border, #334155)",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        color: "#f8fafc",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="hours"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#colorGradient)"
                    />
                    <defs>
                      <linearGradient
                        id="colorGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#3b82f6"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3b82f6"
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Column - Subject Performance */}
          <div className="lg:col-span-1">
            {/* Performance Legend */}
            <div className="rounded-lg bg-slate-900 dark:bg-slate-950 border border-slate-800 p-4 mb-6">
              <div className="text-sm font-medium text-slate-100 mb-3">
                Performance Legend
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-slate-300">Bad (&lt;1.5h)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-slate-300">Good (1.5h-5h)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-slate-300">Excellent (&ge;5h)</span>
                </div>
              </div>
            </div>

            {/* Subject Performance Cards */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-4">
                <div className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">
                  Subject Performance
                </div>

                {!analytics.hasData || analytics.subjects.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-slate-400 py-2">
                    No study sessions recorded yet. Create a session to see subject breakdown.
                  </p>
                ) : (
                  analytics.subjects.map((subject, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-slate-800/60 last:border-b-0"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-4 h-4 ${subject.color} rounded-full`}
                        ></div>
                        <span className="text-gray-900 dark:text-slate-200 font-medium">
                          {subject.name}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-slate-400 capitalize">
                        {subject.performance} ({subject.hours.toFixed(1)}h)
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Stats Cards */}
        <div className="grid w-full grid-cols-2 gap-3 mt-6 sm:grid-cols-2">
          {/* Study Time Card */}
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-1">
                {analytics.totalHours.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Total Study Time</div>
              <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">HRS</div>
            </div>
          </div>

          {/* Focus Card */}
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-1">
                {analytics.focusHours.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Completed Focus Time</div>
              <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">HRS</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;
