import React, { useState } from "react";
import { Play, Calendar, Trash2, Clock, AlertTriangle, RefreshCw, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useSlippingSessions from "../../hooks/useSlippingSessions";
import { getOverdueDuration, getSessionStartDate, formatTimeSlot } from "../../lib/plannerUtils";
import supabase from "../../lib/supabase";
import { toDate } from "../../lib/dates";
import ResponsiveSheet from "../common/ResponsiveSheet";

function formatOriginalScheduledTime(session) {
  const startDate = toDate(getSessionStartDate(session));
  if (!startDate) return "Original time unavailable";

  const now = new Date();
  const isToday = startDate.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = startDate.toDateString() === yesterday.toDateString();

  const timeStr = formatTimeSlot(
    `${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`
  );

  if (isToday) {
    return `Today at ${timeStr}`;
  }
  if (isYesterday) {
    return `Yesterday at ${timeStr}`;
  }

  const dateStr = startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${dateStr} at ${timeStr}`;
}

const pad = (val) => String(val).padStart(2, "0");
const localDateStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function KeepsSlipping() {
  const navigate = useNavigate();
  const { slipping, loading, error, refetch } = useSlippingSessions();

  // Reschedule modal state
  const [rescheduleSession, setRescheduleSession] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleError, setRescheduleError] = useState("");
  const [rescheduling, setRescheduling] = useState(false);

  // Delete modal state
  const [deleteSessionTarget, setDeleteSessionTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Render nothing when no slipping sessions (and not loading/error)
  if (!loading && !error && slipping.length === 0) {
    return null;
  }

  const handleStartNow = (session) => {
    navigate(`/Study/${encodeURIComponent(session.id)}`);
  };

  const openRescheduleModal = (session) => {
    setRescheduleSession(session);
    setRescheduleError("");

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    setRescheduleDate(localDateStr(tomorrow));
    setRescheduleTime("09:00");
  };

  const saveReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleSession) return;

    if (!rescheduleDate || !rescheduleTime) {
      setRescheduleError("Please select both date and time.");
      return;
    }

    const [year, month, day] = rescheduleDate.split("-").map(Number);
    const [hours, minutes] = rescheduleTime.split(":").map(Number);
    const selectedStart = toDate(new Date(year, month - 1, day, hours, minutes, 0, 0));

    if (!selectedStart || selectedStart <= new Date()) {
      setRescheduleError("Rescheduled time must be in the future.");
      return;
    }

    setRescheduling(true);
    setRescheduleError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const updatePayload = {
        Date: rescheduleDate,
        Start: rescheduleTime,
        session_status: "active",
      };

      const { error: updateErr } = await supabase
        .from("Study")
        .update(updatePayload)
        .eq("id", rescheduleSession.id)
        .eq("user_id", user.id);

      if (updateErr) throw updateErr;

      setRescheduleSession(null);
      refetch?.();
    } catch (err) {
      console.error("Reschedule error:", err);
      setRescheduleError(err?.message || "Failed to reschedule session.");
    } finally {
      setRescheduling(false);
    }
  };

  const confirmDeleteSession = async () => {
    if (!deleteSessionTarget) return;
    setDeleting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error: delErr } = await supabase
        .from("Study")
        .delete()
        .eq("id", deleteSessionTarget.id)
        .eq("user_id", user.id);

      if (delErr) {
        // Fallback for group study session or fallback tables
        await supabase.from("group_study_sessions").delete().eq("id", deleteSessionTarget.id);
      }

      setDeleteSessionTarget(null);
      refetch?.();
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section
      aria-labelledby="keeps-slipping-title"
      className="rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-amber-50/90 p-4 sm:p-6 shadow-surface transition-colors dark:border-amber-600/30 dark:bg-gradient-to-r dark:from-[#1d2222] dark:via-[#18211f] dark:to-[#1d2222]"
    >
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-600 dark:bg-amber-500/20 dark:text-amber-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="keeps-slipping-title" className="text-xl font-bold text-slate-900 dark:text-white">
                Keeps slipping
              </h2>
              {!loading && !error && (
                <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-800 dark:bg-amber-950/80 dark:text-amber-300">
                  Keeps slipping · {slipping.length}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
              These got pushed back. Pick one and get it done.
            </p>
          </div>
        </div>

        {error && (
          <button
            type="button"
            onClick={() => refetch?.()}
            className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900 transition hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/80"
            title="Retry loading slipping sessions"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading slipping sessions">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div
              key={idx}
              className="h-24 animate-pulse rounded-xl bg-slate-200/60 dark:bg-slate-800/50"
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 flex items-center justify-between">
          <span>Unable to check slipping sessions.</span>
          <button
            type="button"
            onClick={() => refetch?.()}
            className="inline-flex items-center gap-1 font-bold underline hover:text-rose-900 dark:hover:text-rose-100"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Slipping session cards */}
      {!loading && !error && slipping.length > 0 && (
        <div className="space-y-3">
          {slipping.map((session) => {
            const title = session.title || session.Topic || session.Subject || "Study Session";
            const subject = session.subject || session.Subject || "General";
            const scheduledTimeText = formatOriginalScheduledTime(session);
            const overdueInfo = getOverdueDuration(session);

            return (
              <article
                key={session.id}
                className="motion-reduce:animate-none flex flex-col gap-3 rounded-xl border border-amber-200/90 bg-white p-4 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between dark:border-amber-600/30 dark:bg-[#18211f]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-base font-bold text-slate-900 dark:text-white">
                      {title}
                    </span>
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                      {subject}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      {scheduledTimeText}
                    </span>
                    <span>·</span>
                    <time
                      dateTime={getSessionStartDate(session)?.toISOString()}
                      aria-label={`${overdueInfo.display}`}
                      className="font-bold text-rose-600 dark:text-rose-400"
                    >
                      {overdueInfo.display}
                    </time>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => handleStartNow(session)}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-orange-500 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 shadow-button-primary dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Start now</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openRescheduleModal(session)}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <Calendar className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Reschedule</span>
                  </button>

                  <button
                    type="button"
                    title={`Remove ${title}`}
                    aria-label={`Remove ${title}`}
                    onClick={() => setDeleteSessionTarget(session)}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Reschedule Modal */}
      <ResponsiveSheet
        isOpen={Boolean(rescheduleSession)}
        onClose={() => setRescheduleSession(null)}
        title="Reschedule session"
      >
        <form onSubmit={saveReschedule} className="space-y-4 text-slate-900 dark:text-slate-100" noValidate>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Choose a future date and time for{" "}
            <strong className="text-slate-900 dark:text-white">
              {rescheduleSession?.title || rescheduleSession?.Topic || "this session"}
            </strong>
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="reschedule-date" className="mb-1 block text-xs font-bold">
                New Date
              </label>
              <input
                id="reschedule-date"
                type="date"
                min={localDateStr()}
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-900"
              />
            </div>

            <div>
              <label htmlFor="reschedule-time" className="mb-1 block text-xs font-bold">
                New Start Time
              </label>
              <input
                id="reschedule-time"
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
          </div>

          {rescheduleError && (
            <p role="alert" className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {rescheduleError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRescheduleSession(null)}
              className="min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={rescheduling}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-orange-500 px-5 py-2 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
            >
              {rescheduling ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save New Schedule
            </button>
          </div>
        </form>
      </ResponsiveSheet>

      {/* Delete Confirmation Modal */}
      <ResponsiveSheet
        isOpen={Boolean(deleteSessionTarget)}
        onClose={() => setDeleteSessionTarget(null)}
        title="Remove session?"
      >
        <div className="space-y-4 text-slate-900 dark:text-slate-100">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to remove{" "}
            <strong className="text-slate-900 dark:text-white">
              “{deleteSessionTarget?.title || deleteSessionTarget?.Topic || "this session"}”
            </strong>
            ? This action cannot be undone.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeleteSessionTarget(null)}
              className="min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={confirmDeleteSession}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-rose-600 px-5 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50 dark:bg-rose-700 dark:hover:bg-rose-600"
            >
              {deleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Remove Session
            </button>
          </div>
        </div>
      </ResponsiveSheet>
    </section>
  );
}

export default KeepsSlipping;
