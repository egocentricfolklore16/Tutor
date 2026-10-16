import React from "react";
import { Zap, Gem } from "lucide-react";

export function XpToast({ toast }) {
  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[250] flex items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-2xl animate-in fade-in slide-in-from-bottom-5 dark:bg-amber-950/90 dark:border dark:border-amber-500/30">
      {toast.xp > 0 && (
        <span className="flex items-center gap-1 text-sm font-bold text-amber-400">
          <Zap className="h-4 w-4 fill-amber-400 text-amber-400" /> +{toast.xp} XP
        </span>
      )}
      {toast.gems > 0 && (
        <span className="flex items-center gap-1 text-sm font-bold text-cyan-400">
          <Gem className="h-4 w-4 fill-cyan-400 text-cyan-400" /> +{toast.gems} Gems
        </span>
      )}
    </div>
  );
}

export default XpToast;
