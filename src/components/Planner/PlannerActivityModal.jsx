import { useState } from "react";
import { Bell, CalendarDays, Clock3, Repeat, Save } from "lucide-react";
import { getPermissionState } from "../../lib/push";
import ResponsiveSheet from "../common/ResponsiveSheet";

const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100";

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

  return (
    <ResponsiveSheet isOpen={Boolean(mode)} onClose={onClose} title={title}>
      <p className="-mt-2 mb-4 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>

      {validationError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {validationError}
        </div>
      )}

      <form onSubmit={validateAndSubmit} className="space-y-4 text-sm">
        {!isTimeBlock && (
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Subject
            <select value={form.subject} onChange={(e) => update("subject", e.target.value)} required className={`mt-1.5 ${fieldClass}`}>
              <option value="">Select subject</option>
              {subjects.map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </label>
        )}

        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          Title
          <input value={form.title} onChange={(e) => update("title", e.target.value)} required placeholder={isDeadline ? "Assignment due" : "Session topic"} className={`mt-1.5 ${fieldClass}`} />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5 mb-1.5"><CalendarDays size={14} /> Date</span>
            <input type="date" value={dateValue} onChange={(e) => update("date", e.target.value)} required className={fieldClass} />
          </label>

          {!isDeadline && (
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5 mb-1.5"><Clock3 size={14} /> Start time</span>
              <input type="time" value={form.startTime} onChange={(e) => update("startTime", e.target.value)} required className={fieldClass} />
            </label>
          )}
        </div>

        {!isDeadline && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Duration (mins)
              <input type="number" min="15" step="15" value={form.duration} onChange={(e) => update("duration", e.target.value)} required className={`mt-1.5 ${fieldClass}`} />
            </label>

            {!isTimeBlock && (
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
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
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5 mb-1.5"><Repeat size={14} /> Repeat rhythm</span>
            <select value={form.recurring} onChange={(e) => update("recurring", e.target.value)} className={fieldClass}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="weekdays">Mon - Fri</option>
            </select>
          </label>
        )}

        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          <span className="flex items-center gap-1.5 mb-1.5"><Bell size={14} /> Reminder</span>
          <select value={form.reminder} onChange={(e) => update("reminder", Number(e.target.value))} className={fieldClass}>
            <option value={0}>At time of event</option>
            <option value={15}>15 minutes before</option>
            <option value={30}>30 minutes before</option>
            <option value={60}>1 hour before</option>
          </select>
        </label>

        {permission !== "granted" && (
          <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            Browser push notifications are disabled. You will receive in-app alerts when signed in.
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
            Cancel
          </button>
          <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50">
            <Save size={16} />
            {isSaving ? "Saving..." : "Save activity"}
          </button>
        </div>
      </form>
    </ResponsiveSheet>
  );
}

export default PlannerActivityModal;
