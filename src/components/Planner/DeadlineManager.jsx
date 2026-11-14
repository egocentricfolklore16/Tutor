import React, { useMemo } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const DeadlineManager = ({ sessions = [], onAddActivity, onEditActivity, onDeleteActivity }) => {
  const deadlines = useMemo(() => {
    if (!Array.isArray(sessions)) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return sessions
      .filter((session) => session && (session.type === 'deadline' || session.deadline || session.due_date))
      .map((session) => {
        const dueDateStr = session.due_date || session.deadline;
        const deadlineDate = new Date(`${dueDateStr}T23:59:59`);
        deadlineDate.setHours(0, 0, 0, 0);
        const daysLeft = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
        const formattedDueDate = new Date(`${dueDateStr}T00:00:00`).toLocaleDateString();
        return {
          ...session,
          daysLeft,
          formattedDueDate,
        };
      })
      .filter((item) => item.daysLeft >= -30) // Show upcoming & recently past
      .sort((a, b) => new Date(a.due_date || a.deadline) - new Date(b.due_date || b.deadline));
  }, [sessions]);

  return (
    <section className="group relative rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-rose-600 dark:text-rose-300">Priority view</p>
          <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">Upcoming exams & deadlines</h3>
        </div>
        <button
          type="button"
          onClick={onAddActivity}
          title="Add deadline activity"
          aria-label="Add deadline activity"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white motion-reduce:transition-none"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {deadlines.length === 0 ? (
        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900/80">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">No upcoming deadlines. Your priority list is clear.</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {deadlines.map((deadline) => (
            <li key={deadline.id} className="relative min-h-28 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="pr-5">
                <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{deadline.title}</div>
                <div className="mt-2 truncate text-xs text-slate-500 dark:text-slate-400">{deadline.subject || "General"}</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Due {deadline.formattedDueDate}</div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                  {deadline.daysLeft < 0
                    ? `${Math.abs(deadline.daysLeft)} days overdue`
                    : deadline.daysLeft === 0
                    ? "Due today"
                    : `in ${deadline.daysLeft} days`}
                </div>
                <div className="flex items-center gap-1">
                  {onEditActivity && (
                    <button
                      type="button"
                      onClick={() => onEditActivity(deadline)}
                      title="Edit deadline"
                      aria-label={`Edit deadline ${deadline.title}`}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white motion-reduce:transition-none"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  )}
                  {onDeleteActivity && (
                    <button
                      type="button"
                      onClick={() => onDeleteActivity(deadline.id, 'deadline')}
                      title="Delete deadline"
                      aria-label={`Delete deadline ${deadline.title}`}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:text-rose-300 dark:hover:bg-rose-950/50 dark:hover:text-rose-200 motion-reduce:transition-none"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default DeadlineManager;
