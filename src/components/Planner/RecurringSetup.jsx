import React, { useMemo } from 'react';
import { Plus } from 'lucide-react';

const RecurringSetup = ({
  sessions = [],
  onUpdateRecurring,
  onRequestRemove,
  onAddActivity,
}) => {
  const recurringSessions = useMemo(() => {
    const seenIds = new Set();
    const result = [];

    for (const session of sessions || []) {
      const isRec = Boolean(
        session.isRecurring ||
        (session.recurring && session.recurring !== 'none') ||
        session.type === 'recurring_session'
      );
      if (!isRec) continue;

      const uniqueKey = session.activityId || session.id;
      if (uniqueKey && !seenIds.has(uniqueKey)) {
        seenIds.add(uniqueKey);
        result.push(session);
      }
    }
    return result;
  }, [sessions]);

  return (
    <section className="group relative w-full overflow-hidden rounded-3xl bg-white p-5 shadow-surface dark:bg-slate-900">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-purple-600 dark:text-purple-400">Routine view</p>
          <h3 className="mt-1 text-lg font-bold text-purple-950 dark:text-purple-100">Recurring Sessions</h3>
        </div>
        <button
          type="button"
          onClick={onAddActivity}
          title="Add recurring session"
          aria-label="Add recurring session"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-purple-300 bg-white text-purple-600 opacity-100 shadow-sm transition-all duration-300 ease-out hover:scale-110 hover:bg-purple-600 hover:text-white dark:border-purple-700 dark:bg-slate-800 dark:text-purple-300 dark:hover:bg-purple-600 dark:hover:text-white md:scale-75 md:opacity-0 md:group-hover:scale-100 md:group-hover:opacity-100"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {recurringSessions.length === 0 ? (
        <p className="text-sm text-purple-800 dark:text-purple-300">No recurring sessions yet</p>
      ) : (
        <ul className="flex flex-row flex-wrap gap-3">
          {recurringSessions.map((session) => {
            const key = session.activityId || session.id;
            const freq = session.recurring || 'daily';
            return (
              <li
                key={key}
                className="relative min-w-[220px] flex-1 rounded-2xl border border-purple-100 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-purple-900/40 dark:bg-slate-800/80"
              >
                <span
                  className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-purple-500 shadow-sm shadow-purple-500/40"
                  aria-hidden="true"
                />
                <div className="pr-5">
                  <div className="truncate text-sm font-bold text-slate-900 dark:text-white">
                    {session.title}
                  </div>
                  <div className="mt-2 text-xs capitalize text-slate-500 dark:text-slate-400">
                    Repeats {freq}
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <select
                    value={freq}
                    onChange={(e) => onUpdateRecurring && onUpdateRecurring(key, e.target.value)}
                    aria-label={`Repeat frequency for ${session.title}`}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => onRequestRemove && onRequestRemove(session)}
                    aria-label={`Remove recurring session ${session.title}`}
                    className="rounded text-left text-xs font-semibold text-red-500 transition-colors hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 sm:text-right dark:text-red-400 dark:hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default RecurringSetup;
