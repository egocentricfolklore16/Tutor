# Probe QA & Testing Journal

## 2026-03-31 - Session Deletion vs Library Materials Persistence
**Learning:** `deleteSession` in `sessionService.js` was explicitly calling `.delete()` on related material tables (`session_notes`, `session_flashcards`, `session_resources`, `session_quizzes`), which destroyed library content upon session deletion. Database schema migration 029 established `ON DELETE SET NULL` constraints so materials survive session deletion and remain in the user's Library with detached `session_id`.
**Action:** When testing session lifecycle operations, verify that session deletion only removes the session row in `Study` and preserves all associated notes, flashcards, resources, and quizzes for Library queries.

## 2026-04-05 - Timezone Travel & Out-Of-Order Streak Calculations
**Learning:** `calculateStreakUpdate` evaluated `daysSinceActivity === 0` to identify same-day no-ops, but when users traveled westward across timezones or the International Date Line (or when client sync delivered backdated activity dates), `daysSinceActivity` was negative (`< 0`), causing `calculateStreakUpdate` to fall through and reset active streaks to 1.
**Action:** Always check `daysSinceActivity <= 0` when computing streak updates to ensure earlier or out-of-order activity dates safely return `noOp: true` without resetting active streaks or modifying `lastActiveDate`.

## 2026-04-12 - Node 22 globalThis.navigator Mocking & Notification Fallback Scheduling
**Learning:** In Node 22+, attempting direct assignment to `globalThis.navigator` throws `TypeError: Cannot set property navigator of #<Object> which has only a getter`. Mocking browser globals like `navigator` or `window` in `node --test` requires using `Object.defineProperty(globalThis, 'navigator', { value: ..., configurable: true, writable: true })`.
**Action:** When mocking browser navigator or window properties in client-side utility unit tests, always use `Object.defineProperty` with `configurable: true` and restore the original property in `finally` blocks.
