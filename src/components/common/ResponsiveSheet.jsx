import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Global counter for active open modals to safely lock document.body scroll across stacked modals
let activeModalCount = 0;

/**
 * Centered Modal component ( re-exported as Modal and ResponsiveSheet )
 * Enforces centered positioning, scroll-locking, focus management, and accessible structure.
 */
export function ResponsiveSheet({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className = "",
  maxWidth = "max-w-lg",
  closeOnOverlayClick = true,
  disableEscapeKey = false,
}) {
  const titleId = useId();
  const panelRef = useRef(null);
  const previousFocusedElementRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Save previous active element for focus restoration upon modal close
    previousFocusedElementRef.current = document.activeElement;

    activeModalCount += 1;
    document.body.style.overflow = "hidden";

    // Focus first focusable element or panel itself
    const timer = setTimeout(() => {
      if (panelRef.current) {
        const focusable = panelRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          panelRef.current.focus();
        }
      }
    }, 50);

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !disableEscapeKey) {
        event.preventDefault();
        onClose?.();
      } else if (event.key === "Tab" && panelRef.current) {
        // Focus trap inside modal
        const focusables = Array.from(
          panelRef.current.querySelectorAll(
            'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusables.length === 0) return;

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);

      activeModalCount = Math.max(0, activeModalCount - 1);
      if (activeModalCount === 0) {
        document.body.style.overflow = "";
      }

      if (previousFocusedElementRef.current && typeof previousFocusedElementRef.current.focus === "function") {
        previousFocusedElementRef.current.focus();
      }
    };
  }, [isOpen, onClose, disableEscapeKey]);

  if (!isOpen) return null;

  const handleOverlayMouseDown = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose?.();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 motion-reduce:animate-none"
      onMouseDown={handleOverlayMouseDown}
      role="presentation"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative flex w-full ${maxWidth} max-h-[90dvh] sm:max-h-[85dvh] flex flex-col rounded-2xl bg-white shadow-2xl transition-all dark:bg-[#14171c] dark:text-slate-100 animate-in zoom-in-95 duration-150 motion-reduce:animate-none outline-none ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          {title ? (
            <h3 id={titleId} className="text-base font-bold text-slate-900 dark:text-white">
              {title}
            </h3>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          {children}
        </div>

        {/* Optional Fixed Footer */}
        {footer && (
          <div className="shrink-0 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 px-5 py-3.5 bg-slate-50/50 dark:bg-[#18211f]/50 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export const Modal = ResponsiveSheet;
export default ResponsiveSheet;
