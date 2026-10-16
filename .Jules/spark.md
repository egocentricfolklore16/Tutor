## 2026-10-16 - Gamification Single Source of Truth & Append-Only Ledger Design
**Learning:** Consolidating gamification reads (`useGamification`) into a single custom hook backed by `useProfile` and `useStreak` ensures header badges, overview greeting chips, and study session progress render uniform XP, level, gem, and streak state across re-renders and Realtime updates without stale fallback zeroes.
**Action:** When creating new gamification surfaces, always import `useGamification` from `src/features/gamification` rather than computing XP level curves or querying `profiles` directly.
