## 2026-10-16 - Gamification Single Source of Truth & Append-Only Ledger Design
**Learning:** Consolidating gamification reads (`useGamification`) into a single custom hook backed by `useProfile` and `useStreak` ensures header badges, overview greeting chips, and study session progress render uniform XP, level, gem, and streak state across re-renders and Realtime updates without stale fallback zeroes.
**Action:** When creating new gamification surfaces, always import `useGamification` from `src/features/gamification` rather than computing XP level curves or querying `profiles` directly.

## 2026-10-17 - Unified Gamification Celebration System
**Learning:** Managing level-up celebrations via a local storage key (`hyper_tutor_last_seen_level`) inside `useCelebrations` prevents duplicate modal popups across re-renders and refreshes while immediately celebrating level transitions whenever `xp.level` increments.
**Action:** Always wrap celebrations with `CelebrationLayer` and check `prefers-reduced-motion` and `aria-live="polite"` attributes so celebrations are accessible and non-disruptive.

## 2026-10-18 - Contiguous Active Streak Date Backfilling for Weekday Rows
**Learning:** When displaying 7-day weekday activity rows in streak dropdowns, sparse DB activity tables (`streak_days`, `daily_session_tracking`) may lack explicit rows for past days of an active streak. Backfilling contiguous dates backwards from `lastCompletedDate` / `lastActiveDate` for `currentStreak` days ensures active streaks correctly render completed fire icons across all days in the week.
**Action:** Always derive contiguous active streak dates relative to the user's 3am local-time cutoff when computing 7-day streak visual states.

## 2026-10-19 - Daily Quests & Daily Goal Progress Suite Integration
**Learning:** Pairing `DailyGoalRing` with `QuestList` on the Dashboard Overview provides students with immediate visual targets (daily study minutes ring + 3 daily quests + 1 weekly challenge) while displaying honest preview states when the backend daily quest engine is pending.
**Action:** Always interface quest and goal UI components with `gamificationService` typed methods and feature flags so frontend rendering stays honest and seamless before backend RPCs ship.

## 2026-10-20 - Gem Rewards & Cosmetics Shop System
**Learning:** Providing a dedicated Gem Shop page (`src/components/Shop/Shop.jsx`) gives students clear gem sinks (Streak Freezes, Streak Repairs, Avatar Frames, Timer Skins) with immediate feedback and honest availability indicators when cosmetic items await server backing.
**Action:** Wire all "Visit Shop" triggers across header dropdowns and wallet cards directly to `/Shop` so students can view and manage their gem balance and purchases at any time.

## 2026-10-22 - Level & XP Milestones Roadmap Suite
**Learning:** Incorporating a dedicated Level & XP Milestones Roadmap Card (`LevelProgressCard`) on the Progress page provides students with a tangible view of unlocked perks and upcoming milestone targets (such as custom timer themes, AI Quiz generation, and 2x Gem Multipliers), transforming XP points into meaningful goals.
**Action:** Always pair Level/XP progress bars with milestone perks so students understand the tangible value of leveling up.

## 2026-10-24 - Level Roadmap S-Curve Layout & Clean Lint Verification
**Learning:** Prefixing destructure parameters and unused hook variables with underscore (`_var`) across complex interactive gamification components (`LevelRoadmap.jsx`, `NodeDetailSheet.jsx`, `RoadmapNode.jsx`) keeps codebase linting 100% clean while preserving standard prop interfaces and event handlers for full accessibility.
**Action:** Always run `pnpm lint` after modifying gamification component props to catch unused variable warnings before PR delivery.
