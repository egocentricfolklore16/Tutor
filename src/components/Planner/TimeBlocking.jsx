import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

const TimeBlocking = ({ blockedTimes = [], onAddActivity, onDeleteBlock }) => {

  return (
    <section className="group relative w-full rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Protected time</p>
          <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">Time Blocking</h3>
        </div>
        <button
          type="button"
          onClick={onAddActivity}
          title="Add time block"
          aria-label="Add time block"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white motion-reduce:transition-none"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-row flex-wrap gap-3">
        {blockedTimes.map((block) => (
          <div key={block.id} className="relative min-w-[220px] flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="pr-5">
              <div className="text-sm font-bold text-slate-900 dark:text-white">{block.purpose || block.title}</div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {block.block_date || block.day} · {block.start_time || block.start} - {block.end_time || block.end}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onDeleteBlock(block.id, 'time_block')}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:text-rose-300 dark:hover:bg-rose-950/50 dark:hover:text-rose-200 motion-reduce:transition-none"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        ))}
        {blockedTimes.length === 0 && (
          <div className="flex min-h-[180px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900/80">
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">No protected time blocks set up.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default TimeBlocking;
