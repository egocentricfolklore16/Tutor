## 2025-02-18 - Wrap raw SVG onClick toggles in semantic button elements
**Learning:** Interactive navigation controls implemented as raw `<svg onClick={...}>` elements are inaccessible to keyboard users and screen readers because SVGs are not focusable or interactive by default.
**Action:** Always wrap interactive SVG icons in a `<button type="button">` element with explicit `aria-label`, `title`, and `focus-visible:ring-2` focus indicators.

## 2025-02-23 - Screen reader live regions for dynamic disclosure controls
**Learning:** Dynamic inline content disclosures (such as "Reveal answer" buttons) leave screen reader users uninformed unless the revealed element has appropriate live region attributes (`role="status"` and `aria-live="polite"`).
**Action:** Always add `role="status"` and `aria-live="polite"` to dynamically toggled content containers, ensure interactive triggers have explicit `type="button"`, and set `aria-hidden="true"` on decorative icon SVGs.

## 2025-03-02 - Keyboard dismissal and ARIA dialog roles for overlay search components
**Learning:** Search overlays and custom modal overlays rendered directly without native `<dialog>` leave keyboard-only users trapped unless an explicit `Escape` key listener is attached to dismiss the modal, and lack screen reader context without `role="dialog"`, `aria-modal="true"`, and `aria-label`.
**Action:** Always attach an `Escape` keydown listener when an overlay or modal opens, add `role="dialog"` and `aria-modal="true"`, and set `aria-hidden="true"` on decorative search/close icon SVGs.
