import React from 'react';
import { Clock, Plus } from 'lucide-react';

const TimeBlocking = ({ blockedTimes, onAddActivity, onDeleteBlock }) => {

  return (
    <section className="group relative w-full overflow-hidden rounded-3xl bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Protected time</p>
          <h3 className="mt-1 text-lg font-bold text-blue-950">Time Blocking</h3>
        </div>
        <button
          type="button"
          onClick={onAddActivity}
          title="Add time block"
          aria-label="Add time block"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blue-300 bg-white text-blue-600 opacity-100 shadow-sm transition-all duration-300 ease-out hover:scale-110 hover:bg-blue-600 hover:text-white md:scale-75 md:opacity-0 md:group-hover:scale-100 md:group-hover:opacity-100"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-row flex-wrap gap-3">
        {blockedTimes.map(block => (
          <div key={block.id} className="relative min-w-[220px] flex-1 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/40" aria-hidden="true" />
            <div className="pr-5">
              <div className="text-sm font-bold text-slate-900">{block.purpose}</div>
              <div className="mt-2 text-xs text-slate-500">{block.day} · {block.start} - {block.end}</div>
            </div>
            <button
              onClick={() => onDeleteBlock(block.id)}
              className="mt-3 text-left text-xs text-red-500 hover:text-red-700"
            >
              Delete
            </button>
          </div>
        ))}
        {blockedTimes.length === 0 && <p className="text-sm text-blue-800">No protected time blocks set up.</p>}
      </div>
    </section>
  );
};

export default TimeBlocking;
