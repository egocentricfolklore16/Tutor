import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import supabase from "../../lib/supabase";
import StudyEnvironment from "./studyEnviron/StudyEnvironment";
import LoadingCompanion from "../common/LoadingCompanion";
import PageContainer from "../common/PageContainer";
import ResponsiveSheet from "../common/ResponsiveSheet";
import { deleteSession } from "../../lib/sessionService";
import { useAITutor } from "../../app/AITutorContext";
import {
  AlertCircle,
  BookOpen,
  Clock3,
  Loader2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Sparkles,
  Target,
  Trophy,
  X,
} from "lucide-react";

function Study() {
  const { isOpen: isAIOpen } = useAITutor();
  const toTitleCase = (value) =>
    String(value || "")
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
  const [historySubjectFilter, setHistorySubjectFilter] = useState("all");
  const [historyDateFilter, setHistoryDateFilter] = useState("all");
  const [deletingHistoryId, setDeletingHistoryId] = useState(null);

  useEffect(() => {
    const fetchSessionsAndHistory = async () => {
      try {
        setIsLoadingSessions(true);
        setFetchError("");

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
          setFetchError("An error occurred while loading study sessions: " + activeError.message);
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
              completedAt: item.completed_at,
              status: item.status || "completed",
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
          completedAt: entry.completed_at,
          status: entry.status || "completed",
          xpEarned: entry.xp_earned,
        },
        ...prev,
      ]);
      setSessions((prev) => prev.filter((s) => String(s.id) !== String(entry.session_id)));
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

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.openCreateSession) {
      setIsOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  const getTypeIcon = () => <BookOpen className="h-4 w-4 text-slate-500" />;

  const getPriorityColor = (status) => {
    switch (normalizeStatus(status)) {
      case "very important":
        return "border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-rose-100/80 rounded-[28px]";
      case "not so important":
        return "border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/80 rounded-[28px]";
      case "medium":
        return "border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-yellow-100/80 rounded-[28px]";
      default:
        return "border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100/80 rounded-[28px]";
    }
  };

  const getStatusBadge = (status) => {
    switch (normalizeStatus(status)) {
      case "very important":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-100 px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-rose-700 uppercase">
            <AlertCircle className="h-3 w-3" />
            High
          </span>
        );
      case "not so important":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-emerald-700 uppercase">
            Light
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-amber-700 uppercase">
            Medium
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-slate-600 uppercase">
            {status}
          </span>
        );
    }
  };

  const setLoadingState = (id, type, isLoading) => {
    setLoadingStates((prev) => ({ ...prev, [`${id}_${type}`]: isLoading }));
  };

  const addSession = async (e) => {
    e.preventDefault();
    if (!session.subject || !session.topic || !session.status || !session.date || !session.time || !session.hours) {
      return;
    }

    try {
      setLoadingState("form", "submit", true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setFetchError("User not authenticated");
        return;
      }

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
            session_status: "active",
            muted: false,
            user_id: user.id,
          },
        ])
        .select("*");

      if (error) {
        setFetchError("Failed to create session: " + error.message);
        console.error("Supabase insert error:", error);
      } else if (data && data.length > 0) {
        setSessions((prev) => [...prev, data[0]]);
        setSession({ subject: "", topic: "", status: "", date: "", time: "", hours: "" });
        setIsOpen(false);
        setFetchError("");
      }
    } catch (err) {
      setFetchError("An unexpected error occurred while creating session");
      console.error("Unexpected error:", err);
    } finally {
      setLoadingState("form", "submit", false);
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
    if (!id) return;
    const sessionToToggle = sessions.find((s) => s.id === id);
    if (!sessionToToggle) return;

    const newMutedState = !sessionToToggle.muted;

    try {
      setLoadingState(id, "mute", true);
      const { error } = await supabase
        .from("Study")
        .update({ muted: newMutedState })
        .eq("id", id);

      if (error) {
        setFetchError("Failed to update mute state: " + error.message);
      } else {
        setSessions((prevSessions) =>
          prevSessions.map((item) => (item.id === id ? { ...item, muted: newMutedState } : item))
        );
        setFetchError("");
        setDropdownIndex(null);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setLoadingState(id, "mute", false);
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this study session and all attached materials?")) {
      return;
    }

    try {
      setLoadingState(id, "delete", true);
      const { error } = await deleteSession({ id });

      if (error) {
        setFetchError("Failed to delete session: " + error.message);
      } else {
        setSessions((prevSessions) => prevSessions.filter((item) => item.id !== id));
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

  const uniqueSubjects = Array.from(new Set(sessionHistory.map((item) => item.subject).filter(Boolean)));

  const filteredSessionHistory = sessionHistory.filter((item) => {
    if (historySubjectFilter !== "all" && item.subject?.toLowerCase() !== historySubjectFilter.toLowerCase()) {
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

  const focusHours = sessions.reduce((sum, item) => sum + Number(item.Duration || 0), 0);
  const completedMinutes = sessionHistory.reduce((sum, item) => sum + Number(item.durationMinutes || 0), 0);
  const summaryMetrics = [
    { label: "Active sessions", value: sessions.length, detail: "Ready to continue", accent: "emerald" },
    { label: "Focus hours", value: `${focusHours + Math.round(completedMinutes / 60)}h`, detail: "Total planned time", accent: "violet" },
    { label: "Completed", value: sessionHistory.length, detail: "Recent wins", accent: "sky" },
    { label: "Streak", value: "7 days", detail: "Momentum intact", accent: "amber" },
  ];

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
    <PageContainer maxWidth="max-w-7xl">
      {activeSession && (
        <StudyEnvironment
          session={activeSession}
          onClose={() => setActiveSession(null)}
          user={currentUser || undefined}
        />
      )}

      <div className="study-page-shell p-2 sm:p-4 md:p-6">
        {fetchError && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 shadow-sm">
            <span>{fetchError}</span>
            <button onClick={() => setFetchError("")} className="rounded-full p-1 hover:bg-rose-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <header className="study-hero relative overflow-hidden rounded-[32px] border border-white/40 bg-white/80 p-5 shadow-[0_32px_90px_-35px_rgba(15,23,42,0.38)] backdrop-blur-xl sm:p-7">
          <div className="study-hero-orb left-[-90px] top-[-80px]" />
          <div className="study-hero-orb bottom-[-80px] right-[-70px] bg-emerald-400/20" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-semibold tracking-[0.18em] text-emerald-700 uppercase">
                <Sparkles className="h-3.5 w-3.5" />
                Study dashboard
              </div>
              <h1 className="text-3xl font-black tracking-[-0.06em] text-slate-900 sm:text-4xl xl:text-5xl">
                Keep your learning momentum alive.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                Turn each focus block into a polished learning ritual—clear priorities, steady progress, and fewer distractions.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row xl:flex-col xl:items-end">
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_35px_-18px_rgba(15,23,42,0.65)] transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                New study session
              </button>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                <Target className="h-3.5 w-3.5 text-emerald-600" />
                {sessions.length} active focus blocks
              </div>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryMetrics.map((metric) => (
            <div key={metric.label} className="study-stat-card">
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-${metric.accent}-100`}>
                {metric.accent === "emerald" && <BookOpen className="h-4 w-4 text-emerald-700" />}
                {metric.accent === "violet" && <Clock3 className="h-4 w-4 text-violet-700" />}
                {metric.accent === "sky" && <Trophy className="h-4 w-4 text-sky-700" />}
                {metric.accent === "amber" && <Sparkles className="h-4 w-4 text-amber-700" />}
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{metric.label}</p>
              <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{metric.value}</p>
              <p className="mt-2 text-sm text-slate-500">{metric.detail}</p>
            </div>
          ))}
        </div>

        <section className="mt-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Study list</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Active &amp; paused sessions</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Create session
            </button>
          </div>

          {isLoadingSessions ? (
            <LoadingCompanion message="Loading your study sessions..." />
          ) : sessions.length === 0 ? (
            <div className="overflow-hidden rounded-[28px] border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-sm">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <BookOpen className="h-9 w-9" />
              </div>
              <p className="mt-6 text-xl font-bold text-slate-800">No active or paused study sessions</p>
              <p className="mt-2 text-sm text-slate-500">Create a new session to start a focused learning block.</p>
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-500"
              >
                <Plus className="h-4 w-4" />
                Create session
              </button>
            </div>
          ) : (
            <div className={`grid w-full grid-cols-1 gap-4 sm:grid-cols-2 ${isAIOpen ? "xl:grid-cols-2" : "xl:grid-cols-3"}`}>
              {sessions.map((sessionItem, index) => {
                const isMuted = sessionItem.muted;
                const isDeleting = loadingStates[`${sessionItem.id}_delete`];
                const isMuting = loadingStates[`${sessionItem.id}_mute`];
                const isPaused = sessionItem.session_status === "paused";

                return (
                  <div
                    key={sessionItem.id || index}
                    className={`study-session-card ${isDeleting ? "opacity-60" : ""} ${
                      isMuted ? "bg-slate-900 text-white shadow-black/10" : getPriorityColor(sessionItem.Status)
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon()}
                        {!isMuted && getStatusBadge(sessionItem.Status)}
                      </div>

                      <div className="relative flex items-center gap-2 dropdown-container">
                        <button
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                            isPaused ? "bg-amber-500 text-slate-950 hover:bg-amber-400" : "bg-emerald-600 text-white hover:bg-emerald-500"
                          }`}
                          onClick={() => navigate(`/Study/${encodeURIComponent(sessionItem.id)}`)}
                          disabled={isDeleting || isMuting}
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          {isPaused ? "Resume" : "Start"}
                        </button>

                        <button
                          className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50"
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
                          <div className="absolute right-0 top-10 z-20 min-w-[140px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_18px_40px_-20px_rgba(15,23,42,0.5)]">
                            <button
                              className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                              onClick={() => handleMuteToggle(sessionItem.id)}
                            >
                              {isMuted ? "Unmute" : "Mute"}
                            </button>
                            <button
                              className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                              onClick={() => handleDelete(sessionItem.id)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      <div className="flex items-center gap-2">
                        {isPaused ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-700">
                            <Pause className="h-3 w-3" />
                            Paused
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-700">
                            <Play className="h-3 w-3 fill-current" />
                            Active
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-xl font-black tracking-tight text-slate-900">
                          {toTitleCase(sessionItem.Subject || "")}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">{toTitleCase(sessionItem.Topic || "")}</p>
                      </div>

                      <div className="rounded-2xl border border-slate-200/80 bg-white/60 p-3 text-sm text-slate-600">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-slate-500">Date</span>
                          <span className="font-semibold text-slate-800">{sessionItem.Date}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span className="font-medium text-slate-500">Time</span>
                          <span className="font-semibold text-slate-800">{sessionItem.Start || "—"}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span className="font-medium text-slate-500">Length</span>
                          <span className="font-semibold text-slate-800">{sessionItem.Duration} hour(s)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-12">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Progress</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Session history</h2>
            </div>

            {sessionHistory.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={historySubjectFilter}
                  onChange={(e) => setHistorySubjectFilter(e.target.value)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="all">All subjects</option>
                  {uniqueSubjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {toTitleCase(sub)}
                    </option>
                  ))}
                </select>

                <select
                  value={historyDateFilter}
                  onChange={(e) => setHistoryDateFilter(e.target.value)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="all">All time</option>
                  <option value="7days">Last 7 days</option>
                  <option value="30days">Last 30 days</option>
                </select>
              </div>
            )}
          </div>

          {filteredSessionHistory.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/80 p-8 text-center">
              <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">No session history matches your filters yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessionHistory.map((item) => {
                const dateStr = item.completedAt
                  ? new Date(item.completedAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Recent session";
                const isDeletingThis = deletingHistoryId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/Study/history/${item.id}`)}
                    className="study-history-item flex flex-col justify-between gap-4 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="text-lg font-black tracking-tight text-slate-900">{toTitleCase(item.subject)}</span>
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-700">
                          Completed
                        </span>
                      </div>
                      <p className="truncate text-sm font-medium text-slate-600">{toTitleCase(item.topic)}</p>
                      <p className="mt-1 text-xs text-slate-500">{dateStr}</p>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="text-left sm:text-right">
                        <p className="text-lg font-black text-slate-900">{item.durationMinutes} min</p>
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-600">
                          +{item.xpEarned || 50} XP
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                        disabled={isDeletingThis}
                        title="Delete this history entry"
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                      >
                        {isDeletingThis ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <ResponsiveSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title="Create Study Session">
        <form className="space-y-4 text-slate-800" onSubmit={addSession}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Subject *</label>
            <input
              required
              type="text"
              name="subject"
              value={session.subject}
              onChange={handleChange}
              placeholder="e.g., Mathematics, Biology"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-base text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              disabled={loadingStates.form_submit}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Topic *</label>
            <input
              required
              type="text"
              name="topic"
              value={session.topic}
              onChange={handleChange}
              placeholder="e.g., Calculus, Cell Division"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-base text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              disabled={loadingStates.form_submit}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status *</label>
            <select
              required
              name="status"
              value={session.status}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-base text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              disabled={loadingStates.form_submit}
            >
              <option value="">Select status</option>
              <option value="Very Important">Very Important</option>
              <option value="Medium">Medium</option>
              <option value="Not so Important">Not so Important</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date *</label>
              <input
                required
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                name="date"
                value={session.date}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-base text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                disabled={loadingStates.form_submit}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Start time *</label>
              <input
                required
                type="time"
                name="time"
                value={session.time}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-base text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                disabled={loadingStates.form_submit}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Study duration (hours) *</label>
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
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-base text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              disabled={loadingStates.form_submit}
            />
          </div>

          <button
            type="submit"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-50"
            disabled={loadingStates.form_submit}
          >
            {loadingStates.form_submit ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating session...
              </>
            ) : (
              "Create session"
            )}
          </button>
        </form>
      </ResponsiveSheet>

      {!activeSession &&
        createPortal(
          <button
            onClick={() => setIsOpen(true)}
            className="fixed bottom-36 right-4 z-[85] flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_18px_40px_-12px_rgba(16,185,129,0.7)] transition duration-300 hover:scale-105 hover:shadow-[0_24px_48px_-16px_rgba(16,185,129,0.8)]"
            title="Create New Session"
          >
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>,
          document.body
        )}
    </PageContainer>
  );
}

export default Study;
