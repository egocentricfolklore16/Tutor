import React, { useMemo } from 'react';
import { Plus } from 'lucide-react';

const DeadlineManager = ({ sessions, onAddActivity }) => {
  // BOLT OPTIMIZATION:
  // Pre-filter, compute daysLeft and formattedDueDate, and sort deadlines using useMemo.
  // Eliminates un-memoized array sorting and 4x Date instantiations per deadline on every render.
  const deadlines = useMemo(() => {
    if (!Array.isArray(sessions)) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return sessions
      .filter((session) => session && session.deadline)
      .map((session) => {
        const deadlineDate = new Date(`${session.deadline}T23:59:59`);
        deadlineDate.setHours(0, 0, 0, 0);
        const daysLeft = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
        const formattedDueDate = new Date(`${session.deadline}T00:00:00`).toLocaleDateString();
        return {
          ...session,
          daysLeft,
          formattedDueDate,
        };
      })
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  }, [sessions]);

  return (
    <section className="group relative mb-6 overflow-hidden rounded-3xl bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">Priority view</p>
          <h3 className="mt-1 text-lg font-bold text-red-950">Upcoming exams</h3>
        </div>
        <button
          type="button"
          onClick={onAddActivity}
          title="Add deadline activity"
          aria-label="Add deadline activity"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-300 bg-white text-red-600 opacity-100 shadow-sm transition-all duration-300 ease-out hover:scale-110 hover:bg-red-600 hover:text-white md:scale-75 md:opacity-0 md:group-hover:scale-100 md:group-hover:opacity-100"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {deadlines.length === 0 ? (
        <p className="text-sm text-red-800">No upcoming deadlines. Your priority list is clear.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {deadlines.map((deadline) => (
            <li key={deadline.id} className="relative min-h-28 rounded-2xl border border-red-100 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
              <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/40" aria-hidden="true" />
              <div className="pr-5">
                <div className="truncate text-sm font-bold text-slate-900">{deadline.title}</div>
                <div className="mt-2 truncate text-xs text-slate-500">{deadline.subject}</div>
                <div className="mt-1 text-xs text-slate-500">Due {deadline.formattedDueDate}</div>
              </div>
              <div className="mt-3 inline-flex rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-red-600">
                {deadline.daysLeft < 0
                  ? `${Math.abs(deadline.daysLeft)} days overdue`
                  : deadline.daysLeft === 0
                  ? "Due today"
                  : `in ${deadline.daysLeft} days`}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default DeadlineManager;
