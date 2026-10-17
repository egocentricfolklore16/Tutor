## 2026-10-16 - Gamification Single Source of Truth & Append-Only Ledger Design
**Learning:** Consolidating gamification reads (`useGamification`) into a single custom hook backed by `useProfile` and `useStreak` ensures header badges, overview greeting chips, and study session progress render uniform XP, level, gem, and streak state across re-renders and Realtime updates without stale fallback zeroes.
**Action:** When creating new gamification surfaces, always import `useGamification` from `src/features/gamification` rather than computing XP level curves or querying `profiles` directly.

## 2026-10-17 - Unified Gamification Celebration System
**Learning:** Managing level-up celebrations via a local storage key (`hyper_tutor_last_seen_level`) inside `useCelebrations` prevents duplicate modal popups across re-renders and refreshes while immediately celebrating level transitions whenever `xp.level` increments.
**Action:** Always wrap celebrations with `CelebrationLayer` and check `prefers-reduced-motion` and `aria-live="polite"` attributes so celebrations are accessible and non-disruptive.
