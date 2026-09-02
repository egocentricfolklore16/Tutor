import React from 'react';
import { CalendarDays, Clock3, Repeat, Save, X } from 'lucide-react';

const SessionScheduler = ({
  showCreateModal,
  setShowCreateModal,
  newSession,
  setNewSession,
  handleCreateSession,
  subjects,
  isSaving
}) => {
  if (!showCreateModal) return null;

  const dateValue = newSession.date instanceof Date
    ? newSession.date.toISOString().slice(0, 10)
    : newSession.date;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <form onSubmit={(event) => { event.preventDefault(); handleCreateSession(); }} className="motion-dialog max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl md:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Planner</p>
            <h3 className="mt-1 text-2xl font-bold text-slate-900">Add study session</h3>
            <p className="mt-1 text-sm text-slate-500">Set the focus, timing, and repeat pattern for this activity.</p>
          </div>
          <button type="button" onClick={() => setShowCreateModal(false)} title="Close" className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Topic or session title</label>
            <input
              required
              type="text"
              value={newSession.title}
              onChange={(e) => setNewSession(prev => ({
                ...prev,
                title: e.target.value
                  .toLowerCase()
                  .replace(/\b\w/g, (character) => character.toUpperCase()),
              }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              placeholder="e.g. Calculus review"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Subject</label>
            <select
              required
              value={newSession.subject}
              onChange={(e) => setNewSession(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Select Subject</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Importance</label>
            <select required value={newSession.status} onChange={(e) => setNewSession(prev => ({ ...prev, status: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
              <option value="very important">Very important</option>
              <option value="medium">Medium</option>
              <option value="not so important">Not so important</option>
            </select>
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700"><CalendarDays className="h-4 w-4 text-blue-600" />Date</label>
            <input required type="date" value={dateValue} onChange={(e) => setNewSession(prev => ({ ...prev, date: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700"><Clock3 className="h-4 w-4 text-blue-600" />Start time</label>
            <input required type="time" value={newSession.startTime} onChange={(e) => setNewSession(prev => ({ ...prev, startTime: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Duration (minutes)</label>
            <div className="flex gap-2">
              <input required type="number" value={newSession.duration || 0} onChange={(e) => { const minutes = Number(e.target.value); setNewSession(prev => ({ ...prev, duration: Number.isFinite(minutes) ? minutes : 0 })); }} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" min="15" max="1440" step="15" />
              <span className="flex items-center rounded-xl bg-slate-100 px-3 text-sm text-slate-500">minutes</span>
            </div>
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700"><Repeat className="h-4 w-4 text-blue-600" />Repeat</label>
            <select value={newSession.recurring} onChange={(e) => setNewSession(prev => ({ ...prev, recurring: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
              <option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Reminder</label>
            <select value={newSession.reminder} onChange={(e) => setNewSession(prev => ({ ...prev, reminder: Number(e.target.value) }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
              <option value="0">No reminder</option><option value="15">15 minutes before</option><option value="30">30 minutes before</option><option value="60">1 hour before</option>
            </select>
          </div>
        </div>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setShowCreateModal(false)}
            className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Add session"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SessionScheduler;
