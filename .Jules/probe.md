# Probe QA & Testing Journal

## 2026-03-31 - Session Deletion vs Library Materials Persistence
**Learning:** `deleteSession` in `sessionService.js` was explicitly calling `.delete()` on related material tables (`session_notes`, `session_flashcards`, `session_resources`, `session_quizzes`), which destroyed library content upon session deletion. Database schema migration 029 established `ON DELETE SET NULL` constraints so materials survive session deletion and remain in the user's Library with detached `session_id`.
**Action:** When testing session lifecycle operations, verify that session deletion only removes the session row in `Study` and preserves all associated notes, flashcards, resources, and quizzes for Library queries.

## 2026-04-05 - Timezone Travel & Out-Of-Order Streak Calculations
**Learning:** `calculateStreakUpdate` evaluated `daysSinceActivity === 0` to identify same-day no-ops, but when users traveled westward across timezones or the International Date Line (or when client sync delivered backdated activity dates), `daysSinceActivity` was negative (`< 0`), causing `calculateStreakUpdate` to fall through and reset active streaks to 1.
**Action:** Always check `daysSinceActivity <= 0` when computing streak updates to ensure earlier or out-of-order activity dates safely return `noOp: true` without resetting active streaks or modifying `lastActiveDate`.

## 2026-04-10 - Notification Helpers & `resolveSessionDateTime` Guard
**Learning:** `resolveSessionDateTime` in `src/lib/notifications.js` checked `Number.isNaN(baseDate?.getTime?.())` when `baseDate` was `undefined` (which evaluates to `false` because `Number.isNaN(undefined)` is `false`), returning an `Invalid Date` object instead of `null` when session objects had no `date`/`Date` property.
**Action:** Always check `!baseDate || Number.isNaN(baseDate.getTime())` when validating optional Date parsing. When testing browser notification helpers in Node, use `Object.defineProperty(globalThis, "navigator", ...)` and mock `window.Notification = Notification` so `"Notification" in window` evaluates correctly.
