import React, { useEffect, useState } from "react";
import { AlertCircle, TrendingDown, Calendar, RotateCcw, ArrowRight, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getUserSlippingData } from "../../lib/streaks";
import supabase from "../../lib/supabase";

function KeepsSlipping({ userId }) {
  const navigate = useNavigate();
  const [slippingData, setSlippingData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState(null);

  // Accent colors with dark mode support
  const colors = [
    {
      name: "red",
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-200 dark:border-red-900/50",
      text: "text-red-700 dark:text-red-400",
      badge: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
      icon: "text-red-600 dark:text-red-400",
    },
    {
      name: "green",
      bg: "bg-green-50 dark:bg-green-950/30",
      border: "border-green-200 dark:border-green-900/50",
      text: "text-green-700 dark:text-green-400",
      badge: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
      icon: "text-green-600 dark:text-green-400",
    },
    {
      name: "amber",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-900/50",
      text: "text-amber-700 dark:text-amber-400",
      badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
      icon: "text-amber-600 dark:text-amber-400",
    },
    {
      name: "purple",
      bg: "bg-purple-50 dark:bg-purple-950/30",
      border: "border-purple-200 dark:border-purple-900/50",
      text: "text-purple-700 dark:text-purple-400",
      badge: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
      icon: "text-purple-600 dark:text-purple-400",
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Get slipping data
        const { data: slips, error: slipsError } = await getUserSlippingData(userId, 5);
        if (!slipsError && slips) {
          setSlippingData(slips);
        }

        // Get recent non-completed sessions to analyze subjects needing focus
        const { data: recentSessions } = await supabase
          .from("Study")
          .select("Subject, Topic, Status, Date")
          .eq("user_id", userId)
          .neq("session_status", "completed")
          .order("Date", { ascending: false })
          .limit(10);

        if (recentSessions) {
          const subjectCounts = {};
          recentSessions.forEach((session) => {
            const subject = session.Subject || "General";
            subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
          });

          setSessionStats({
            totalRecentSessions: recentSessions.length,
            topSubjects: Object.entries(subjectCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3),
          });
        }
      } catch (error) {
        console.error("Error fetching slipping data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const getColorByIndex = (index) => colors[index % colors.length];
  // Standard JavaScript Sunday-Saturday array matching Date.prototype.getDay()
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const parseSlipDate = (dateStr) => {
    if (!dateStr) return new Date();
    if (typeof dateStr === "string" && dateStr.includes("-") && !dateStr.includes("T")) {
      const [year, month, day] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date(dateStr);
  };

  const hasSlips = slippingData.length > 0;

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-lg border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/80 dark:to-slate-900 px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${hasSlips ? "bg-red-100 dark:bg-red-950/50" : "bg-emerald-100 dark:bg-emerald-950/50"}`}>
              {hasSlips ? (
                <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Keeps Slipping</h2>
          </div>
          {hasSlips ? (
            <AlertCircle className="h-5 w-5 text-amber-500 dark:text-amber-400" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
          )}
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {hasSlips
            ? "You've missed some sessions. Here's where you need to refocus."
            : "No missed sessions logged! Keep up the great consistency."}
        </p>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-300 dark:border-slate-600"></div>
          </div>
        ) : !hasSlips && (!sessionStats || sessionStats.topSubjects.length === 0) ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center text-center py-8 px-4 space-y-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-full border border-emerald-100 dark:border-emerald-900/50">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />
            </div>
            <p className="text-base font-semibold text-slate-800 dark:text-slate-200">On Top of Your Game!</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              No missed sessions or broken streaks logged. Keep up the consistent study habits!
            </p>
            <button
              onClick={() => navigate("/Study")}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <span>Go to Workspace</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Slipping Events */}
            {hasSlips ? (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  Recent Slips
                </h3>
                <div className="space-y-3">
                  {slippingData.slice(0, 3).map((slip, index) => {
                    const color = getColorByIndex(index);
                    const slipDate = parseSlipDate(slip.slip_date);
                    const dayName = daysOfWeek[slipDate.getDay()];
                    const dateStr = slipDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

                    return (
                      <div
                        key={slip.id}
                        className={`flex items-start gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-lg border-l-4 ${color.bg} transition-all hover:shadow-md ${color.border}`}
                      >
                        <div className="shrink-0">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${color.bg} border ${color.border} flex items-center justify-center`}>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{dayName}</span>
                          </div>
                        </div>
                        <div className="grow min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className={`font-semibold ${color.text}`}>{dateStr}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                                {slip.reason === "streak_broken"
                                  ? "Your streak was broken 🔥"
                                  : slip.reason === "missed_day"
                                    ? "You missed a study session"
                                    : "Missed session"}
                              </p>
                              {slip.missed_subject && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                  Subject: <span className="font-medium text-slate-700 dark:text-slate-300">{slip.missed_subject}</span>
                                </p>
                              )}
                            </div>
                            {!slip.recovered_at && (
                              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full shrink-0 ${color.badge}`}>Pending</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-300">
                  No active slip events! Your streak and schedule are intact.
                </p>
              </div>
            )}

            {/* Areas to Focus */}
            {sessionStats && sessionStats.topSubjects.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  Areas to Refocus On
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sessionStats.topSubjects.map((subject, index) => {
                    const [subjectName, count] = subject;
                    const color = getColorByIndex(index);

                    return (
                      <div
                        key={subjectName}
                        className={`p-4 rounded-lg border-2 ${color.border} ${color.bg} transition-all hover:shadow-md cursor-pointer group`}
                        onClick={() => navigate("/Study")}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className={`font-semibold ${color.text} group-hover:underline`}>{subjectName}</p>
                          <span className={`px-2 py-1 text-xs font-bold rounded ${color.badge}`}>{count}</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">Sessions scheduled</p>
                        <button className={`text-xs font-semibold ${color.text} flex items-center gap-1 hover:gap-2 transition-all`}>
                          <span>Start session</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Call to Action */}
            <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
              <div className="flex items-start gap-3">
                <RotateCcw className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="grow min-w-0">
                  <p className="font-semibold text-emerald-900 dark:text-emerald-300 mb-1 sm:mb-2">Get Back on Track</p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400 mb-3 sm:mb-4">
                    Complete at least one study session today to rebuild or maintain your streak.
                  </p>
                  <button
                    onClick={() => navigate("/Study")}
                    className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                  >
                    <span>Create a session</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="bg-slate-50 dark:bg-slate-800/50 px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-slate-800 grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{slippingData.length}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Slip Events</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{sessionStats?.topSubjects.length || 0}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Areas to Focus</p>
        </div>
      </div>
    </div>
  );
}

export default KeepsSlipping;
