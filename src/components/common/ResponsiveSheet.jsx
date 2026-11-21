/*
 * REGRESSION PREVENTION / WHY THIS COMPONENT USES A REACT PORTAL:
 * CSS `position: fixed` elements are positioned relative to the viewport EXCEPT when an ancestor element
 * has CSS properties that establish a new containing block (such as `transform`, `perspective`, `filter`,
 * `backdrop-filter`, `contain`, `will-change`, or animations like scale/translate).
 * Rendering modals inline inside nested card components causes fixed dialogs to center inside the card
 * instead of the screen viewport, forcing users to scroll down the page to find them.
 *
 * Therefore, ALL dialogs/modals/sheets MUST be rendered through `createPortal(..., document.body)`
 * using this shared `<Modal />` / `<ResponsiveSheet />` component.
 */

import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Z_INDEX } from "../../constants/zIndex";

// Global counter for active open modals to safely lock document.body scroll across stacked modals
let activeModalCount = 0;
let previousBodyOverflow = "";

/**
 * Shared Viewport-Centered Modal component (re-exported as Modal and ResponsiveSheet)
 * Enforces true viewport centering, body scroll-locking, focus management, and accessible structure.
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
  isSheet = false, // When true on small screens under 640px, aligns to bottom as sheet. Default false (viewport centered).
  isLeftDrawer = false,
  isInline = false,
  isOverlay = false,
}) {
  const titleId = useId();
  const panelRef = useRef(null);
  const previousFocusedElementRef = useRef(null);

  useEffect(() => {
    if (!isOpen || isInline) return;

    // Save previous active element for focus restoration upon modal close
    previousFocusedElementRef.current = document.activeElement;

    if (activeModalCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    activeModalCount += 1;

    // Focus first focusable element or panel itself
    const timer = setTimeout(() => {
      if (panelRef.current) {
        const focusable = panelRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
        document.body.style.overflow = previousBodyOverflow || "";
      }

      if (
        previousFocusedElementRef.current &&
        typeof previousFocusedElementRef.current.focus === "function"
      ) {
        previousFocusedElementRef.current.focus();
      }
    };
  }, [isOpen, isInline, isOverlay, onClose, disableEscapeKey]);

  if (!isOpen) return null;

  if (isInline) {
    if (isOverlay) {
      return (
        <div className="absolute inset-0 z-[70] bg-slate-950/20" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
          <aside
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            className={`absolute inset-y-0 left-0 flex h-full w-full flex-col bg-white shadow-2xl outline-none dark:bg-[#14171c] ${className}`}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h3 id={titleId} className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
              <button type="button" onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Close chat history">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-safe">{children}</div>
          </aside>
        </div>
      );
    }
    return (
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="complementary"
        aria-labelledby={title ? titleId : undefined}
        className={`flex h-full w-full shrink-0 flex-col border-r border-slate-200 bg-white outline-none dark:border-slate-800 dark:bg-[#14171c] sm:w-[280px] sm:min-w-[280px] sm:max-w-[280px] ${className}`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          {title ? (
            <h3 id={titleId} className="truncate text-sm font-bold text-slate-900 dark:text-white">
              {title}
            </h3>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-safe">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
            {footer}
          </div>
        )}
      </aside>
    );
  }

  const handleOverlayMouseDown = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose?.();
    }
  };

  const containerAlignmentClass = isLeftDrawer
    ? "items-end sm:items-stretch sm:justify-start p-0 sm:p-0"
    : isSheet
      ? "items-end sm:items-center"
      : "items-center";

  const panelRoundedClass = isLeftDrawer
    ? "rounded-t-3xl sm:rounded-none"
    : isSheet
      ? "rounded-t-3xl sm:rounded-2xl"
      : "rounded-2xl";

  return createPortal(
    <div
      className={`fixed inset-0 flex justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150 motion-reduce:animate-none ${containerAlignmentClass}`}
      style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
      onMouseDown={handleOverlayMouseDown}
      role="presentation"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        style={{ zIndex: Z_INDEX.MODAL_PANEL }}
        className={`relative flex w-full ${isLeftDrawer ? "h-[85dvh] max-h-none sm:h-full sm:max-w-[340px]" : `${maxWidth} max-h-[calc(100dvh-2rem)]`} flex-col ${panelRoundedClass} bg-white shadow-2xl transition-all dark:bg-[#14171c] dark:text-slate-100 animate-in zoom-in-95 duration-150 motion-reduce:animate-none outline-none ${className}`}
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
        <div className="flex-1 min-h-0 overflow-y-auto p-5 pb-safe">
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
