import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * ResponsiveSheet renders a centered modal dialog on desktop (>=768px)
 * and a bottom sheet / drawer on mobile screens (<768px).
 */
export function ResponsiveSheet({ isOpen, onClose, title, children, className = "" }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/60 backdrop-blur-xs md:items-center p-0 md:p-4 animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative z-10 flex max-h-[90vh] md:max-h-[85vh] w-full max-w-lg flex-col rounded-t-3xl md:rounded-2xl bg-white shadow-2xl transition-all dark:bg-[#18211f] dark:text-slate-100 ${className}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Mobile Pull Handle Indicator */}
        <div className="flex w-full justify-center pt-3 pb-1 md:hidden">
          <div className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
          {title && <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 pb-8 md:pb-5">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ResponsiveSheet;
