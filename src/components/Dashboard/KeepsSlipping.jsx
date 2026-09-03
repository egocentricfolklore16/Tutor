import React, { useEffect, useState } from "react";
import { AlertCircle, TrendingDown, Calendar, RotateCcw, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getUserSlippingData, getDailySessionTracking } from "../../lib/streaks";
import supabase from "../../lib/supabase";

function KeepsSlipping({ userId }) {
  const navigate = useNavigate();
  const [slippingData, setSlippingData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState(null);

  // The 4 accent colors from project CSS
  const colors = [
    { name: "red", bg: "bg-red-50", border: "border-red-200", text: "text-red-700", badge: "bg-red-100 text-red-800", icon: "text-red-600" },
    { name: "green", bg: "bg-green-50", border: "border-green-200", text: "text-green-700", badge: "bg-green-100 text-green-800", icon: "text-green-600" },
    { name: "amber", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-100 text-amber-800", icon: "text-amber-600" },
    { name: "purple", bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", badge: "bg-purple-100 text-purple-800", icon: "text-purple-600" },
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

        // Get recent missed sessions to show which subjects they're struggling with
        const { data: recentSessions } = await supabase
          .from("Study")
          .select("Subject, Topic, Status, Date")
          .eq("user_id", userId)
          .order("Date", { ascending: false })
          .limit(10);

        if (recentSessions) {
          // Analyze which subjects appear most in recent sessions
          const subjectCounts = {};
          recentSessions.forEach((session) => {
            const subject = session.Subject || "Unknown";
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

  // Don't show component if no slipping data
  if (!isLoading && slippingData.length === 0) {
    return null;
  }

  const getColorByIndex = (index) => colors[index % colors.length];
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="rounded-2xl bg-white shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-5 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Keeps Slipping</h2>
          </div>
          <AlertCircle className="h-5 w-5 text-amber-500" />
        </div>
        <p className="text-sm text-slate-600">You've missed some sessions. Here's where you need to refocus.</p>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-300"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Slipping Events */}
            {slippingData.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Recent Slips
                </h3>
                <div className="space-y-3">
                  {slippingData.slice(0, 3).map((slip, index) => {
                    const color = getColorByIndex(index);
                    const slipDate = new Date(slip.slip_date);
                    const dayName = daysOfWeek[slipDate.getDay()];
                    const dateStr = slipDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

                    return (
                      <div
                        key={slip.id}
                        className={`flex items-start gap-4 p-4 rounded-lg border-l-4 ${color.bg} border-l-4 transition-all hover:shadow-md ${color.border}`}
                      >
                        <div className="flex-shrink-0">
                          <div className={`w-12 h-12 rounded-lg ${color.bg} border ${color.border} flex items-center justify-center`}>
                            <span className="text-xs font-bold text-slate-600">{dayName}</span>
                          </div>
                        </div>
                        <div className="flex-grow">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className={`font-semibold ${color.text}`}>{dateStr}</p>
                              <p className="text-sm text-slate-600 mt-1">
                                {slip.reason === "streak_broken"
                                  ? "Your streak was broken 🔥"
                                  : slip.reason === "missed_day"
                                    ? "You missed a study session"
                                    : "Missed session"}
                              </p>
                              {slip.missed_subject && (
                                <p className="text-xs text-slate-500 mt-2">
                                  Subject: <span className="font-medium">{slip.missed_subject}</span>
                                </p>
                              )}
                            </div>
                            {!slip.recovered_at && (
                              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${color.badge}`}>Pending</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Areas to Focus */}
            {sessionStats && sessionStats.topSubjects.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
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
                        <p className="text-xs text-slate-600 mb-3">Sessions scheduled</p>
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
            <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
              <div className="flex items-start gap-3">
                <RotateCcw className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="flex-grow">
                  <p className="font-semibold text-emerald-900 mb-2">Get Back on Track</p>
                  <p className="text-sm text-emerald-700 mb-4">
                    Complete at least one study session today to rebuild your streak.
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
      <div className="bg-slate-50 px-6 py-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-slate-900">{slippingData.length}</p>
          <p className="text-xs text-slate-600 mt-1">Slip Events</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{sessionStats?.topSubjects.length || 0}</p>
          <p className="text-xs text-slate-600 mt-1">Areas to Focus</p>
        </div>
      </div>
    </div>
  );
}

export default KeepsSlipping;
