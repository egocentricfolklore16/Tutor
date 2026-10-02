import { useState } from "react";
import { createPortal } from "react-dom";
import { Bell, CalendarDays, Clock3, Repeat, Save, X } from "lucide-react";
import { getPermissionState } from "../../lib/push";

const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

function PlannerActivityModal({ mode, form, setForm, subjects, isSaving, onClose, onSubmit }) {
  const [validationError, setValidationError] = useState("");

  if (!mode) return null;

  const permission = getPermissionState();

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const titles = {
    session: ["Add study session", "Plan a focused learning block."],
    recurring: ["Add recurring session", "Create a rhythm you can return to."],
    deadline: ["Add upcoming deadline", "Keep an important due date visible."],
    timeblock: ["Add time block", "Reserve time for focused work."],
  };
  const [title, subtitle] = titles[mode];
  const isTimeBlock = mode === "timeblock";
  const isDeadline = mode === "deadline";
  const dateValue = form.date instanceof Date ? form.date.toISOString().slice(0, 10) : form.date;

  const validateAndSubmit = (e) => {
    e.preventDefault();
    setValidationError("");

    // Validate that date + startTime is not in the past
    if (form.date && form.startTime) {
      const selectedDateTime = new Date(`${dateValue}T${form.startTime}:00`);
      if (selectedDateTime < new Date()) {
        setValidationError("Cannot schedule a session or deadline in the past.");
        return;
      }
    }

    onSubmit(e);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">{title}</h2>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        {validationError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
            {validationError}
          </div>
        )}

        <form onSubmit={validateAndSubmit} className="space-y-4 text-sm">
          {!isTimeBlock && (
            <label className="block text-xs font-bold text-slate-700">
              Subject
              <select value={form.subject} onChange={(e) => update("subject", e.target.value)} required className={`mt-1.5 ${fieldClass}`}>
                <option value="">Select subject</option>
                {subjects.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </label>
          )}

          <label className="block text-xs font-bold text-slate-700">
            Title
            <input value={form.title} onChange={(e) => update("title", e.target.value)} required placeholder={isDeadline ? "Assignment due" : "Session topic"} className={`mt-1.5 ${fieldClass}`} />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5 mb-1.5"><CalendarDays size={14} /> Date</span>
              <input type="date" value={dateValue} onChange={(e) => update("date", e.target.value)} required className={fieldClass} />
            </label>

            {!isDeadline && (
              <label className="block text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5 mb-1.5"><Clock3 size={14} /> Start time</span>
                <input type="time" value={form.startTime} onChange={(e) => update("startTime", e.target.value)} required className={fieldClass} />
              </label>
            )}
          </div>

          {!isDeadline && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold text-slate-700">
                Duration (mins)
                <input type="number" min="15" step="15" value={form.duration} onChange={(e) => update("duration", e.target.value)} required className={`mt-1.5 ${fieldClass}`} />
              </label>

              {!isTimeBlock && (
                <label className="block text-xs font-bold text-slate-700">
                  Priority
                  <select value={form.status} onChange={(e) => update("status", e.target.value)} className={`mt-1.5 ${fieldClass}`}>
                    <option value="important">Important</option>
                    <option value="very important">Very Important</option>
                    <option value="not so important">Not So Important</option>
                  </select>
                </label>
              )}
            </div>
          )}

          {mode === "recurring" && (
            <label className="block text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5 mb-1.5"><Repeat size={14} /> Repeat rhythm</span>
              <select value={form.recurring} onChange={(e) => update("recurring", e.target.value)} className={fieldClass}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="weekdays">Mon - Fri</option>
              </select>
            </label>
          )}

          <label className="block text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5 mb-1.5"><Bell size={14} /> Reminder</span>
            <select value={form.reminder} onChange={(e) => update("reminder", Number(e.target.value))} className={fieldClass}>
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
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50">
              <Save size={16} />
              {isSaving ? "Saving..." : "Save activity"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default PlannerActivityModal;
