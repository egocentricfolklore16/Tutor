## 2025-02-18 - Wrap raw SVG onClick toggles in semantic button elements
**Learning:** Interactive navigation controls implemented as raw `<svg onClick={...}>` elements are inaccessible to keyboard users and screen readers because SVGs are not focusable or interactive by default.
**Action:** Always wrap interactive SVG icons in a `<button type="button">` element with explicit `aria-label`, `title`, and `focus-visible:ring-2` focus indicators.

## 2025-02-23 - Slide-over drawers require dialog accessibility & Escape key handlers
**Learning:** Slide-over panel components like `NotificationCenter` often lack proper `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, accessible labels for icon-only close/dismiss buttons, and an `Escape` key close listener.
**Action:** Always ensure drawer/slide-over panels implement `role="dialog"`, `aria-modal="true"`, `aria-labelledby` linked to the heading via `useId`, explicit `aria-label`s on icon buttons, and `Escape` key event listeners when `isOpen` is true.
