import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import supabase from "../../lib/supabase";
import StudyEnvironment from "./studyEnviron/StudyEnvironment";
import LoadingCompanion from "../common/LoadingCompanion";
import {
  BookOpen,
  Play,
  MoreHorizontal,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react";

function Study() {
  const toTitleCase = (value) =>
    value
      .toLowerCase()
      .replace(/\b\w/g, (character) => character.toUpperCase());

  const normalizeStatus = (status) => status?.trim().toLowerCase();

  const [session, setSession] = useState({
    subject: "",
    topic: "",
    status: "",
    date: "",
    time: "",
    hours: "",
  });
  const [sessions, setSessions] = useState([]);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [fetchError, setFetchError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingStates, setLoadingStates] = useState({});
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  // History Filter states
  const [historySubjectFilter, setHistorySubjectFilter] = useState("all");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");
  const [historyDateFilter, setHistoryDateFilter] = useState("all");
  const [deletingHistoryId, setDeletingHistoryId] = useState(null);

  // Fetch sessions and history from Supabase on mount
  useEffect(() => {
    const fetchSessionsAndHistory = async () => {
      try {
        setIsLoadingSessions(true);
        setFetchError("");

        // Get the current user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        setCurrentUser(user || null);

        if (!user) {
          setFetchError("User not authenticated");
          return;
        }

        const [{ data: activeData, error: activeError }, { data: historyData, error: historyError }] =
          await Promise.all([
            supabase.from("Study").select("*").eq("user_id", user.id).neq("session_status", "completed"),
            supabase.from("study_history").select("*").eq("user_id", user.id).order("completed_at", { ascending: false }),
          ]);

        if (activeError) {
          setFetchError(
            "An error occurred while loading study sessions: " + activeError.message
          );
          console.error("Supabase fetch error:", activeError);
        } else {
          setSessions(activeData || []);
        }

        if (!historyError && historyData) {
          setSessionHistory(
            historyData.map((item) => ({
              id: item.id,
              subject: item.subject,
              topic: item.topic,
              durationMinutes: item.duration_minutes,
              startedAt: item.started_at,
              completedAt: item.completed_at,
              status: item.status,
              xpEarned: item.xp_earned,
            }))
          );
        }
      } catch (err) {
        setFetchError("An unexpected error occurred while loading sessions");
        console.error("Unexpected error:", err);
      } finally {
        setIsLoadingSessions(false);
      }
    };
    fetchSessionsAndHistory();
  }, []);

  useEffect(() => {
    const handleSessionCompleted = (event) => {
      const entry = event.detail;
      if (!entry) return;
      setSessionHistory((prev) => [
        {
          id: entry.id,
          subject: entry.subject,
          topic: entry.topic,
          durationMinutes: entry.duration_minutes,
          startedAt: entry.started_at,
          completedAt: entry.completed_at,
          status: entry.status,
          xpEarned: entry.xp_earned,
        },
        ...prev,
      ]);
      setSessions((prev) => prev.filter((s) => String(s.id) !== String(entry.id)));
    };

    window.addEventListener("hyper-tutor-session-completed", handleSessionCompleted);
    return () => window.removeEventListener("hyper-tutor-session-completed", handleSessionCompleted);
  }, []);

  const [dropdownIndex, setDropdownIndex] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);
  const formRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.openCreateSession) {
      setIsOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  const getTypeIcon = () => {
    return <BookOpen className="h-4 w-4 text-slate-400" />;
  };

  const getPriorityColor = (status) => {
    switch (normalizeStatus(status)) {
      case "very important":
        return "border border-red-900/50 bg-red-950/40 rounded-2xl";
      case "not so important":
        return "border border-emerald-900/50 bg-emerald-950/40 rounded-2xl";
      case "medium":
        return "border border-amber-900/50 bg-amber-950/40 rounded-2xl";
      default:
        return "border border-slate-800 bg-slate-900 rounded-2xl";
    }
  };

  const getStatusBadge = (status) => {
    switch (normalizeStatus(status)) {
      case "very important":
        return (
          <span className="px-2.5 py-1 text-xs font-medium bg-red-950/60 text-red-400 rounded-full border border-red-800/50 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Very Important
          </span>
        );
      case "not so important":
        return (
          <span className="px-2.5 py-1 text-xs font-medium bg-emerald-950/60 text-emerald-400 rounded-full border border-emerald-800/50">
            Not so Important
          </span>
        );
      case "medium":
        return (
          <span className="px-2.5 py-1 text-xs font-medium bg-amber-950/60 text-amber-400 rounded-full border border-amber-800/50">
            Medium
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-medium bg-slate-800 text-slate-300 rounded-full border border-slate-700">
            {status}
          </span>
        );
    }
  };

  const toggleShow = () => {
    setIsOpen(!isOpen);
  };

  const setLoadingState = (id, type, isLoading) => {
    setLoadingStates((prev) => ({
      ...prev,
      [`${id}_${type}`]: isLoading,
    }));
  };

  const addSession = async (e) => {
    e.preventDefault();
    if (
      session.subject &&
      session.topic &&
      session.status &&
      session.date &&
      session.time &&
      session.hours
    ) {
      try {
        setLoadingState("form", "submit", true);

        // Get the current user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setFetchError("User not authenticated");
          return;
        }

        // Save to Supabase with user_id
        const { data, error } = await supabase
          .from("Study")
          .insert([
            {
              Subject: session.subject,
              Topic: session.topic,
              Status: session.status,
              Date: session.date,
              Start: session.time,
              Duration: session.hours,
              muted: false,
              user_id: user.id, // Add user_id to the new session
            },
          ])
          .select("*");

        if (error) {
          setFetchError("Failed to create session: " + error.message);
          console.error("Supabase insert error:", error);
        } else if (data && data.length > 0) {
          setSessions((prev) => [...prev, data[0]]);
          setSession({
            subject: "",
            topic: "",
            status: "",
            date: "",
            time: "",
            hours: "",
          });
          setIsOpen(false);
          setFetchError("");
        }
      } catch (err) {
        setFetchError("An unexpected error occurred while creating session");
        console.error("Unexpected error:", err);
      } finally {
        setLoadingState("form", "submit", false);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSession((prev) => ({
      ...prev,
      [name]: name === "subject" || name === "topic" ? toTitleCase(value) : value,
    }));
  };

  const handleDropdown = (index) => {
    setDropdownIndex(dropdownIndex === index ? null : index);
  };

  const handleMuteToggle = async (id) => {
    if (!id) {
      setFetchError("Cannot toggle mute: Invalid session ID");
      return;
    }

    // Find the session to toggle
    const sessionToToggle = sessions.find((s) => s.id === id);
    if (!sessionToToggle) {
      setFetchError("Session not found");
      return;
    }

    const newMutedState = !sessionToToggle.muted;

    try {
      setLoadingState(id, "mute", true);

      // Update the muted state in Supabase
      const { error } = await supabase
        .from("Study")
        .update({ muted: newMutedState })
        .eq("id", id);

      if (error) {
        setFetchError("Failed to update mute state: " + error.message);
        console.error("Supabase update error:", error);
      } else {
        // Update local state to reflect change
        setSessions((prevSessions) =>
          prevSessions.map((session) =>
            session.id === id ? { ...session, muted: newMutedState } : session
          )
        );
        setFetchError("");
        setDropdownIndex(null);
      }
    } catch (err) {
      setFetchError("An unexpected error occurred while updating session");
      console.error("Unexpected error:", err);
    } finally {
      setLoadingState(id, "mute", false);
    }
  };

  const handleDelete = async (id) => {
    if (!id) {
      setFetchError("Cannot delete: Invalid session ID");
      return;
    }

    try {
      setLoadingState(id, "delete", true);

      const [{ error: notesError }, { error: flashcardsError }, { error: resourcesError }] = await Promise.all([
        supabase.from("notes").delete().eq("session_id", id),
        supabase.from("flashcards").delete().eq("session_id", id),
        supabase.from("resources").delete().eq("session_id", id),
      ]);

      if (notesError || flashcardsError || resourcesError) {
        const childError = notesError || flashcardsError || resourcesError;
        setFetchError("Failed to delete session items: " + childError.message);
        return;
      }

      const { error } = await supabase.from("Study").delete().eq("id", id);

      if (error) {
        setFetchError("Failed to delete session: " + error.message);
        console.error("Supabase delete error:", error);
      } else {
        // Update local state immediately
        setSessions((prevSessions) =>
          prevSessions.filter((session) => session.id !== id)
        );
        setFetchError("");
        setDropdownIndex(null);
      }
    } catch (err) {
      setFetchError("An unexpected error occurred while deleting session");
      console.error("Unexpected error:", err);
    } finally {
      setLoadingState(id, "delete", false);
    }
  };

  // Delete individual session history entry (does not touch Library resources)
  const handleDeleteHistoryItem = async (historyId, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this session history record? Attached resources will not be deleted.")) {
      return;
    }

    try {
      setDeletingHistoryId(historyId);
      const { error } = await supabase.from("study_history").delete().eq("id", historyId);
      if (error) {
        setFetchError("Failed to delete session history record: " + error.message);
      } else {
        setSessionHistory((prev) => prev.filter((item) => item.id !== historyId));
      }
    } catch (err) {
      console.error("Error deleting session history:", err);
      setFetchError("An error occurred while deleting session history");
    } finally {
      setDeletingHistoryId(null);
    }
  };

  // Computed unique subjects for filter
  const uniqueSubjects = Array.from(
    new Set(sessionHistory.map((item) => item.subject).filter(Boolean))
  );

  // Filtered session history items
  const filteredSessionHistory = sessionHistory.filter((item) => {
    if (historySubjectFilter !== "all" && item.subject?.toLowerCase() !== historySubjectFilter.toLowerCase()) {
      return false;
    }
    if (historyStatusFilter !== "all" && item.status?.toLowerCase() !== historyStatusFilter.toLowerCase()) {
      return false;
    }
    if (historyDateFilter !== "all" && item.completedAt) {
      const completedDate = new Date(item.completedAt);
      const now = new Date();
      if (historyDateFilter === "7days") {
        const diff = (now - completedDate) / (1000 * 60 * 60 * 24);
        if (diff > 7) return false;
      } else if (historyDateFilter === "30days") {
        const diff = (now - completedDate) / (1000 * 60 * 60 * 24);
        if (diff > 30) return false;
      }
    }
    return true;
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".dropdown-container")) {
        setDropdownIndex(null);
      }
    };

    if (dropdownIndex !== null) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [dropdownIndex]);

  return (
    <div className="relative min-h-screen">
      {activeSession && (
        <StudyEnvironment
          session={activeSession}
          onClose={() => setActiveSession(null)}
          user={currentUser || undefined}
        />
      )}
      <div className="p-6">
        {fetchError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-300 text-center font-medium">
            {fetchError}
            <button
              onClick={() => setFetchError("")}
              className="ml-2 text-red-800 hover:text-red-900"
            >
              <X className="h-4 w-4 inline" />
            </button>
          </div>
        )}
        <h1 className="px-10 lg:px-0 text-2xl font-bold text-gray-800 mb-6">
          Study Sessions
        </h1>

        {isLoadingSessions ? (
          <LoadingCompanion message="Loading your study sessions..." />
        ) : sessions.length === 0 ? (
          <div className="">
            <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-4">No study sessions yet</p>
            <p className="text-gray-400">
              Click the + button to create your first session
            </p>
          </div>
        ) : (
          <div className="grid w-full grid-cols-1 gap-4 p-2 sm:grid-cols-2 xl:grid-cols-3">
            {sessions.map((sessionItem, index) => {
              const isMuted = sessionItem.muted;
              const isDeleting = loadingStates[`${sessionItem.id}_delete`];
              const isMuting = loadingStates[`${sessionItem.id}_mute`];
              const isPaused = sessionItem.session_status === "paused";

              return (
                <div
                  key={sessionItem.id || index}
                  className={`relative w-full min-w-0 p-5 transition-all hover:shadow-md cursor-pointer ${
                    isMuted
                      ? "bg-slate-900/60 border border-slate-800 rounded-2xl"
                      : getPriorityColor(sessionItem.Status)
                  } ${isDeleting ? "opacity-50" : ""}`}
                  style={
                    isMuted ? { filter: "grayscale(1)", color: "#888" } : {}
                  }
                >
                  <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2 text-gray-600">
                          {getTypeIcon()}
                        </div>
                        {!isMuted && getStatusBadge(sessionItem.Status)}
                      </div>

                      <h2
                        className={`font-semibold mb-1 ${
                          isMuted ? "text-gray-500" : "text-gray-800"
                        }`}
                      >
                        {toTitleCase(sessionItem.Subject || "")}
                      </h2>
                      <h3
                        className={`mb-1 ${
                          isMuted ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {toTitleCase(sessionItem.Topic || "")}
                      </h3>
                      <p
                        className={`text-sm mb-1 ${
                          isMuted ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {sessionItem.Date}{" "}
                        {sessionItem.Start && (
                          <span className="ml-2 text-gray-400">
                            at {sessionItem.Start}
                          </span>
                        )}
                      </p>
                      <p
                        className={`text-sm font-medium ${
                          isMuted ? "text-gray-400" : "text-gray-700"
                        }`}
                      >
                        {sessionItem.Duration} hour(s)
                      </p>
                    </div>
                    <div className="relative flex items-center gap-2 dropdown-container">
                      <button
                        className="flex items-center gap-1 px-3 py-2 bg-green-200 text-black text-sm font-medium rounded-lg hover:bg-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() =>
                          navigate(
                            `/Study/${encodeURIComponent(sessionItem.id)}`
                          )
                        }
                        disabled={isDeleting || isMuting}
                      >
                        <Play className="h-3 w-3" />
                        Start
                      </button>

                      <button
                        className="p-1.5 text-slate-400 hover:text-white transition-colors disabled:opacity-50 rounded-lg"
                        onClick={() => handleDropdown(index)}
                        disabled={isDeleting || isMuting}
                      >
                        {isDeleting || isMuting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                      </button>

                      {dropdownIndex === index && !isDeleting && !isMuting && (
                        <div className="absolute right-0 top-9 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-10 min-w-[120px] overflow-hidden py-1">
                          <button
                            className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                            onClick={() => handleMuteToggle(sessionItem.id)}
                            disabled={isMuting}
                          >
                            {isMuting ? (
                              <span className="flex items-center gap-2">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                {isMuted ? "Unmuting..." : "Muting..."}
                              </span>
                            ) : isMuted ? (
                              "Unmute"
                            ) : (
                              "Mute"
                            )}
                          </button>
                          <button
                            className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700 disabled:opacity-50"
                            onClick={() => handleDelete(sessionItem.id)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <span className="flex items-center gap-2">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Deleting...
                              </span>
                            ) : (
                              "Delete"
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h2
                      className={`font-bold text-lg mb-0.5 ${
                        isMuted ? "text-slate-500" : "text-white"
                      }`}
                    >
                      {toTitleCase(sessionItem.Subject || "")}
                    </h2>
                    <h3
                      className={`text-sm mb-3 ${
                        isMuted ? "text-slate-600" : "text-slate-400"
                      }`}
                    >
                      {toTitleCase(sessionItem.Topic || "")}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>
                        {sessionItem.Date}
                        {sessionItem.Start && ` at ${sessionItem.Start}`}
                      </span>
                      <span>{sessionItem.Duration} hour(s)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Session History Section */}
        <div className="mt-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              Session History
            </h2>

            {/* Filter Bar */}
            {sessionHistory.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {/* Subject Filter */}
                <select
                  value={historySubjectFilter}
                  onChange={(e) => setHistorySubjectFilter(e.target.value)}
                  className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-slate-200 outline-none"
                >
                  <option value="all">All Subjects</option>
                  {uniqueSubjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {toTitleCase(sub)}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value)}
                  className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-slate-200 outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="paused">Paused / Incomplete</option>
                </select>

                {/* Date Filter */}
                <select
                  value={historyDateFilter}
                  onChange={(e) => setHistoryDateFilter(e.target.value)}
                  className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-slate-200 outline-none"
                >
                  <option value="all">All Time</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                </select>
              </div>
            )}
          </div>

          {filteredSessionHistory.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 dark:border-slate-700 bg-white dark:bg-[#18211f] p-8 text-center text-gray-500 dark:text-slate-400">
              <BookOpen className="h-10 w-10 mx-auto mb-2 text-gray-300 dark:text-slate-600" />
              <p className="font-medium text-sm">No session history records match filters.</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                Try clearing or adjusting your filters above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessionHistory.map((item) => {
                const dateStr = item.completedAt ? new Date(item.completedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Recently";
                const isDeletingThis = deletingHistoryId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/Study/history/${item.id}`)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm cursor-pointer hover:border-slate-700 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white text-base">
                          {toTitleCase(item.subject)}
                        </span>
                        <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-950/60 text-emerald-400 rounded-full border border-emerald-800/50">
                          {item.status || "completed"}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-400 truncate">
                        {toTitleCase(item.topic)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {dateStr}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="text-sm font-bold text-white">
                          {item.durationMinutes} min
                        </p>
                        <p className="text-xs font-bold text-amber-400 mt-0.5">
                          +{item.xpEarned || 50} XP
                        </p>
                      </div>

                      {/* Per-item Delete Button */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                        disabled={isDeletingThis}
                        title="Delete this history entry"
                        className="rounded-lg p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                      >
                        {isDeletingThis ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Overlay Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-2xl backdrop-saturate-600"
          style={{ background: "rgba(255,255,255,0.05)" }}
          onClick={(e) => {
            if (formRef.current && !formRef.current.contains(e.target)) {
              setIsOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md" ref={formRef}>
            <form
              className="bg-white p-6 rounded-lg shadow-xl"
              onSubmit={addSession}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">
                  Create Study Session
                </h2>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={loadingStates.form_submit}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <input
                    required
                    type="text"
                    name="subject"
                    value={session.subject}
                    onChange={handleChange}
                    placeholder="e.g., Mathematics, Biology"
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                    disabled={loadingStates.form_submit}
                  />
                </div>

                {/* Topic */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Topic *
                  </label>
                  <input
                    required
                    type="text"
                    name="topic"
                    value={session.topic}
                    onChange={handleChange}
                    placeholder="e.g., Calculus, Cell Division"
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                    disabled={loadingStates.form_submit}
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    required
                    name="status"
                    value={session.status}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                    disabled={loadingStates.form_submit}
                  >
                    <option value="">Select status</option>
                    <option value="Very Important">Very Important</option>
                    <option value="Medium">Medium</option>
                    <option value="Not so Important">Not so Important</option>
                  </select>
                </div>

                {/* Date */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date *
                    </label>
                    <input
                      required
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      name="date"
                      value={session.date}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                      disabled={loadingStates.form_submit}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time *
                    </label>
                    <input
                      required
                      type="time"
                      name="time"
                      value={session.time}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                      disabled={loadingStates.form_submit}
                    />
                  </div>
                </div>

                {/* Hours */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Study Duration (hours) *
                  </label>
                  <input
                    required
                    type="number"
                    name="hours"
                    value={session.hours}
                    onChange={handleChange}
                    placeholder="1"
                    min="0.5"
                    step="0.5"
                    max="100"
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                    disabled={loadingStates.form_submit}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium mt-6 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loadingStates.form_submit}
              >
                {loadingStates.form_submit ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Session...
                  </>
                ) : (
                  "Create Session"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={toggleShow}
        className="fixed bottom-6 right-6 bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out hover:scale-110 z-40"
        title="Create New Session"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      </button>
    </div>
  );
}

export default Study;
