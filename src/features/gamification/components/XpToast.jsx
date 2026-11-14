import React from "react";
import { Zap, Gem } from "lucide-react";

export function XpToast({ toast }) {
  if (!toast) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[250] pb-[env(safe-area-inset-bottom)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-5 md:bottom-6 md:left-auto md:right-6 md:max-w-md">
      <div role="status" className="flex max-w-full items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-sm dark:bg-amber-950/90 dark:border dark:border-amber-500/30">
        {toast.message ? (
          <span className="break-words text-xs font-bold text-amber-300">{toast.message}</span>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

export default XpToast;
