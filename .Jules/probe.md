# Probe QA & Testing Journal

## 2026-03-31 - Session Deletion vs Library Materials Persistence
**Learning:** `deleteSession` in `sessionService.js` was explicitly calling `.delete()` on related material tables (`session_notes`, `session_flashcards`, `session_resources`, `session_quizzes`), which destroyed library content upon session deletion. Database schema migration 029 established `ON DELETE SET NULL` constraints so materials survive session deletion and remain in the user's Library with detached `session_id`.
**Action:** When testing session lifecycle operations, verify that session deletion only removes the session row in `Study` and preserves all associated notes, flashcards, resources, and quizzes for Library queries.

## 2026-04-05 - Timezone Travel & Out-Of-Order Streak Calculations
**Learning:** `calculateStreakUpdate` evaluated `daysSinceActivity === 0` to identify same-day no-ops, but when users traveled westward across timezones or the International Date Line (or when client sync delivered backdated activity dates), `daysSinceActivity` was negative (`< 0`), causing `calculateStreakUpdate` to fall through and reset active streaks to 1.
**Action:** Always check `daysSinceActivity <= 0` when computing streak updates to ensure earlier or out-of-order activity dates safely return `noOp: true` without resetting active streaks or modifying `lastActiveDate`.

## 2026-04-12 - Notification Permission & Deterministic Quiet Hours Testing
**Learning:** In Node unit tests, accessing `Notification.permission` directly throws `ReferenceError` when `Notification` is defined on mocked `window` object. Using `window.Notification` explicitly and injecting an optional `date = new Date()` parameter into `isQuietHoursActive` and `recordNotification` allows deterministic time testing across daytime, overnight, and boundary quiet hour windows without relying on system clocks.
**Action:** Always access browser web APIs via `window.*` when testing client utilities, and inject date/time parameters for time-dependent functions.

## 2026-04-18 - Deterministic Streak Slip Date Offsets & Dynamic Module Extension
**Learning:** Dynamic imports inside module functions (like `import("./streaksCore.js")` in `streaks.js`) require explicit `.js` extensions under Node ESM. When testing date-dependent functions like `checkAndLogStreakSlip`, computing `last_active_date` relative to the current local cutoff date (`getActivityDate(new Date(), timeZone, cutoffHour)`) guarantees deterministic day gap calculations (`daysSinceActivity === 2`) regardless of when the test runner executes.
**Action:** Always compute test dates as offsets from `getActivityDate(new Date(), ...)` rather than hardcoding static calendar dates, and ensure dynamic import paths contain `.js` extensions.
