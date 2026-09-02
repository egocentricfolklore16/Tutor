import { CalendarDays, Clock3, Repeat, Save, X } from "lucide-react";

const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

function PlannerActivityModal({ mode, form, setForm, subjects, isSaving, onClose, onSubmit }) {
  if (!mode) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }} className="motion-dialog max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl md:p-8">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Study planner</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} title="Close" className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"><X className="h-5 w-5" /></button>
        </div>

        {isTimeBlock ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="sm:col-span-2"><span className="mb-1 block text-sm font-semibold text-slate-700">Block purpose</span><input required value={form.purpose} onChange={(event) => update("purpose", event.target.value)} placeholder="e.g. Deep work" className={fieldClass} /></label>
            <label><span className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700"><CalendarDays className="h-4 w-4 text-blue-600" />Day</span><input required type="date" value={dateValue} onChange={(event) => update("date", event.target.value)} className={fieldClass} /></label>
            <label><span className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700"><Clock3 className="h-4 w-4 text-blue-600" />Start time</span><input required type="time" value={form.blockStart} onChange={(event) => update("blockStart", event.target.value)} className={fieldClass} /></label>
            <label><span className="mb-1 block text-sm font-semibold text-slate-700">End time</span><input required type="time" value={form.blockEnd} onChange={(event) => update("blockEnd", event.target.value)} className={fieldClass} /></label>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="sm:col-span-2"><span className="mb-1 block text-sm font-semibold text-slate-700">{isDeadline ? "Deadline title" : "Topic or session title"}</span><input required value={form.title} onChange={(event) => update("title", event.target.value)} placeholder={isDeadline ? "e.g. Submit research essay" : "e.g. Calculus review"} className={fieldClass} /></label>
            <label><span className="mb-1 block text-sm font-semibold text-slate-700">Subject</span><select required value={form.subject} onChange={(event) => update("subject", event.target.value)} className={fieldClass}><option value="">Select subject</option>{subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label>
            <label><span className="mb-1 block text-sm font-semibold text-slate-700">Importance</span><select required value={form.status} onChange={(event) => update("status", event.target.value)} className={fieldClass}><option value="very important">Very important</option><option value="medium">Medium</option><option value="not so important">Not so important</option></select></label>
            <label><span className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700"><CalendarDays className="h-4 w-4 text-blue-600" />{isDeadline ? "Due date" : "Date"}</span><input required type="date" value={dateValue} onChange={(event) => update("date", event.target.value)} className={fieldClass} /></label>
            {isDeadline ? <label><span className="mb-1 block text-sm font-semibold text-slate-700">Reminder</span><select value={form.reminder} onChange={(event) => update("reminder", Number(event.target.value))} className={fieldClass}><option value="0">No reminder</option><option value="1440">1 day before</option><option value="60">1 hour before</option></select></label> : <>
              <label><span className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700"><Clock3 className="h-4 w-4 text-blue-600" />Start time</span><input required type="time" value={form.startTime} onChange={(event) => update("startTime", event.target.value)} className={fieldClass} /></label>
              <label><span className="mb-1 block text-sm font-semibold text-slate-700">Duration (minutes)</span><input required type="number" min="15" max="1440" step="15" value={form.duration || 0} onChange={(event) => update("duration", Number(event.target.value))} className={fieldClass} /></label>
              <label><span className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700"><Repeat className="h-4 w-4 text-blue-600" />Repeat</span><select value={form.recurring} onChange={(event) => update("recurring", event.target.value)} className={fieldClass}><option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>
              <label><span className="mb-1 block text-sm font-semibold text-slate-700">Reminder</span><select value={form.reminder} onChange={(event) => update("reminder", Number(event.target.value))} className={fieldClass}><option value="0">No reminder</option><option value="15">15 minutes before</option><option value="30">30 minutes before</option><option value="60">1 hour before</option></select></label>
            </>}
          </div>
        )}

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-slate-600 transition hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"><Save className="h-4 w-4" />{isSaving ? "Saving..." : isDeadline ? "Add deadline" : isTimeBlock ? "Add time block" : "Add session"}</button>
        </div>
      </form>
    </div>
  );
}

export default PlannerActivityModal;
