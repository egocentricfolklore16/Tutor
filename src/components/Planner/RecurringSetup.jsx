import React, { useMemo } from 'react';
import { Plus } from 'lucide-react';

const RecurringSetup = ({
  recurringRules = [],
  sessions = [],
  onUpdateRecurring,
  onRequestRemove,
  onAddActivity,
}) => {
  const recurringSessions = useMemo(() => {
    // Prefer recurringRules from table if provided
    if (Array.isArray(recurringRules) && recurringRules.length > 0) {
      return recurringRules.map(rule => ({
        id: rule.id,
        activityId: rule.id,
        title: rule.title,
        subject: rule.subject,
        frequency: rule.frequency || 'daily',
        days_of_week: rule.days_of_week,
        type: 'recurring_session',
      }));
    }

    const seenIds = new Set();
    const result = [];

    for (const session of sessions || []) {
      const isRec = Boolean(
        session.type === 'recurring_session' ||
        session.isRecurring ||
        (session.recurring && session.recurring !== 'none')
      );
      if (!isRec) continue;

      const uniqueKey = session.activityId || session.id;
      if (uniqueKey && !seenIds.has(uniqueKey)) {
        seenIds.add(uniqueKey);
        result.push(session);
      }
    }
    return result;
  }, [recurringRules, sessions]);

  return (
    <section className="group relative w-full rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Routine view</p>
          <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">Recurring Sessions</h3>
        </div>
        <button
          type="button"
          onClick={onAddActivity}
          title="Add recurring session"
          aria-label="Add recurring session"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white motion-reduce:transition-none"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {recurringSessions.length === 0 ? (
        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900/80">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">No recurring sessions yet</p>
        </div>
      ) : (
        <ul className="flex flex-row flex-wrap gap-3">
          {recurringSessions.map((session) => {
            const key = session.activityId || session.id;
            const freq = session.frequency || session.recurring || 'daily';
            return (
              <li
                key={key}
                className="relative min-w-[220px] flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <span
                  className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-emerald-500"
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
                    className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekdays">Weekdays</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => onRequestRemove && onRequestRemove(session)}
                    aria-label={`Remove recurring session ${session.title}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 sm:text-right dark:text-rose-300 dark:hover:bg-rose-950/50 dark:hover:text-rose-200 motion-reduce:transition-none"
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
