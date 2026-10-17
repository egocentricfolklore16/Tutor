import React from "react";
import { Award, Flame, Sparkles, Trophy, X, Zap } from "lucide-react";

export function CelebrationLayer({ celebration, onClose }) {
  if (!celebration) return null;

  const { type, level, streak, title, message } = celebration;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md animate-fade-in"
    >
      <div className="motion-dialog relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-[#18211f]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          title="Close celebration"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 via-orange-400 to-amber-200 shadow-lg shadow-amber-500/30 animate-bounce">
          {type === "level-up" ? (
            <Trophy className="h-10 w-10 text-white" />
          ) : type === "streak-milestone" ? (
            <Flame className="h-10 w-10 text-white" />
          ) : (
            <Award className="h-10 w-10 text-white" />
          )}
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" /> CELEBRATION
        </div>

        <h2 className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
          {title || (type === "level-up" ? `Level ${level} Unlocked!` : "Milestone Reached!")}
        </h2>

        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {message || (type === "level-up" ? "Your dedication is paying off. Keep up the great work!" : `Incredible! You hit a ${streak}-day streak milestone!`)}
        </p>

        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-amber-500 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-amber-600 active:scale-[0.98]"
          >
            Awesome!
          </button>
        </div>
      </div>
    </div>
  );
}

export default CelebrationLayer;
