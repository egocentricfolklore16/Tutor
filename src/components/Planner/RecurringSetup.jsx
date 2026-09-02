import React from 'react';
import { Plus, Repeat } from 'lucide-react';

const RecurringSetup = ({ sessions, onUpdateRecurring, onAddActivity }) => {
  const recurringSessions = sessions.filter(session => session.recurring !== 'none');

  return (
    <section className="group relative w-full overflow-hidden rounded-3xl bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-purple-600">Routine view</p>
          <h3 className="mt-1 text-lg font-bold text-purple-950">Recurring Sessions</h3>
        </div>
        <button
          type="button"
          onClick={onAddActivity}
          title="Add recurring session"
          aria-label="Add recurring session"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-purple-300 bg-white text-purple-600 opacity-100 shadow-sm transition-all duration-300 ease-out hover:scale-110 hover:bg-purple-600 hover:text-white md:scale-75 md:opacity-0 md:group-hover:scale-100 md:group-hover:opacity-100"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {recurringSessions.length === 0 ? (
        <p className="text-sm text-purple-800">No recurring sessions set up.</p>
      ) : (
        <ul className="flex flex-row flex-wrap gap-3">
          {recurringSessions.map(session => (
            <li key={session.id} className="relative min-w-[220px] flex-1 rounded-2xl border border-purple-100 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
              <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-purple-500 shadow-sm shadow-purple-500/40" aria-hidden="true" />
              <div className="pr-5">
                <div className="truncate text-sm font-bold text-slate-900">{session.title}</div>
                <div className="mt-2 text-xs capitalize text-slate-500">Repeats {session.recurring}</div>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={session.recurring}
                  onChange={(e) => onUpdateRecurring(session.id, e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <button
                  onClick={() => onUpdateRecurring(session.id, 'none')}
                  className="text-left text-xs text-red-500 hover:text-red-700 sm:text-right"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default RecurringSetup;
