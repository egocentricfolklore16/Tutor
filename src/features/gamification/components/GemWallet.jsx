import React from "react";

function GemIcon({ className = "h-5 w-5 text-cyan-500" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.5 3h11L21 9l-9 12L3 9l3.5-6Z" fill="currentColor" />
      <path d="M6.5 3 12 9l5.5-6M3 9h18M9.5 9 12 21l2.5-12" stroke="white" strokeOpacity="0.45" strokeWidth="0.6" strokeLinejoin="round" />
    </svg>
  );
}

export function GemWallet({ balance, onVisitShop }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-cyan-50 p-4 shadow-surface dark:bg-cyan-950/30">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-100 dark:bg-cyan-900/50">
          <GemIcon className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-300">Gems Balance</p>
          <p className="text-lg font-black text-cyan-950 dark:text-cyan-100">{balance} Gems</p>
        </div>
      </div>

      {onVisitShop && (
        <button
          type="button"
          onClick={onVisitShop}
          className="rounded-xl bg-cyan-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-cyan-700 active:scale-95"
        >
          Visit Shop
        </button>
      )}
    </div>
  );
}

export default GemWallet;
