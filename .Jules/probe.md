# Probe QA & Testing Journal

## 2026-03-31 - Session Deletion vs Library Materials Persistence
**Learning:** `deleteSession` in `sessionService.js` was explicitly calling `.delete()` on related material tables (`session_notes`, `session_flashcards`, `session_resources`, `session_quizzes`), which destroyed library content upon session deletion. Database schema migration 029 established `ON DELETE SET NULL` constraints so materials survive session deletion and remain in the user's Library with detached `session_id`.
**Action:** When testing session lifecycle operations, verify that session deletion only removes the session row in `Study` and preserves all associated notes, flashcards, resources, and quizzes for Library queries.

## 2026-04-05 - Timezone Travel & Out-Of-Order Streak Calculations
**Learning:** `calculateStreakUpdate` evaluated `daysSinceActivity === 0` to identify same-day no-ops, but when users traveled westward across timezones or the International Date Line (or when client sync delivered backdated activity dates), `daysSinceActivity` was negative (`< 0`), causing `calculateStreakUpdate` to fall through and reset active streaks to 1.
**Action:** Always check `daysSinceActivity <= 0` when computing streak updates to ensure earlier or out-of-order activity dates safely return `noOp: true` without resetting active streaks or modifying `lastActiveDate`.

## 2026-04-08 - Client Notification Time Determinism & Push Timer Suppression
**Learning:** `isQuietHoursActive`, `recordNotification`, and `scheduleStudyReminder` hardcoded system clock `new Date()` or `Date.now()`, making quiet hours, notification muting, and reminder offset delays untestable without monkey-patching globals. Passing an optional `now` / `date` parameter allows deterministic time-boundary testing. `scheduleSessionRemindersFromSessions` mapping over `async scheduleStudyReminder` returned un-awaited Promises rather than timer handles; using `await Promise.all` cleanly resolves batch study reminder timers. Additionally, `scheduleStudyReminder` suppresses local in-tab fallback timers when active Web Push subscriptions are present to prevent duplicate study reminders.
**Action:** Always pass deterministic `now` / `date` values when testing study reminders and notifications, and verify that `scheduleSessionRemindersFromSessions` resolves batch study reminder promises.

## 2026-10-09 - System Prompt Guardrails & Template Termination Syntax
**Learning:** Unterminated template strings in Edge Function prompt modules break test runner parsing with `ERR_INVALID_TYPESCRIPT_SYNTAX`. Truncated system prompt templates miss `<guardrails>` and `{{strictness_rules}}` blocks, leading to prompt leakage and integrity policy test failures.
**Action:** When updating system prompts or AI templates, always verify template syntax termination and ensure guardrail blocks required by `ai_tutor.test.js` remain intact.

## 2026-10-12 - Streak Slip Reason Preservation & Module ESM Extension
**Learning:** `checkAndLogStreakSlip` in `src/lib/streaks.js` calculated `slipReason` as `"missed_day"` vs `"streak_broken"` depending on freeze token availability, but hardcoded `"streak_broken"` in its return payload. Additionally, dynamic ESM imports in `src/lib/` require explicit `.js` extensions (e.g., `import("./streaksCore.js")`) for Node's native test runner.
**Action:** When testing streak slip detection, verify both the persisted database payload and returned result object match `slipReason`, and ensure all dynamic imports specify `.js` file extensions.

## 2026-10-14 - Gamification ESM Import Specifiers & RPC Fallbacks
**Learning:** `src/lib/gamification.js` imported `supabase` without an explicit `.js` file extension (`import supabase from "./supabase"`), which caused `ERR_MODULE_NOT_FOUND` in Node's native test runner. Explicit `.js` extension specifiers are required across `src/lib/` modules.
**Action:** When testing library utilities or RPC fallbacks in `src/lib/`, ensure relative imports include explicit `.js` extensions.

## 2026-10-18 - Group Session Reminders & Timer Handle Lifecycle Tracking
**Learning:** `scheduleGroupSessionReminders` computes multi-offset delays (30m, 15m, 0m) relative to session start time. When testing functions that schedule future `setTimeout` timers, test runners like Node's native runner (`node --test`) will block process termination waiting for open event loop handles unless timer handles are explicitly captured and cleared via `clearTimeout`. `scheduleGroupSessionReminders` now returns `scheduledTimers`, enabling callers and test suites to cleanly manage active timer handles and prevent test timeouts.
**Action:** When scheduling in-tab offset timers, ensure timer scheduling functions return created timer handles, and explicitly clear them in test `finally` blocks.
