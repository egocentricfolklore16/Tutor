import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  Check,
  Clock3,
  Flame,
  Loader2,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  Timer,
  Trophy,
  X,
} from "lucide-react";
import supabase from "../../lib/supabase";
import { deleteSession } from "../../lib/sessionService";
import { useStreak } from "../../hooks/useStreak";
import PageContainer from "../common/PageContainer";
import ResponsiveSheet from "../common/ResponsiveSheet";

const INITIAL_FORM = { subject: "", topic: "", status: "", date: "", time: "", hours: "1" };
const HISTORY_PAGE_SIZE = 20;
const DURATION_PRESETS = [25, 45, 60, 90];

const pad = (value) => String(value).padStart(2, "0");
const localDateString = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const localDateTime = (date, time) => new Date(`${date}T${String(time || "00:00").slice(0, 5)}:00`);
const titleCase = (value) => String(value || "").toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
const normalizeStatus = (value) => String(value || "").trim().toLowerCase();
const sessionDurationHours = (session) => Number(session?.Duration ?? session?.hours ?? 0) || 0;
const sessionElapsedSeconds = (session) => Number(session?.elapsed_seconds) || 0;

const formatDuration = (minutes) => {
  const value = Math.max(0, Number(minutes) || 0);
  const hours = Math.floor(value / 60);
  const remaining = Math.round(value % 60);
  if (hours > 0 && remaining === 0) return `${hours} hr${hours === 1 ? "" : "s"}`;
  if (hours > 0) return `${hours} hr${hours === 1 ? "" : "s"} ${remaining} min`;
  return `${remaining} min`;
};

const formatSessionDate = (date, time) => {
  if (!date) return "Date not set";
  const stamp = localDateTime(date, time);
  if (Number.isNaN(stamp.getTime())) return "Date not set";
  const formatted = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(stamp);
  return formatted.replace(", ", ", ").replace(/, (?=\d{1,2}:\d{2})/, " · ");
};

const formatRelative = (date, time) => {
  const stamp = localDateTime(date, time);
  if (Number.isNaN(stamp.getTime())) return "Scheduled";
  const now = new Date();
  const diffMs = stamp.getTime() - now.getTime();
  const minutes = Math.ceil(diffMs / 60000);

  if (minutes < 0) return "Overdue";
  if (minutes <= 1) return "Starts now";
  if (minutes < 60) return `Starts in ${minutes} min`;
  if (localDateString(stamp) === localDateString(now)) return "Today";

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (localDateString(stamp) === localDateString(tomorrow)) return "Tomorrow";

  return stamp.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const isActuallyRunning = (session, now = Date.now()) => {
  if (normalizeStatus(session?.session_status) !== "active" || !session?.last_active_at) return false;
  const heartbeat = new Date(session.last_active_at).getTime();
  return Number.isFinite(heartbeat) && now - heartbeat < 90000;
};

const localWeekStart = (date = new Date()) => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - start.getDay());
  return start;
};

