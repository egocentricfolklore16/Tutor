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
    <section className="group relative mb-6 overflow-hidden rounded-3xl bg-white p-5 shadow-surface dark:bg-slate-900">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600 dark:text-red-400">Priority view</p>
          <h3 className="mt-1 text-lg font-bold text-red-950 dark:text-red-100">Upcoming exams & deadlines</h3>
        </div>
        <button
          type="button"
          onClick={onAddActivity}
          title="Add deadline activity"
          aria-label="Add deadline activity"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-300 bg-white text-red-600 opacity-100 shadow-sm transition-all duration-300 ease-out hover:scale-110 hover:bg-red-600 hover:text-white dark:border-red-800 dark:bg-slate-800 dark:text-red-300 dark:hover:bg-red-600 dark:hover:text-white md:scale-75 md:opacity-0 md:group-hover:scale-100 md:group-hover:opacity-100"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {deadlines.length === 0 ? (
        <p className="text-sm text-red-800 dark:text-red-300">No upcoming deadlines. Your priority list is clear.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {deadlines.map((deadline) => (
            <li key={deadline.id} className="relative min-h-28 rounded-2xl border border-red-100 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-red-900/40 dark:bg-slate-800/80">
              <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/40" aria-hidden="true" />
              <div className="pr-5">
                <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{deadline.title}</div>
                <div className="mt-2 truncate text-xs text-slate-500 dark:text-slate-400">{deadline.subject || "General"}</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Due {deadline.formattedDueDate}</div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600 dark:bg-red-950/50 dark:text-red-300">
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
                      className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {onDeleteActivity && (
                    <button
                      type="button"
                      onClick={() => onDeleteActivity(deadline.id, 'deadline')}
                      title="Delete deadline"
                      className="rounded p-1 text-red-400 hover:text-red-600 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
