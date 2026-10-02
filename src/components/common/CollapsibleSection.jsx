import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * CollapsibleSection provides an accordion wrapper that collapses long lists or content
 * blocks by default on mobile viewports while keeping them visible or toggleable.
 */
export function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  badgeCount,
  children,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#14171c] ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between p-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
        aria-expanded={isOpen}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
              {badgeCount !== undefined && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {badgeCount}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && <div className="border-t border-slate-100 p-4 dark:border-slate-800/60">{children}</div>}
    </div>
  );
}

export default CollapsibleSection;
