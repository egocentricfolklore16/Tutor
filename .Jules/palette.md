## 2025-02-18 - Wrap raw SVG onClick toggles in semantic button elements
**Learning:** Interactive navigation controls implemented as raw `<svg onClick={...}>` elements are inaccessible to keyboard users and screen readers because SVGs are not focusable or interactive by default.
**Action:** Always wrap interactive SVG icons in a `<button type="button">` element with explicit `aria-label`, `title`, and `focus-visible:ring-2` focus indicators.

## 2025-02-23 - Screen reader live regions for dynamic disclosure controls
**Learning:** Dynamic inline content disclosures (such as "Reveal answer" buttons) leave screen reader users uninformed unless the revealed element has appropriate live region attributes (`role="status"` and `aria-live="polite"`).
**Action:** Always add `role="status"` and `aria-live="polite"` to dynamically toggled content containers, ensure interactive triggers have explicit `type="button"`, and set `aria-hidden="true"` on decorative icon SVGs.