const historyDateLabel = (value) => {
  const date = new Date(value);
  const today = localDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (localDateString(date) === today) return "Today";
  if (localDateString(date) === localDateString(yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

function StudyHome() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentStreak } = useStreak();

  const [sessions, setSessions] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [menuId, setMenuId] = useState(null);
  const [deletingHistoryId, setDeletingHistoryId] = useState(null);

  const [subjectFilter, setSubjectFilter] = useState("all");
  const [rangeFilter, setRangeFilter] = useState("all");
  const [historySearch, setHistorySearch] = useState("");
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(HISTORY_PAGE_SIZE);
  const [clockNow, setClockNow] = useState(Date.now());

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!currentUser) {
          if (mounted) setError("User not authenticated");
          return;
        }
        const [activeResult, historyResult] = await Promise.all([
          supabase.from("Study").select("*").eq("user_id", currentUser.id).neq("session_status", "completed"),
          supabase.from("study_history").select("id, subject, topic, duration_minutes, started_at, completed_at, status, xp_earned").eq("user_id", currentUser.id).order("completed_at", { ascending: false }),
        ]);

        if (activeResult.error) throw activeResult.error;
        if (historyResult.error) throw historyResult.error;

        if (mounted) {
          setSessions(activeResult.data || []);
          setHistory(historyResult.data || []);
        }
      } catch (err) {
        console.error("Unable to load study data:", err);
        if (mounted) setError(err.message || "Unable to load study data.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (location.state?.openCreateSession) {
      openCreate();
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  useEffect(() => {
    const refreshClock = () => setClockNow(Date.now());
    const interval = window.setInterval(refreshClock, 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const onCompleted = (event) => {
      const entry = event.detail;
      if (!entry) return;
      setHistory((current) => [
        {
          id: entry.id,
          subject: entry.subject || "",
          topic: entry.topic || "",
          duration_minutes: entry.duration_minutes,
          started_at: entry.started_at || null,
          completed_at: entry.completed_at || new Date().toISOString(),
          status: entry.status || "completed",
          xp_earned: entry.xp_earned,
        },
        ...current.filter((item) => String(item.id) !== String(entry.id)),
      ]);
      setSessions((current) => current.filter((item) => String(item.id) !== String(entry.session_id)));
    };
    window.addEventListener("hyper-tutor-session-completed", onCompleted);
    return () => window.removeEventListener("hyper-tutor-session-completed", onCompleted);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".kebab-menu-container")) {
        setMenuId(null);
      }
    };
    if (menuId !== null) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [menuId]);

  const isValid = useMemo(() => {
    if (!form.subject.trim() || !form.topic.trim() || !form.status || !form.date || !form.time) return false;
    const hours = Number(form.hours);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 100) return false;
    const start = localDateTime(form.date, form.time);
    if (Number.isNaN(start.getTime()) || start <= new Date()) return false;
    const end = new Date(start.getTime() + hours * 3600000);

    return !sessions.some((other) => {
      if (String(other.id) === String(editingId) || normalizeStatus(other.session_status) === "completed") return false;
      const otherStart = localDateTime(other.Date, other.Start);
      if (Number.isNaN(otherStart.getTime())) return false;
      const otherEnd = new Date(otherStart.getTime() + sessionDurationHours(other) * 3600000);
      return start < otherEnd && end > otherStart;
    });
  }, [form, sessions, editingId]);

  const validationMessage = useMemo(() => {
    if (form.date && form.time) {
      const start = localDateTime(form.date, form.time);
      if (!Number.isNaN(start.getTime()) && start <= new Date()) {
        return "Choose a future date and time.";
      }
    }
    const hours = Number(form.hours);
    if (form.hours && (!Number.isFinite(hours) || hours <= 0 || hours > 100)) {
      return "Duration must be greater than 0 and no more than 100 hours.";
    }
    if (form.date && form.time && hours > 0 && hours <= 100) {
      const start = localDateTime(form.date, form.time);
      const end = new Date(start.getTime() + hours * 3600000);
      const overlap = sessions.some((other) => {
        if (String(other.id) === String(editingId) || normalizeStatus(other.session_status) === "completed") return false;
        const otherStart = localDateTime(other.Date, other.Start);
        if (Number.isNaN(otherStart.getTime())) return false;
        const otherEnd = new Date(otherStart.getTime() + sessionDurationHours(other) * 3600000);
        return start < otherEnd && end > otherStart;
      });
      if (overlap) return "This time overlaps another scheduled session.";
    }
    return "";
  }, [form, sessions, editingId]);

  const openCreate = () => {
    setFormMode("create");
    setEditingId(null);
    setForm({ ...INITIAL_FORM, date: localDateString(), time: "" });
    setFormOpen(true);
  };

  const openEdit = (sessionItem, mode = "edit") => {
    setFormMode(mode);
    setEditingId(mode === "edit" ? sessionItem.id : null);
    const date = mode === "duplicate" && (!sessionItem.Date || localDateTime(sessionItem.Date, sessionItem.Start) <= new Date())
      ? localDateString()
      : sessionItem.Date || localDateString();
    const time = mode === "duplicate" && date === localDateString() && localDateTime(sessionItem.Date, sessionItem.Start) <= new Date()
      ? ""
      : String(sessionItem.Start || "").slice(0, 5);

    setForm({
      subject: sessionItem.Subject || "",
      topic: sessionItem.Topic || "",
      status: sessionItem.Status || "",
      date,
      time,
      hours: String(sessionDurationHours(sessionItem) || 1),
    });
    setMenuId(null);
    setFormOpen(true);
  };

  const changeForm = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === "subject" || name === "topic" ? titleCase(value) : value,
    }));
  };

  const saveSession = async (event) => {
    event.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!currentUser) throw new Error("User not authenticated");

      const values = {
        Subject: form.subject.trim(),
        Topic: form.topic.trim(),
        Status: form.status,
        Date: form.date,
        Start: form.time,
        Duration: Number(form.hours),
      };

      if (formMode === "edit") {
        const { data, error: updateError } = await supabase
          .from("Study")
          .update(values)
          .eq("id", editingId)
          .eq("user_id", currentUser.id)
          .select("*")
          .single();
        if (updateError) throw updateError;
        setSessions((current) => current.map((item) => (String(item.id) === String(editingId) ? data : item)));
      } else {
        const { data, error: insertError } = await supabase
          .from("Study")
          .insert({
            ...values,
            session_status: "active",
            muted: false,
            user_id: currentUser.id,
          })
          .select("*")
          .single();
        if (insertError) throw insertError;
        setSessions((current) => [...current, data]);
      }
      setForm(INITIAL_FORM);
      setFormOpen(false);
    } catch (saveError) {
      console.error("Unable to save study session:", saveError);
      setError(saveError.message || "Unable to save study session.");
    } finally {
      setSubmitting(false);
    }
  };

  const removeSession = async (sessionItem) => {
    setMenuId(null);
    if (!window.confirm(`Delete “${sessionItem.Topic || sessionItem.Subject}” and its attached materials?`)) return;
    setSessions((current) => current.filter((item) => String(item.id) !== String(sessionItem.id)));
    const { error: deleteError } = await deleteSession({ id: sessionItem.id });
    if (deleteError) {
      setSessions((current) => [...current, sessionItem]);
      setError(deleteError.message || "Unable to delete session.");
    }
  };

  const removeHistory = async (event, item) => {
    event.stopPropagation();
    if (!window.confirm("Delete this session history record?")) return;
    setDeletingHistoryId(item.id);
    const { error: deleteError } = await supabase.from("study_history").delete().eq("id", item.id);
    if (deleteError) {
      setError(deleteError.message || "Unable to delete history record.");
    } else {
      setHistory((current) => current.filter((row) => String(row.id) !== String(item.id)));
    }
    setDeletingHistoryId(null);
  };

  const startSession = (sessionItem) => navigate(`/Study/${encodeURIComponent(sessionItem.id)}`);

  const today = localDateString(new Date(clockNow));
  const upcomingBuckets = useMemo(() => {
    const running = [];
    const paused = [];
    const todayItems = [];
    const upcoming = [];
    const overdue = [];

    sessions.forEach((item) => {
      const state = normalizeStatus(item.session_status);
      if (state === "paused") {
        paused.push(item);
        return;
      }
      if (isActuallyRunning(item, clockNow)) {
        running.push(item);
        return;
      }
      const start = localDateTime(item.Date, item.Start);
      if (!Number.isNaN(start.getTime()) && start < new Date(clockNow)) {
        overdue.push(item);
      } else if (item.Date === today) {
        todayItems.push(item);
      } else {
        upcoming.push(item);
      }
    });

    const byStart = (left, right) => localDateTime(left.Date, left.Start) - localDateTime(right.Date, right.Start);
    return {
      upNext: [...running, ...overdue].sort(byStart),
      paused: paused.sort(byStart),
      today: todayItems.sort(byStart),
      upcoming: upcoming.sort(byStart),
    };
  }, [sessions, clockNow, today]);

  const uniqueSubjects = useMemo(() => [...new Set(history.map((item) => item.subject).filter(Boolean))].sort(), [history]);

  const filteredHistory = useMemo(() => {
    const now = new Date(clockNow);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const rangeStart =
      rangeFilter === "today"
        ? startOfToday
        : rangeFilter === "7days"
        ? new Date(clockNow - 7 * 86400000)
        : rangeFilter === "30days"
        ? new Date(clockNow - 30 * 86400000)
        : null;

    const query = historySearch.trim().toLowerCase();
    return history.filter((item) => {
      const completed = item.completed_at ? new Date(item.completed_at) : null;
      if (subjectFilter !== "all" && item.subject?.toLowerCase() !== subjectFilter.toLowerCase()) return false;
      if (rangeStart && (!completed || completed < rangeStart)) return false;
      if (query && !`${item.subject || ""} ${item.topic || ""}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [history, subjectFilter, rangeFilter, historySearch, clockNow]);

  const visibleHistory = filteredHistory.slice(0, visibleHistoryCount);

  const historyGroups = useMemo(() => {
    const groups = new Map();
    visibleHistory.forEach((item) => {
      const key = item.completed_at ? localDateString(new Date(item.completed_at)) : "unknown";
      if (!groups.has(key)) {
        groups.set(key, { title: item.completed_at ? historyDateLabel(item.completed_at) : "Date unavailable", items: [] });
      }
      groups.get(key).items.push(item);
    });
    return [...groups.values()];
  }, [visibleHistory]);

  // BOLT OPTIMIZATION:
  // Memoize aggregated history and active session study statistics.
  // Eliminates multiple array traversals and Date object allocations on every render pass
  // (e.g., when typing in the search input, toggling subject/range filters, or opening menus).
  const statsSummary = useMemo(() => {
    const todayHistoryMinutes = history.reduce((total, item) => {
      if (!item.completed_at || localDateString(new Date(item.completed_at)) !== today) return total;
      return total + (Number(item.duration_minutes) || 0);
    }, 0);

    const activeTodayMinutes = sessions.reduce((total, item) => {
      if (item.Date !== today) return total;
      return total + Math.floor(sessionElapsedSeconds(item) / 60);
    }, 0);

    const todayMinutes = todayHistoryMinutes + activeTodayMinutes;

    const weekStart = localWeekStart(new Date(clockNow));
    const weekHistory = history.filter((item) => item.completed_at && new Date(item.completed_at) >= weekStart);
    const xpThisWeek = weekHistory.reduce((total, item) => total + (Number(item.xp_earned) || 0), 0);
    const sessionsThisWeek = weekHistory.length;

    const totalHistoryMinutes = filteredHistory.reduce((total, item) => total + (Number(item.duration_minutes) || 0), 0);
    const totalHistoryXp = filteredHistory.reduce((total, item) => total + (Number(item.xp_earned) || 0), 0);

    return {
      todayMinutes,
      sessionsThisWeek,
      xpThisWeek,
      totalHistoryMinutes,
      totalHistoryXp,
    };
  }, [history, sessions, clockNow, today, filteredHistory]);

  const {
    todayMinutes,
    sessionsThisWeek,
    xpThisWeek,
    totalHistoryMinutes,
    totalHistoryXp,
  } = statsSummary;

  const renderCard = (item) => {
    const running = isActuallyRunning(item, clockNow);
    const paused = normalizeStatus(item.session_status) === "paused";
    const overdue = !running && !paused && localDateTime(item.Date, item.Start) < new Date(clockNow);

    const plannedSeconds = sessionDurationHours(item) * 3600;
    const elapsed = Math.min(sessionElapsedSeconds(item), plannedSeconds || sessionElapsedSeconds(item));
    const progress = plannedSeconds ? Math.min(100, Math.round((elapsed / plannedSeconds) * 100)) : 0;

    const stateLabel = running ? "Active" : paused ? "Paused" : overdue ? "Overdue" : "Upcoming";
    const priority = normalizeStatus(item.Status);
    const priorityClasses =
      priority === "very important"
        ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
        : priority === "medium"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";

    return (
      <article
        key={item.id}
        className="group flex min-h-[250px] flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus-within:ring-2 focus-within:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-700"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <BookOpen className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-slate-900 dark:text-white">
                {titleCase(item.Topic || item.Subject)}
              </h3>
              <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                {titleCase(item.Subject)}
              </p>
            </div>
          </div>

          <div className="relative shrink-0 kebab-menu-container">
            <button
              type="button"
              aria-label={`More options for ${item.Topic || item.Subject}`}
              aria-expanded={menuId === item.id}
              onClick={() => setMenuId(menuId === item.id ? null : item.id)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-slate-800"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {menuId === item.id && (
              <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => openEdit(item)}
                  className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(item)}
                  className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Reschedule
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(item, "duplicate")}
                  className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => removeSession(item)}
                  className="block w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityClasses}`}>
            {item.Status || "Importance not set"}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              running
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                : paused
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                : overdue
                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {stateLabel}
          </span>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {formatRelative(item.Date, item.Start)}
          </span>
        </div>

        <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 shrink-0 text-slate-400" />
            {formatSessionDate(item.Date, item.Start)}
          </p>
          <p className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 shrink-0 text-slate-400" />
            {formatDuration(sessionDurationHours(item) * 60)} planned
          </p>
        </div>

        {(running || paused) && (
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{formatDuration(Math.floor(elapsed / 60))} studied</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full ${paused ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
          <button
            type="button"
            onClick={() => startSession(item)}
            className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              paused
                ? "bg-amber-500 text-slate-950 hover:bg-amber-400 focus-visible:ring-amber-500"
                : "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500"
            }`}
          >
            <Play className="h-4 w-4 fill-current" />
            {paused || running ? "Resume" : overdue ? "Reschedule" : "Start"}
          </button>
          {overdue && (
            <button
              type="button"
              onClick={() => startSession(item)}
              className="min-h-10 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Start now
            </button>
          )}
        </div>
      </article>
    );
  };

  const renderSessionSection = (title, items, SectionIcon, emptyText = "") => {
    const sectionId = `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    return (
      <section className="mt-9" aria-labelledby={sectionId}>
        <div className="mb-4 flex items-center gap-2">
          <SectionIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h2 id={sectionId} className="text-lg font-bold text-slate-900 dark:text-white">
            {title}
          </h2>
          <span className="text-sm text-slate-500 dark:text-slate-400">{items.length}</span>
        </div>
        {items.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(renderCard)}
          </div>
        ) : emptyText ? (
          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {emptyText}
          </p>
        ) : null}
      </section>
    );
  };

  return (
    <PageContainer maxWidth="max-w-7xl">
      <main className="min-w-0 px-3 py-5 sm:px-5 lg:px-7">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Your learning plan</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Study</h1>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            New Session
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
          >
            <span>{error}</span>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setError("")}
              className="rounded p-1 hover:bg-rose-100 dark:hover:bg-rose-900/50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <section
          aria-label="Study statistics"
          className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-4 dark:border-slate-700 dark:bg-slate-700"
        >
          {[
            [Timer, "Today", formatDuration(todayMinutes)],
            [Check, "Completed this week", String(sessionsThisWeek)],
            [Flame, "Current streak", `${currentStreak} days`],
            [Trophy, "XP this week", String(xpThisWeek)],
          ].map(([StatIcon, label, value]) => (
            <div key={label} className="bg-white px-4 py-4 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                <StatIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                {label}
              </div>
              <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{value}</p>
            </div>
          ))}
        </section>

        {loading ? (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading sessions">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="h-64 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : (
          <>
            {renderSessionSection("Up Next / Active", upcomingBuckets.upNext, Play, "No active or overdue sessions.")}
            {renderSessionSection("Paused", upcomingBuckets.paused, Timer)}
            {renderSessionSection("Today", upcomingBuckets.today, CalendarClock)}
            {renderSessionSection("Upcoming", upcomingBuckets.upcoming, CalendarClock)}
          </>
        )}

        <section className="mt-12" aria-labelledby="study-history-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="study-history-heading" className="text-xl font-bold text-slate-900 dark:text-white">
                History
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {filteredHistory.length} sessions · {(totalHistoryMinutes / 60).toFixed(1)} hrs total · {totalHistoryXp} XP
              </p>
            </div>

            <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-[minmax(150px,auto)_minmax(130px,auto)_minmax(200px,1fr)]">
              <select
                aria-label="Filter history by subject"
                value={subjectFilter}
                onChange={(event) => {
                  setSubjectFilter(event.target.value);
                  setVisibleHistoryCount(HISTORY_PAGE_SIZE);
                }}
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="all">All subjects</option>
                {uniqueSubjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {titleCase(subject)}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter history by time range"
                value={rangeFilter}
                onChange={(event) => {
                  setRangeFilter(event.target.value);
                  setVisibleHistoryCount(HISTORY_PAGE_SIZE);
                }}
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="all">All time</option>
                <option value="today">Today</option>
                <option value="7days">7 days</option>
                <option value="30days">30 days</option>
              </select>

              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  aria-label="Search history"
                  type="search"
                  value={historySearch}
                  onChange={(event) => {
                    setHistorySearch(event.target.value);
                    setVisibleHistoryCount(HISTORY_PAGE_SIZE);
                  }}
                  placeholder="Search sessions"
                  className="min-h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
            </div>
          </div>

          {loading ? (
            <div className="mt-5 space-y-3" aria-label="Loading history">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="mt-5 flex flex-col items-center rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-700">
              <img src="/logo5-removebg-preview.png" alt="" className="mb-3 h-24 w-24 object-contain" />
              <p className="font-semibold text-slate-800 dark:text-slate-100">
                {history.length ? "No sessions match these filters." : "Your study history starts here."}
              </p>
              {history.length === 0 && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4" />
                  Start your first session
                </button>
              )}
            </div>
          ) : (
            <div className="mt-5 space-y-6">
              {historyGroups.map((group) => (
                <div key={group.title}>
                  <h3 className="mb-2 border-b border-slate-200 pb-2 text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    {group.title}
                  </h3>
                  <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-700 dark:bg-slate-900">
                    {group.items.map((item) => (
                      <article
                        key={item.id}
                        onClick={() => navigate(`/Study/history/${item.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") navigate(`/Study/history/${item.id}`);
                        }}
                        role="link"
                        tabIndex={0}
                        className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:hover:bg-slate-800/60"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate font-semibold text-slate-900 dark:text-white">
                            {titleCase(item.topic || item.subject)}
                          </h4>
                          <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                            {titleCase(item.subject)} ·{" "}
                            {item.completed_at
                              ? new Date(item.completed_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                              : "Time unavailable"}
                          </p>
                        </div>
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          {formatDuration(item.duration_minutes)}
                        </span>
                        <span className="min-w-16 text-right text-sm font-semibold text-amber-600 dark:text-amber-400">
                          +{Number(item.xp_earned) || 0} XP
                        </span>
                        <button
                          type="button"
                          aria-label={`Delete ${item.topic || item.subject} history`}
                          disabled={deletingHistoryId === item.id}
                          onClick={(event) => removeHistory(event, item)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50 dark:hover:bg-rose-950/40"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
              {visibleHistoryCount < filteredHistory.length && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleHistoryCount((count) => count + HISTORY_PAGE_SIZE)}
                    className="min-h-10 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Load more
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <ResponsiveSheet
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={formMode === "edit" ? "Edit session" : formMode === "duplicate" ? "Duplicate session" : "New session"}
      >
        <form onSubmit={saveSession} className="space-y-4 text-slate-900 dark:text-slate-100" noValidate>
          <div>
            <label htmlFor="session-subject" className="mb-1 block text-sm font-semibold">
              Subject
            </label>
            <input
              id="session-subject"
              name="subject"
              value={form.subject}
              onChange={changeForm}
              placeholder="e.g. Mathematics"
              required
              className="w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>

          <div>
            <label htmlFor="session-topic" className="mb-1 block text-sm font-semibold">
              Title / Topic
            </label>
            <input
              id="session-topic"
              name="topic"
              value={form.topic}
              onChange={changeForm}
              placeholder="e.g. Calculus"
              required
              className="w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>

          <div>
            <label htmlFor="session-priority" className="mb-1 block text-sm font-semibold">
              Importance
            </label>
            <select
              id="session-priority"
              name="status"
              value={form.status}
              onChange={changeForm}
              required
              className="w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">Choose importance</option>
              <option value="Not so Important">Not so Important</option>
              <option value="Medium">Medium</option>
              <option value="Very Important">Very Important</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="session-date" className="mb-1 block text-sm font-semibold">
                Date
              </label>
              <input
                id="session-date"
                type="date"
                name="date"
                min={localDateString()}
                value={form.date}
                onChange={changeForm}
                required
                className="w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div>
              <label htmlFor="session-time" className="mb-1 block text-sm font-semibold">
                Start time
              </label>
              <input
                id="session-time"
                type="time"
                name="time"
                value={form.time}
                onChange={changeForm}
                required
                className="w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
          </div>

          <div>
            <label htmlFor="session-duration" className="mb-2 block text-sm font-semibold">
              Planned duration
            </label>
            <div className="mb-2 flex flex-wrap gap-2">
              {DURATION_PRESETS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  aria-pressed={Number(form.hours) === minutes / 60}
                  onClick={() => setForm((current) => ({ ...current, hours: String(minutes / 60) }))}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-emerald-500 aria-pressed:border-emerald-600 aria-pressed:bg-emerald-50 aria-pressed:text-emerald-800 dark:border-slate-700 dark:text-slate-200 dark:aria-pressed:bg-emerald-950/50"
                >
                  {minutes} min
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                id="session-duration"
                type="number"
                name="hours"
                min="0.25"
                max="100"
                step="0.25"
                value={form.hours}
                onChange={changeForm}
                required
                className="w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900"
              />
              <span className="shrink-0 text-sm text-slate-500">hours</span>
            </div>
          </div>

          {validationMessage && (
            <p role="alert" className="flex items-start gap-2 text-sm text-rose-600 dark:text-rose-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {validationMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={!isValid || submitting}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {formMode === "edit" ? "Save changes" : formMode === "duplicate" ? "Create duplicate" : "Create session"}
          </button>
        </form>
      </ResponsiveSheet>
    </PageContainer>
  );
}

export default StudyHome;