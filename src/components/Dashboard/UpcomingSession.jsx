import {
  Clock,
  BookOpen,
  Calendar,
  Play,
  MoreHorizontal,
  AlertCircle,
  Loader2,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import supabase from "../../lib/supabase";

const UpcomingSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUpcomingSessions = async () => {
      try {
        setIsLoading(true);
        setError("");

        // Get the current user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setError("User not authenticated");
          return;
        }

        // Get current date and time for comparison
        const now = new Date();
        const today = now.toISOString().split("T")[0]; // YYYY-MM-DD format
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

        // Fetch upcoming sessions from Supabase
        const { data, error } = await supabase
          .from("Study")
          .select("*")
          .eq("user_id", user.id)
          .eq("muted", false) // Don't show muted sessions
          .or(
            `Date.gt.${today},and(Date.eq.${today},"Start".gt.${currentTime})`
          ) // Future dates or today with future times
          .order("Date", { ascending: true })
          .order("Start", { ascending: true })
          .limit(3); // Only get the 3 most upcoming

        if (error) {
          setError("Failed to load upcoming sessions");
          console.error("Supabase fetch error:", error);
        } else {
          // Transform the data to match component expectations
          const transformedSessions = data.map((session) => {
            const sessionDate = new Date(session.Date);

            const isToday = sessionDate.toDateString() === now.toDateString();
            const isTomorrow =
              sessionDate.toDateString() ===
              new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();

            // Format time display
            let timeDisplay;
            if (isToday) {
              timeDisplay = `Today at ${session.Start || "09:00"}`;
            } else if (isTomorrow) {
              timeDisplay = `Tomorrow at ${session.Start || "09:00"}`;
            } else {
              timeDisplay = `${sessionDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })} at ${session.Start || "09:00"}`;
            }

            // Determine priority based on Status
            let priority = "medium";
            const normalizedStatus = session.Status?.trim().toLowerCase();
            if (normalizedStatus === "very important") priority = "high";
            else if (normalizedStatus === "not so important") priority = "low";

            return {
              id: session.id,
              subject: session.Subject,
              topic: session.Topic,
              time: timeDisplay,
              duration: `${session.Duration || 60} hour(s)`,
              type: "Study Session",
              priority: priority,
              status: "scheduled",
              isOverdue: false,
              originalDate: session.Date,
              originalTime: session.Start,
            };
          });

          setSessions(transformedSessions);
        }
      } catch (err) {
        setError("An unexpected error occurred");
        console.error("Unexpected error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUpcomingSessions();
  }, []);

  const getTypeIcon = (type) => {
    switch (type) {
      case "AI Tutoring":
        return <BookOpen className="h-4 w-4" />;
      case "Flashcards":
        return <Calendar className="h-4 w-4" />;
      case "Study Session":
        return <BookOpen className="h-4 w-4" />;
      case "Practice Problems":
        return <BookOpen className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority, isOverdue) => {
    if (isOverdue) return "border-l-red-300 bg-red-50";
    switch (priority) {
      case "high":
        return "border-l-red-300 bg-red-50";
      case "medium":
        return "border-l-orange-300 bg-orange-50";
      case "low":
        return "border-l-green-300 bg-green-50";
      default:
        return "border-l-gray-300 bg-gray-50";
    }
  };

  const getStatusBadge = (status, isOverdue) => {
    if (isOverdue) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Missed
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
        Scheduled
      </span>
    );
  };

  const handleStartSession = (sessionId) => {
    // Navigate to the study environment
    window.location.href = `/Study/${sessionId}`;
  };

  if (isLoading) {
    return (
      <div className="bg-white h-full rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
          <Clock className="h-5 w-5 text-blue-600" />
          Upcoming Sessions
        </h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin mr-3" />
          <p className="text-gray-600">Loading upcoming sessions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
          <Clock className="h-5 w-5 text-blue-600" />
          Upcoming Sessions
        </h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white h-full rounded-lg shadow-sm border border-gray-200 p-3 animate-in fade-in zoom-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Upcoming Sessions
        </h2>
        <button
          className="text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
          onClick={() => (window.location.href = "/Study")}
        >
          View All
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No upcoming sessions - Schedule one to stay consistent</p>
          <button
            onClick={() => (window.location.href = "/Study")}
            className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Session
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`border-l-4 rounded-r-lg p-4 transition-all hover:shadow-md ${getPriorityColor(
                session.priority,
                session.isOverdue
              )}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2 text-gray-600">
                      {getTypeIcon(session.type)}
                    </div>
                    {getStatusBadge(session.status, session.isOverdue)}
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-1">
                    {session.subject}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2 lg:w-fit">
                    {session.topic}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{session.time}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>{session.duration}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {!session.isOverdue && (
                    <button
                      onClick={() => handleStartSession(session.id)}
                      className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Play className="h-3 w-3" />
                      Start
                    </button>
                  )}
                  {session.isOverdue && (
                    <button className="flex items-center gap-1 px-3 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors">
                      Reschedule
                    </button>
                  )}
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UpcomingSessions;
