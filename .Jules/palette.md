## 2025-02-18 - Wrap raw SVG onClick toggles in semantic button elements
**Learning:** Interactive navigation controls implemented as raw `<svg onClick={...}>` elements are inaccessible to keyboard users and screen readers because SVGs are not focusable or interactive by default.
**Action:** Always wrap interactive SVG icons in a `<button type="button">` element with explicit `aria-label`, `title`, and `focus-visible:ring-2` focus indicators.
