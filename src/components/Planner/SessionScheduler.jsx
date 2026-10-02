import React, { useState } from 'react';
import { Bell, CalendarDays, Clock3, Repeat, Save, X } from 'lucide-react';
import { getPermissionState } from '../../lib/push';

const SessionScheduler = ({
  showCreateModal,
  setShowCreateModal,
  newSession,
  setNewSession,
  handleCreateSession,
  subjects,
  isSaving
}) => {
  const [validationError, setValidationError] = useState("");

  if (!showCreateModal) return null;

  const permission = getPermissionState();

  const dateValue = newSession.date instanceof Date
    ? newSession.date.toISOString().slice(0, 10)
    : newSession.date;

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError("");

    // Validate that date + startTime is not in the past
    if (newSession.date && newSession.startTime) {
      const selectedDateTime = new Date(`${dateValue}T${newSession.startTime}:00`);
      if (selectedDateTime < new Date()) {
        setValidationError("Cannot schedule a study session in the past.");
        return;
      }
    }

    handleCreateSession();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">Schedule Study Session</h2>
            <p className="text-xs text-slate-500">Plan a focused learning block for your schedule.</p>
          </div>
          <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        {validationError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
            {validationError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <label className="block text-xs font-bold text-slate-700">
            Subject
            <select
              value={newSession.subject}
              onChange={(e) => setNewSession({ ...newSession, subject: e.target.value })}
              required
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            >
              <option value="">Select subject</option>
              {subjects.map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-bold text-slate-700">
            Title / Topic
            <input
              type="text"
              value={newSession.title}
              onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
              required
              placeholder="e.g. Chapter 4 Integration"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5 mb-1.5"><CalendarDays size={14} /> Date</span>
              <input
                type="date"
                value={dateValue}
                onChange={(e) => setNewSession({ ...newSession, date: e.target.value })}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </label>

            <label className="block text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5 mb-1.5"><Clock3 size={14} /> Start time</span>
              <input
                type="time"
                value={newSession.startTime}
                onChange={(e) => setNewSession({ ...newSession, startTime: e.target.value })}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold text-slate-700">
              Duration (mins)
              <input
                type="number"
                min="15"
                step="15"
                value={newSession.duration}
                onChange={(e) => setNewSession({ ...newSession, duration: e.target.value })}
                required
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </label>

            <label className="block text-xs font-bold text-slate-700">
              Priority / Status
              <select
                value={newSession.status}
                onChange={(e) => setNewSession({ ...newSession, status: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              >
                <option value="important">Important</option>
                <option value="very important">Very Important</option>
                <option value="not so important">Not So Important</option>
              </select>
            </label>
          </div>

          <label className="block text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5 mb-1.5"><Repeat size={14} /> Recurring</span>
            <select
              value={newSession.recurring}
              onChange={(e) => setNewSession({ ...newSession, recurring: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            >
              <option value="none">None (One-time)</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="weekdays">Mon - Fri</option>
            </select>
          </label>

          <label className="block text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5 mb-1.5"><Bell size={14} /> Reminder</span>
            <select
              value={newSession.reminder}
              onChange={(e) => setNewSession({ ...newSession, reminder: Number(e.target.value) })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            >
              <option value={0}>At time of event</option>
              <option value={15}>15 minutes before</option>
              <option value={30}>30 minutes before</option>
              <option value={60}>1 hour before</option>
            </select>
          </label>

          {permission !== "granted" && (
            <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              Browser push notifications are disabled. You will receive in-app alerts when signed in.
            </p>
          )}

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="rounded-xl px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
            >
              <Save size={16} />
              {isSaving ? "Scheduling..." : "Schedule session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SessionScheduler;
