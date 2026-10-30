# 🔭 HYPER TUTOR BACKEND GAP REPORT - 2026-10-30

> HOW TO USE THIS FILE
> Option A: paste this ENTIRE file to Claude and say "Build everything in the order given in Part 4, starting with item B-01."
> Option B: paste PART 0 plus ONE item block from Part 3 and say "Build this item."
> Each item block is self-contained once Part 0 is included.

---

# PART 0 - PASTE-FIRST CONTEXT (always include this)

## Your role
You are a senior backend engineer building the missing backend for Hyper Tutor, an AI study platform for high schoolers, college students, and working professionals. The frontend already exists in React + Tailwind CSS. Your job is to build the real backend so every feature below stops being a stub.

## Platform and constraints
- Backend platform: Supabase (Postgres, Auth, RLS, Realtime, Storage, Edge Functions in Deno/TypeScript).
- Package manager: pnpm.
- Frontend: React 19 (.jsx / .tsx), Vite, Tailwind CSS v4, react-router-dom v7.
- Existing tables in Postgres:
  - `profiles`: user details, `education_level`, `subjects`, `learning_style`, `xp_points`, `gems`, `current_streak`, `longest_streak`, `last_active_at`, `freeze_tokens`, `accessibility_needs`
  - `user_preferences`: `socratic_strictness` enum ('always_guide', 'hints_then_answer', 'direct_help')
  - `user_subjects`: custom subject categories per user
  - `Study` (capitalized): study sessions, `Subject`, `Topic`, `Date`, `Duration`, `session_status` ('active', 'paused', 'completed'), `time_left`
  - `study_history` & `study_session_logs`: completed session metrics, timeline events, and question logs (`concept`, `is_correct`, `question`)
  - `session_notes`, `session_flashcards`, `session_quizzes`, `session_quiz_questions`, `session_quiz_attempts`, `session_resources`: study tools with `session_id` FK (`ON DELETE SET NULL`)
  - `planner_activities`, `planner_recurrence_rules`, `planner_occurrence_overrides`, `planner_reminders`: time blocks, deadlines, recurring sessions
  - `users_streaks`, `streak_days`, `streak_slipping`: streak daily logging, freeze tokens, and slipping tracking
  - `community_profiles`, `friendships`, `study_groups`, `study_group_members`, `study_group_join_requests`, `messages`, `conversations`, `message_reports`, `forum_posts`, `forum_answers`, `forum_votes`, `forum_reports`, `peer_tutor_profiles`, `match_requests`, `activity_events`, `community_reports`
  - `subscriptions`, `plans`, `payments`: Paystack integration for Pro / Elite subscriptions
  - `in_app_notifications`, `notification_preferences`, `push_subscriptions`, `conversation_mutes`
  - `feedback`, `feedback_votes`, `feedback_replies`, `feedback_rewards`, `feedback_prompts`, `user_feedback_state`, `feedback_prompt_events`: user feedback system
- Existing Edge Functions:
  - `ai-tutor`, `ai-tutor-chat`, `paystack-webhook`, `verify-payment`, `send-notifications`, `send-push`, `send-test-notification`, `planner-reminders`
- Storage buckets:
  - `resources` (PDF, Word, images, text, CSV)
  - `avatars` (user profile avatars)
- Secrets live ONLY in Edge Function secrets or server env (`GROQ_API_KEY`, `PAYSTACK_SECRET_KEY`, `CRON_SECRET`, `VAPID_PRIVATE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Never in client code.

## Rules for everything you build
1. Deliver in this order for each item: (a) SQL migration file (new file, additive, with rollback notes in comments), (b) RLS policies for every table and operation, (c) Edge Functions / RPCs / triggers / cron, (d) typed client service functions with exact signatures, (e) a short list of frontend wiring changes (which files/components change and how), (f) test cases.
2. Never edit existing migrations. Never use destructive SQL (DROP, TRUNCATE, unscoped DELETE). Never apply anything to production. I will review and run migrations myself.
3. RLS ON for every table. Default deny. Users can only read and write their own rows unless the item says otherwise.
4. Anything involving XP, gems, streaks, scores, payments, or entitlements is decided on the SERVER. The client may only request actions, never submit results.
5. Store all timestamps as timestamptz in UTC. Store the user's timezone on their profile and compute day boundaries server-side.
6. Validate all input on the server. Return consistent errors: `{ "error": { "code": "STRING", "message": "human readable" } }`.
7. Make every write idempotent where retries are possible (unique constraints or idempotency keys). Prevent race conditions (use transactions, `FOR UPDATE`, or atomic SQL).
8. Preserve all existing frontend behavior. Give me complete files for anything you change, plus a summary of exactly what changed and what was left untouched.
9. Keep user data private by default. Many users are minors: no emails or real names in any public-facing query.
10. If a decision is marked "NEEDS FOUNDER DECISION", stop and ask me before building that part.

---

# PART 1 - EXECUTIVE SUMMARY
- Total gaps: 8 (🔴 3 critical, 🟠 3 high, 🟡 2 medium)
- Features fully backed today:
  - User Authentication, Profile Auto-Creation, and Onboarding Preferences (`auth.users`, `profiles`, `onboarding_answers`)
  - Active Study Session Lifecycle & Session Material Persistence (`Study`, `session_notes`, `session_flashcards`, `session_quizzes`, `session_resources`)
  - Study Planner Management (Time blocks, deadlines, recurring session rules, occurrence overrides, slipping sessions)
  - Community Features (Leaderboard RPC `get_leaderboard`, chat inbox, messaging, study groups, help forum, peer tutor matching, activity feed, safety reports)
  - Realtime Streak System (`useStreak`, `users_streaks`, `streak_days`, `streak_slipping`)
  - Paystack Subscription Upgrades & Cryptographic Webhook Processing (`subscriptions`, `plans`, `payments`, `paystack-webhook`, `verify-payment`)
  - Modular User Feedback Module (`feedback`, `feedback_votes`, `feedback_replies`, `feedback_rewards`, `feedback_prompts`, `user_feedback_state`, `feedback_prompt_events`)
- Features partially backed:
  - Gamification Rewards: XP and gems are stored in `profiles` and daily quests/milestones use server RPCs (`claim_completed_quests`), but study session completion rewards (`completeSession` / `awardUserRewards`) rely on client-supplied parameters instead of server authority.
  - Subscription Lifecycle: Subscription upgrade checkout is backed, but plan downgrade and cancellation handling are stubbed in the UI with hardcoded alert strings.
  - Background Notifications: Session reminders and chat notifications are backed via Edge Functions, but background nudges for streak-at-risk and no-login-all-day are missing.
- Features with no backend:
  - Exit Feedback Submission (`FeedbackDialog.jsx` writes logout feedback exclusively to browser `localStorage` under key `'hyper-tutor-feedback'`).
  - External Google Calendar Event Sync (client makes direct browser `fetch` requests to Google Calendar API with 1-hour OAuth access tokens).
  - Gems Reward Redemption Ledger & Item Catalog (Shop catalog items beyond streak freeze tokens lack server redemption transactions and ledger logging).
  - Account Data Export & Erasure Lifecycle (no backend RPC or Edge Function for user GDPR data export or account self-deletion).
  - AI Tutor Tool Call Server Transaction Engine (LLM tool executions like `create_study_plan` and `schedule_study_session` are processed purely client-side).
- Top 5 risks if nothing is built:
  1. **Rewards & Leaderboard Cheating**: Students can modify client JS or invoke `awardUserRewards` / `completeSession` with arbitrary `xp` / `gems` arguments to corrupt rankings.
  2. **Silently Lost Exit Feedback**: Exit/logout feedback submitted in `FeedbackDialog` is saved only to the user's browser `localStorage` and never transmitted to product teams.
  3. **Google Calendar Sync Failures**: Direct client calls to Google Calendar API break after 60-minute token expiration and expose third-party OAuth access tokens.
  4. **Privacy Non-Compliance**: Absence of self-service account data export and deletion endpoints creates compliance risks under privacy regulations.
  5. **Unmanaged Billing Downgrades**: Users attempting to downgrade or cancel subscriptions receive a stubbed alert banner while recurring plan state remains unmanaged on Paystack.
- Changes since last report: Re-audited all 206 source files under `src/` (up from 181 files). Confirmed that newly added components (`Shop.jsx`, `LevelRoadmap.jsx`, `NodeDetailSheet.jsx`, `FeedbackModal.jsx`, `AdminFeedbackDashboard.jsx`, `MyFeedback.jsx`) maintain clean modular architecture while confirming gap items B-01 through B-08 across current commits.

---

# PART 2 - BACKEND THAT ALREADY EXISTS (do not rebuild)
| UI feature | Table / function | Called from (file:line) | Notes |
|---|---|---|---|
| User Authentication & Profile Creation | `auth.users`, `profiles`, `006_profile_trigger.sql` | `src/components/Auth/LoginForm.jsx:20`, `Onboarding.jsx:110` | Auto-creates profile row on signup; saves preferences |
| Onboarding & Survey Persistence | `profiles`, `onboarding_answers` | `src/components/Auth/Onboarding.jsx:110` | Per-step answer persistence and goal/subject preferences |
| Active Study Sessions & Timers | `Study`, `study_history`, `study_session_logs` | `src/hooks/useStudySession.js:45`, `src/lib/sessionService.js:30` | Tracks session status ('active', 'paused', 'completed') and logs |
| Session Materials & Library | `session_notes`, `session_flashcards`, `session_quizzes`, `session_resources` | `src/components/Library/Library.jsx:190`, `NoteEditor.jsx:35` | Materials linked to sessions (`ON DELETE SET NULL` on session drop) |
| Study Planner & Recurrence | `planner_activities`, `planner_recurrence_rules`, `planner_reminders` | `src/hooks/usePlanner.js:25`, `src/lib/plannerUtils.js:10` | Time blocks, deadlines, recurrence preview, slipping session checks |
| Socratic AI Tutor Chat | `ai-tutor`, `ai-tutor-chat`, `user_preferences` | `src/lib/aiTutor.js:20`, `supabase/functions/ai-tutor-chat/index.ts:1` | Groq LLM streaming proxy with Socratic strictness enforcement |
| Leaderboards & Realtime Streaks | `users_streaks`, `streak_days`, `get_leaderboard` RPC | `src/features/community/services/leaderboardService.js:15`, `src/hooks/useStreak.js:30` | Centralized RPC rankings, 3am cutoff, freeze tokens |
| Community Chat & Inbox | `messages`, `conversations`, `conversation_mutes`, `message_reports` | `src/components/Community/ChatThread.jsx:120` | Realtime subscriptions, message reporting, conversation muting |
| Study Groups & Join Requests | `study_groups`, `study_group_members`, `study_group_join_requests` | `src/features/community/services/groupsService.js:20` | Full group management, join approvals, session RSVPs |
| Community Feedback System | `feedback`, `feedback_votes`, `feedback_replies`, `feedback_rewards`, `feedback_prompts` | `src/lib/feedback.js:255`, `FeedbackModal.jsx:11` | Supabase feedback submissions, upvoting, admin dashboard, replies |
| Paystack Payments | `subscriptions`, `plans`, `payments`, `paystack-webhook` | `supabase/functions/verify-payment/index.ts:10` | Cryptographic webhook validation and subscription upgrades |

---

# PART 3 - GAP ITEMS

## ITEM B-01: Server-Authoritative Gamification Rewards & XP System

**Priority:** 🔴 Critical
**Status:** Client-only / Vulnerable
**Confidence:** ✅ Confirmed
**Size:** M (1 to 3 days)
**Depends on:** none

### 1. What the user sees (and why it's broken)
When a study session or quiz is completed, the frontend calculates XP and gems (`xp = 50, gems = 5`) and sends them directly in client calls to `completeSession` or `awardUserRewards`. A student can open browser dev tools and issue arbitrary RPC calls to set their XP or gems to any value.

### 2. Evidence
- `src/lib/sessionService.js:149-164`: `completeSession` receives `xp = 50, gems = 5` as client parameters and invokes `award_user_rewards`.
- `src/lib/gamification.js:37-75`: `awardUserRewards` accepts client-controlled `{ xp, gems }` and updates `profiles.xp_points` and `profiles.gems` directly if RPC fails.

### 3. Required backend
- Atomic RPC `complete_study_session_v2(session_id bigint)` that calculates XP and gems server-side based on actual verified duration and questions answered.
- Deprecation/removal of client-controlled `award_user_rewards` RPC parameters.

### 4. Proposed data model
```sql
-- Migration: Add server-authoritative rewards calculation RPC
-- Existing profiles table columns used: xp_points (int), gems (int)

CREATE OR REPLACE FUNCTION public.complete_study_session_v2(
  p_session_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_duration_min INT;
  v_xp_earned INT;
  v_gems_earned INT;
  v_new_xp INT;
  v_new_gems INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT user_id, COALESCE(duration, 1) INTO v_user_id, v_duration_min
  FROM public."Study"
  WHERE id = p_session_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or unauthorized';
  END IF;

  -- Server-enforced rewards formula: 10 XP per 15 minutes (min 10, max 200), 2 gems per session
  v_xp_earned := LEAST(200, GREATEST(10, (v_duration_min / 15) * 10));
  v_gems_earned := 2;

  UPDATE public.profiles
  SET
    xp_points = COALESCE(xp_points, 0) + v_xp_earned,
    gems = COALESCE(gems, 0) + v_gems_earned,
    last_active_at = NOW()
  WHERE id = v_user_id
  RETURNING xp_points, gems INTO v_new_xp, v_new_gems;

  UPDATE public."Study"
  SET session_status = 'completed'
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'xp_earned', v_xp_earned,
    'gems_earned', v_gems_earned,
    'total_xp', v_new_xp,
    'total_gems', v_new_gems
  );
END;
$$;
```

### 5. RLS policy matrix
| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | Authenticated | System Trigger | Via RPC `complete_study_session_v2` | No |

### 6. Server logic and API contract
- Function: `supabase.rpc('complete_study_session_v2', { p_session_id: number })`
- Method: RPC (Authenticated)
- Request: `{ "p_session_id": 123 }`
- Response: `{ "xp_earned": 30, "gems_earned": 2, "total_xp": 450, "total_gems": 24 }`
- Error cases: `401 Unauthorized`, `404 Session not found`

### 7. Frontend wiring
- Update `src/lib/sessionService.js` to call `complete_study_session_v2` with `p_session_id`. Remove client-side `xp` and `gems` payload arguments.
- Refactor `src/lib/gamification.js` to eliminate direct client-driven `profiles` table update fallbacks.

### 8. Edge cases and failure modes
- Duplicate session completion calls: Function checks if session is already completed and returns zero additional rewards on repeat calls.

### 9. Acceptance criteria
1. Completing a session calculates XP based strictly on duration recorded in database.
2. Direct client SQL updates to `profiles.xp_points` or `profiles.gems` are blocked by RLS.
3. Attempting to complete another user's session throws permission error.

### 10. Migration and backfill notes
Additive migration. Existing profile totals remain intact.

### 11. Ready-to-paste build request
Build item B-01: Server-Authoritative Gamification Rewards & XP System. Follow the spec below exactly. Deliver the migration SQL, RLS policies, RPC function, client service wiring in `sessionService.js` and `gamification.js`, and tests.

---

## ITEM B-02: Exit Feedback Dialog Persistence & Server Collection

**Priority:** 🔴 Critical
**Status:** Stub / Client-only
**Confidence:** ✅ Confirmed
**Size:** S (under 1 day)
**Depends on:** none

### 1. What the user sees (and why it's broken)
When users click "Give us feedback" in the sidebar or submit exit feedback in `FeedbackDialog.jsx`, the feedback payload is written strictly to local browser `localStorage` under key `'hyper-tutor-feedback'`. Product owners never receive or see the exit feedback.

### 2. Evidence
- `src/components/common/FeedbackDialog.jsx:11-34`: `submitFeedback` parses `localStorage`, prepends feedback object, and writes back to `localStorage`. No network call exists.

### 3. Required backend
- Table `user_feedback` or reuse existing `feedback` table with `category: 'exit_feedback'`.
- Direct insert via Supabase client with authenticated user ID.

### 4. Proposed data model
```sql
-- Migration: Add user_feedback / exit feedback table or integration
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  message TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback"
  ON public.user_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins read user feedback"
  ON public.user_feedback FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));
```

### 5. RLS policy matrix
| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `user_feedback` | Admins only | Authenticated users | None | None |

### 6. Server logic and API contract
- Direct insert via Supabase client: `supabase.from('user_feedback').insert({ reason, message, user_id })`
- Response: `{ status: 201 }`

### 7. Frontend wiring
- File: `src/components/common/FeedbackDialog.jsx:11`
- Replace `localStorage.setItem` with `await supabase.from("user_feedback").insert(...)` or integrate with `submitFeedbackItem` in `src/lib/feedback.js`.

### 8. Edge cases and failure modes
- Unauthenticated users submitting feedback: `user_id` set to `NULL` or current session user ID.
- Network offline: Show friendly error toast and retain fallback in local storage until online.

### 9. Acceptance criteria
1. Submitting feedback inserts a row into `public.user_feedback`.
2. Users cannot view or delete other users' feedback submissions.
3. `localStorage` key `'hyper-tutor-feedback'` is cleared after successful server submission.

### 10. Migration and backfill notes
New additive table migration.

### 11. Ready-to-paste build request
Build item B-02: Exit Feedback Dialog Persistence & Server Collection. Deliver the migration SQL, RLS policies, updated `FeedbackDialog.jsx` submit logic, and unit tests.

---

## ITEM B-03: Edge Function Proxy for Google Calendar Sync

**Priority:** 🔴 Critical
**Status:** Client-only / Security Risk
**Confidence:** ✅ Confirmed
**Size:** M (1 to 3 days)
**Depends on:** none

### 1. What the user sees (and why it's broken)
When users click "Sync Google Calendar" in `ExternalCalendarSync.jsx`, the browser makes direct cross-origin calls to `https://www.googleapis.com/calendar/v3/` using `session.provider_token`. Google OAuth access tokens expire after 60 minutes, causing sync attempts to silently fail with 401 errors.

### 2. Evidence
- `src/components/Planner/ExternalCalendarSync.jsx:38-55`
- `src/lib/googleCalendarSync.js:60-90`: `fetch("https://www.googleapis.com/calendar/v3/...")` executed directly in browser.

### 3. Required backend
- Edge Function `google-calendar-sync` handling OAuth token refresh via Supabase Auth admin API or Google token endpoint and pushing events to Google Calendar.

### 4. Proposed data model
```sql
CREATE TABLE IF NOT EXISTS public.google_calendar_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id BIGINT REFERENCES public."Study"(id) ON DELETE CASCADE,
  google_event_id TEXT NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_session_sync UNIQUE (user_id, session_id)
);

ALTER TABLE public.google_calendar_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sync logs"
  ON public.google_calendar_sync_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

### 5. RLS policy matrix
| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `google_calendar_sync_logs` | Authenticated | Service Role | None | Authenticated |

### 6. Server logic and API contract
- Endpoint: `POST /functions/v1/google-calendar-sync`
- Headers: `Authorization: Bearer <user_jwt>`
- Request JSON: `{ "session_ids": [12, 15] }`
- Response JSON: `{ "synced_count": 2, "events": [{ "session_id": 12, "google_event_id": "abc" }] }`
- Error codes: `401 Unauthorized`, `400 Invalid Sessions`, `502 Google API Error`

### 7. Frontend wiring
- File: `src/lib/googleCalendarSync.js`
- Replace direct `fetch("https://www.googleapis.com/...")` with `supabase.functions.invoke("google-calendar-sync", { body: { session_ids } })`.

### 8. Edge cases and failure modes
- Revoked Google permissions: Edge function returns clean error prompting re-authentication.

### 9. Acceptance criteria
1. Calendar events are created via Edge Function using valid refreshed tokens.
2. Client bundle contains zero direct calls to `www.googleapis.com`.

### 10. Migration and backfill notes
Additive migration and new Edge Function deployment.

### 11. Ready-to-paste build request
Build item B-03: Edge Function Proxy for Google Calendar Sync. Deliver the migration SQL, Edge Function code, `googleCalendarSync.js` update, and tests.

---

## ITEM B-04: Subscription Downgrade & Cancellation Handling

**Priority:** 🟠 High
**Status:** Stub / Partial
**Confidence:** ✅ Confirmed
**Size:** M (1 to 3 days)
**Depends on:** none

### 1. What the user sees (and why it's broken)
In `Billing.jsx`, users can purchase subscriptions via Paystack. However, when a user attempts to cancel or downgrade their subscription, the client only updates local state or displays a toast message without recording subscription period cancellation on Supabase or notifying Paystack. Access control checks in the app do not handle `cancel_at_period_end` or subscription grace periods.

### 2. Evidence
- `src/components/Settings/Billing.jsx:142`: `handleCancelSubscription` updates local state with `setSubscriptionCancelled(true)` and shows a toast message, but executes no Supabase or Edge Function backend request.
- `supabase/functions/paystack-webhook/index.ts:85`: Webhook handler processes successful payments but lacks logic for handling `subscription.disable` or recording cancellation grace periods in the `subscriptions` table.

### 3. Required backend
- Column addition `cancel_at_period_end boolean DEFAULT false` and `canceled_at timestamptz` on `subscriptions` table.
- RPC function `cancel_user_subscription(p_user_id uuid)` to mark pending cancellation at period end.
- Paystack webhook event handler for `subscription.disable` and `charge.dispute.create`.

### 4. Proposed data model
```sql
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS canceled_at timestamptz;
```

### 5. RLS policy matrix
| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| subscriptions | User own (`auth.uid() = user_id`) | Service role / System | Service role / System | Service role / System |

### 6. Server logic and API contract
- **RPC / Function**: `cancel_user_subscription()`
  - **Auth Required**: Yes (`auth.uid()`)
  - **Request**: `{}`
  - **Response**: `{ "success": true, "cancel_at": "2026-11-30T00:00:00Z" }`
  - **Error Cases**: `NO_ACTIVE_SUBSCRIPTION` (404), `UNAUTHORIZED` (401)

### 7. Frontend wiring
- `src/components/Settings/Billing.jsx`: Wire `handleCancelSubscription` to invoke `supabase.rpc('cancel_user_subscription')`.
- `src/lib/billing.js`: Update `isSubscriptionActive` helper to check `cancel_at_period_end` alongside `current_period_end > now`.

### 8. Edge cases and failure modes
- Webhook replay for disabled subscriptions: Idempotent updates checking `canceled_at` timestamp.
- User re-subscribes before period ends: Clear `cancel_at_period_end` flag upon successful payment webhook.

### 9. Acceptance criteria
1. Calling `cancel_user_subscription` sets `cancel_at_period_end = true` on the user's active subscription row.
2. Unauthenticated users or users attempting to cancel another user's subscription are rejected with 401/403.
3. Users retain Pro/Elite access until `current_period_end` timestamp expires.

### 10. Migration and backfill notes
- Existing active subscription rows are initialized with `cancel_at_period_end = false`.

### 11. Ready-to-paste build request
Build item B-04: Subscription Downgrade & Cancellation Handling. Follow the spec above exactly. Deliver the migration SQL, RLS policies, Edge Function / RPC code, typed client service, frontend wiring changes, and tests.

## ITEM B-05: Account Data Export & Erasure Lifecycle (GDPR)

**Priority:** 🟡 Medium
**Status:** Missing
**Confidence:** ✅ Confirmed
**Size:** M (1 to 3 days)
**Depends on:** none

### 1. What the user sees (and why it's broken)
In `Settings.jsx`, buttons exist for "Export My Data" and "Delete Account". Clicking "Export My Data" triggers a client-side mock JSON download containing minimal hardcoded profile fields. Clicking "Delete Account" opens a confirmation modal that calls `supabase.auth.signOut()` without deleting the user's data from `profiles`, `Study`, `session_notes`, `messages`, or `payments`, leaving orphaned data in the database and violating GDPR data erasure requirements.

### 2. Evidence
- `src/components/Settings/Settings.jsx:210`: `handleExportData` constructs a fake JSON blob in memory with hardcoded string keys and triggers a browser download without fetching full account data.
- `src/components/Settings/Settings.jsx:245`: `handleDeleteAccount` calls `supabase.auth.signOut()` without executing database row deletion or invoking an admin account deletion Edge Function.

### 3. Required backend
- Postgres RPC / Edge Function `export_user_account_data(p_user_id uuid)` aggregating all rows across `profiles`, `Study`, `planner_activities`, `session_notes`, `forum_posts`, and `messages`.
- Postgres RPC / Edge Function `delete_user_account_data(p_user_id uuid)` executing cascaded deletion of user rows and invoking `supabase.auth.admin.deleteUser()`.
- Table `data_erasure_requests` to log erasure audit trails.

### 4. Proposed data model
```sql
CREATE TABLE IF NOT EXISTS public.data_erasure_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    requested_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz
);

ALTER TABLE public.data_erasure_requests ENABLE ROW LEVEL SECURITY;
```

### 5. RLS policy matrix
| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| data_erasure_requests | User own (`auth.uid() = user_id`) | User own (`auth.uid() = user_id`) | Service role | Service role |

### 6. Server logic and API contract
- **Edge Function**: `account-lifecycle`
  - **Action `export`**: Gathers user rows from all platform tables and returns encrypted JSON download stream.
  - **Action `delete`**: Deletes all user storage files (avatars, resources), wipes user rows across all Postgres tables, and revokes Supabase Auth identity.

### 7. Frontend wiring
- `src/components/Settings/Settings.jsx`: Wire `handleExportData` to invoke `account-lifecycle` with action `export`. Wire `handleDeleteAccount` to invoke `account-lifecycle` with action `delete`.

### 8. Edge cases and failure modes
- Deleting user with active paid subscription: Revoke Paystack subscription before deleting identity.
- Orphaned community messages: Replace author identity on public forum posts with `[Deleted User]` before removing profile.

### 9. Acceptance criteria
1. Exporting data produces a complete, structured JSON file containing all user study history, notes, and activity logs.
2. Deleting an account completely removes all private user rows and revokes the user's Supabase Auth user record.
3. Re-logging in after account deletion fails with invalid credentials.

### 10. Migration and backfill notes
- No backfill required for new `data_erasure_requests` table.

### 11. Ready-to-paste build request
Build item B-05: Account Data Export & Erasure Lifecycle (GDPR). Follow the spec above exactly. Deliver the migration SQL, RLS policies, Edge Function code, typed client service, frontend wiring changes, and tests.

## ITEM B-06: Gems Store Ledger & Reward Redemption System

**Priority:** 🟡 Medium
**Status:** Stub / Partial
**Confidence:** ✅ Confirmed
**Size:** M (1 to 3 days)
**Depends on:** B-01

### 1. What the user sees (and why it's broken)
In `Shop.jsx`, users can view avatar frames, themes, and streak freeze tokens available for purchase using earned gems. However, clicking "Buy" only decrements the local React state gems counter or calls a non-authoritative client function that directly writes to `profiles.gems`, allowing users to grant themselves items without server verification, balance validation, or purchase ledger recording.

### 2. Evidence
- `src/components/Shop/Shop.jsx:88`: `handlePurchase` checks `userGems >= item.price` in React state and calls `updateProfile({ gems: newBalance })` directly from client JS.
- `src/features/gamification/services/gamificationService.js:102`: Lacks an atomic Postgres RPC for store purchases with row locking (`FOR UPDATE`).

### 3. Required backend
- Table `store_items` defining purchasable items, gem prices, and metadata.
- Table `user_inventory` tracking items owned by users.
- Table `gem_ledger` recording all gem debits and credits.
- Postgres SECURITY DEFINER RPC `purchase_store_item(p_item_id uuid)` to atomically deduct gems and unlock inventory items.

### 4. Proposed data model
```sql
CREATE TABLE IF NOT EXISTS public.store_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    item_key text UNIQUE NOT NULL,
    name text NOT NULL,
    gem_price integer NOT NULL CHECK (gem_price >= 0),
    category text NOT NULL, -- 'freeze_token', 'avatar_frame', 'theme'
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_inventory (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    item_id uuid REFERENCES public.store_items(id) ON DELETE CASCADE NOT NULL,
    purchased_at timestamptz DEFAULT now(),
    UNIQUE(user_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.gem_ledger (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount integer NOT NULL, -- negative for purchases, positive for rewards
    reason text NOT NULL,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gem_ledger ENABLE ROW LEVEL SECURITY;
```

### 5. RLS policy matrix
| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| store_items | Public read (`true`) | Service role | Service role | Service role |
| user_inventory | User own (`auth.uid() = user_id`) | Service role / RPC | Service role / RPC | Service role / RPC |
| gem_ledger | User own (`auth.uid() = user_id`) | Service role / RPC | System deny | System deny |

### 6. Server logic and API contract
- **RPC**: `purchase_store_item(p_item_id uuid)`
  - **Auth Required**: Yes (`auth.uid()`)
  - **Logic**: Selects user gems `FOR UPDATE`. If `gems >= item.gem_price`, deducts gems, inserts row into `user_inventory`, records debit in `gem_ledger`, and if `category == 'freeze_token'`, increments `profiles.freeze_tokens`.
  - **Response**: `{ "success": true, "remaining_gems": 150, "inventory_id": "..." }`
  - **Error Cases**: `INSUFFICIENT_GEMS` (400), `ALREADY_OWNED` (400), `ITEM_NOT_FOUND` (404)

### 7. Frontend wiring
- `src/components/Shop/Shop.jsx`: Replace client `updateProfile` call with `gamificationService.purchaseItem(itemId)`, which invokes `supabase.rpc('purchase_store_item', { p_item_id: itemId })`.

### 8. Edge cases and failure modes
- Concurrent purchase clicks: Handled atomically in Postgres via `FOR UPDATE` lock on `profiles`.
- Re-purchasing non-consumable items (avatar frames, themes): Guarded by `UNIQUE(user_id, item_id)` constraint on `user_inventory`.

### 9. Acceptance criteria
1. Attempting to purchase an item with insufficient gems returns `INSUFFICIENT_GEMS` error without modifying profile balance.
2. Successful purchase atomically deducts gems, grants the inventory item, and logs the transaction in `gem_ledger`.
3. Purchasing a streak freeze token increments `profiles.freeze_tokens`.

### 10. Migration and backfill notes
- Seed `store_items` with initial catalog items: Streak Freeze (200 gems), Golden Avatar Frame (500 gems), Cyberpunk Theme (800 gems).

### 11. Ready-to-paste build request
Build item B-06: Gems Store Ledger & Reward Redemption System. Follow the spec above exactly. Deliver the migration SQL, RLS policies, RPC functions, seed data, typed client service, frontend wiring changes, and tests.

## ITEM B-07: Background Notification Nudges (Streak-at-Risk & No-Login)

**Priority:** 🟠 High
**Status:** Missing
**Confidence:** ✅ Confirmed
**Size:** M (1 to 3 days)
**Depends on:** none

### 1. What the user sees (and why it's broken)
The application promises automated engagement push notifications (such as "Streak at risk! Study before 3am cutoff" or "No study activity today"). However, while client-side in-app notifications and scheduled study session timers exist in `useNotifications.js` and `planner-reminders`, there is no scheduled background job or cron trigger to evaluate user inactivity and dispatch background Web Push notifications for inactive users.

### 2. Evidence
- `src/lib/notifications.js:112`: Client functions handle browser local timers while active, but no server-side cron triggers automated push nudges when the user app is closed.
- `supabase/functions/send-push/index.ts`: Edge Function exists to send Web Push messages via VAPID keys, but is only called by active client sessions.

### 3. Required backend
- Scheduled Cron Edge Function `background-nudges` triggered hourly via Supabase Cron / pg_cron.
- SQL query identifying users whose `last_active_at` or last completed session exceeds 20 hours and whose local timezone time is between 18:00 and 21:00.
- Table `nudge_logs` to throttle and record dispatched background notifications (preventing duplicate nudges within 24 hours).

### 4. Proposed data model
```sql
CREATE TABLE IF NOT EXISTS public.nudge_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    nudge_type text NOT NULL, -- 'streak_at_risk', 'no_login_daily'
    sent_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nudge_logs_user_type_sent
ON public.nudge_logs(user_id, nudge_type, sent_at DESC);

ALTER TABLE public.nudge_logs ENABLE ROW LEVEL SECURITY;
```

### 5. RLS policy matrix
| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| nudge_logs | User own (`auth.uid() = user_id`) | Service role / Cron | Service role | System deny |

### 6. Server logic and API contract
- **Cron Edge Function**: `background-nudges`
  - **Trigger**: Hourly cron with `Authorization: Bearer CRON_SECRET`
  - **Logic**:
    1. Query `profiles` joined with `users_streaks` where `today_completed = false` and `current_streak > 0`.
    2. Check if user has no `streak_at_risk` row in `nudge_logs` for today's date.
    3. Invoke `send-push` Edge Function with Web Push payload `{ title: "Streak at Risk! ⚡", body: "Complete a 15-min session before 3 AM to keep your streak!" }`.
    4. Log sent nudge in `nudge_logs`.

### 7. Frontend wiring
- `src/hooks/useNotifications.js`: Ensure Web Push subscription registration (`subscribeUserToPush`) stores valid VAPID endpoint and keys in `push_subscriptions` table. No UI visual changes required.

### 8. Edge cases and failure modes
- User has disabled push notifications in `notification_preferences`: Query excludes users with `push_enabled = false` or `streak_reminders = false`.
- Invalid/expired push subscription endpoint: `send-push` catches 410 Gone response and deletes stale row from `push_subscriptions`.

### 9. Acceptance criteria
1. Background cron executes hourly and correctly identifies users with uncompleted daily study goals whose streak is active.
2. Web Push payloads are dispatched strictly to users who opted in and have not already received a nudge today.
3. Stale push subscriptions returning HTTP 410 are automatically cleaned up.

### 10. Migration and backfill notes
- Register cron job trigger in Supabase `config.toml` or via `pg_cron` extension.

### 11. Ready-to-paste build request
Build item B-07: Background Notification Nudges (Streak-at-Risk & No-Login). Follow the spec above exactly. Deliver the migration SQL, RLS policies, Cron Edge Function code, typed client service, frontend wiring changes, and tests.

## ITEM B-08: AI Tutor Tool Call Server Transaction Engine

**Priority:** 🔴 Critical
**Status:** Stub / Partial
**Confidence:** ✅ Confirmed
**Size:** L (3+ days)
**Depends on:** B-01

### 1. What the user sees (and why it's broken)
When conversing with Lumo (AI Tutor), the AI can invoke tool calls such as `create_study_plan`, `schedule_study_session`, `generate_quiz`, or `create_flashcards`. In `AITutorChat.jsx` and `aiActionRegistry.js`, the frontend intercepts these tool call responses and directly attempts to execute client-side database inserts. If the client disconnects, refreshes, or encounters an error during tool execution, database state becomes corrupted or out of sync with conversation history.

### 2. Evidence
- `src/lib/aiActionRegistry.js:45`: Tool call executions (e.g. creating flashcards or scheduling sessions) are invoked directly on the browser client JS after parsing LLM JSON responses.
- `supabase/functions/ai-tutor/tools.ts`: Defines tool schemas and prompts, but delegates actual database mutations back to the client application rather than executing them inside atomic Postgres transactions on the server.

### 3. Required backend
- Server-side tool execution engine inside `ai-tutor` and `ai-tutor-chat` Edge Functions.
- Table `ai_tool_executions` logging tool invocation payloads, execution status, and generated entity IDs.
- Atomic Postgres transaction RPC `execute_ai_tool_action(p_tool_name text, p_payload jsonb)` executing mutations using service role authority with user scoping.

### 4. Proposed data model
```sql
CREATE TABLE IF NOT EXISTS public.ai_tool_executions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    session_id uuid,
    tool_name text NOT NULL,
    payload jsonb NOT NULL,
    result jsonb,
    status text NOT NULL DEFAULT 'completed', -- 'completed', 'failed'
    error_message text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ai_tool_executions ENABLE ROW LEVEL SECURITY;
```

### 5. RLS policy matrix
| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| ai_tool_executions | User own (`auth.uid() = user_id`) | Service role / RPC | Service role | System deny |

### 6. Server logic and API contract
- **Edge Function / RPC**: `execute_ai_tool_action`
  - **Auth Required**: Yes (`auth.uid()`)
  - **Tool `schedule_study_session`**: Inserts row into `planner_activities` and creates recurring rule if specified.
  - **Tool `generate_quiz`**: Inserts rows into `session_quizzes` and `session_quiz_questions` atomically.
  - **Tool `create_flashcards`**: Inserts flashcard stack into `session_flashcards`.
  - **Response**: `{ "success": true, "tool_name": "generate_quiz", "entity_id": "..." }`

### 7. Frontend wiring
- `src/components/Study/studyEnviron/AITutorChat.jsx`: Simplify client chat handler to render tool execution confirmation badges returned directly in the Edge Function response stream, removing direct client DB mutation code from `aiActionRegistry.js`.

### 8. Edge cases and failure modes
- LLM outputs malformed tool parameters: Validated server-side using Zod schemas before database execution; returns friendly error message back to AI stream.
- Concurrent tool execution requests: Serialized within Postgres RPC transactions.

### 9. Acceptance criteria
1. AI tool calls (`create_study_plan`, `schedule_study_session`, `generate_quiz`, `create_flashcards`) are validated and executed completely on the server.
2. All generated entities (planner activities, quizzes, flashcards) persist reliably even if the user closes the browser tab immediately after the AI responds.
3. Failed tool executions log errors in `ai_tool_executions` and return structured failure messages to the LLM conversation stream.

### 10. Migration and backfill notes
- No data backfill needed; tool execution tracking table logs all new invocations.

### 11. Ready-to-paste build request
Build item B-08: AI Tutor Tool Call Server Transaction Engine. Follow the spec above exactly. Deliver the migration SQL, RLS policies, Edge Function tool execution engine, typed client service, frontend wiring changes, and tests.


# PART 4 - BUILD ORDER
1. **B-01 (Server-Authoritative Rewards & XP System)**: Foundation for gamification integrity.
2. **B-02 (Exit Feedback Dialog Persistence)**: Quick win to capture lost exit feedback.
3. **B-03 (Edge Function Proxy for Google Calendar Sync)**: Solves client API failures and auth token expiry.
4. **B-04 (Subscription Downgrade & Cancellation)**: Completes Paystack billing lifecycle.
5. **B-05 (Account Export & Erasure Lifecycle)**: Ensures GDPR compliance.
6. **B-06 (Gems Store Ledger & Reward Redemption)**: Connects with B-01 for gem utility and Shop ledger.
7. **B-07 (Background Notification Nudges)**: Enhances retention via cron nudges.
8. **B-08 (AI Tutor Tool Call Transaction Engine)**: Improves AI tool persistence reliability.

*Parallel builds permitted:* B-02, B-03, and B-05 can be built in parallel.

---

# PART 5 - CROSS-CUTTING BACKEND NEEDS
| Need | Status | Evidence |
|---|---|---|
| Auth (Sign-up, Sign-in, OAuth, Sessions) | ✅ Exists | `src/components/Auth/LoginForm.jsx`, `src/lib/supabase.js` |
| RLS Coverage | ✅ Exists | Enforced across all 30+ tables in `supabase/migrations/` |
| Profile Auto-Creation Trigger | ✅ Exists | `supabase/006_profile_trigger.sql` |
| Rate Limiting on AI Endpoints | ⚠️ Partial | Implemented in `ai-tutor-chat` via JWT check; needs IP fallback |
| Input Validation on Server | ✅ Exists | Zod schemas in `src/lib/plannerSchema.js` and Edge Functions |
| Secrets Handling | ✅ Exists | API keys isolated in Edge Function environment variables |
| Realtime Channels | ✅ Exists | Used in `ChatThread.jsx`, `SessionRoom.jsx`, `useInAppNotifications.js` |
| Timezone Handling | ✅ Exists | UTC timestamptz stored; local conversion via `Intl` |

---

# PART 6 - FOUNDER DECISIONS NEEDED
1. **B-06 Gems Store Catalog**:
   - Option A: Redeem gems for digital study perks (Streak Freezes, Custom Avatar Frames, Theme Accents).
   - Option B: Redeem gems for unlockable premium AI credits.
   - *Recommendation:* Option A (keeps free/paid distinction clear).

2. **B-04 Subscription Downgrade Business Rule**:
   - Option A: Immediate downgrade with prorated gem refund.
   - Option B: End-of-period downgrade (user maintains Pro access until billing cycle ends).
   - *Recommendation:* Option B (standard industry practice).

---

# PART 7 - BACKEND WITHOUT FRONTEND (reverse check)
- `planner_occurrence_overrides`: Table exists in migration `034_planner_upgrade.sql` but currently has minimal client read/write usage in `usePlanner.js`.
- `streak_slipping`: Table exists in migration `019_streak_slipping_tracking.sql` and `useSlippingSessions.js` queries slipping sessions, but manual user resolution triggers rely on automated streak updates.

---

# APPENDIX A - COVERAGE LEDGER
| File Path | Reviewed | Finding IDs |
|---|---|---|
| `src/App.jsx` | Yes | - |
| `src/app/AITutorContext.jsx` | Yes | - |
| `src/app/Layout.jsx` | Yes | - |
| `src/app/ProfileContext.jsx` | Yes | - |
| `src/components/Auth/AuthConfirm.jsx` | Yes | - |
| `src/components/Auth/AuthConfirmed.jsx` | Yes | - |
| `src/components/Auth/AuthLayout.jsx` | Yes | - |
| `src/components/Auth/LoginForm.jsx` | Yes | - |
| `src/components/Auth/Onboarding.jsx` | Yes | - |
| `src/components/Auth/SignupForm.jsx` | Yes | - |
| `src/components/Auth/callback/page.jsx` | Yes | - |
| `src/components/Community/AchievementsPage.jsx` | Yes | - |
| `src/components/Community/AskQuestionModal.jsx` | Yes | - |
| `src/components/Community/ChatInbox.jsx` | Yes | - |
| `src/components/Community/ChatThread.jsx` | Yes | - |
| `src/components/Community/ChooseUsernameCard.jsx` | Yes | - |
| `src/components/Community/ForumPostDetail.jsx` | Yes | - |
| `src/components/Community/FriendPicker.jsx` | Yes | - |
| `src/components/Community/GroupStudySessions.jsx` | Yes | - |
| `src/components/Community/HelpForum.jsx` | Yes | - |
| `src/components/Community/PeerTutors.jsx` | Yes | - |
| `src/components/Community/RequestJoinModal.jsx` | Yes | - |
| `src/components/Community/ResourceCard.jsx` | Yes | - |
| `src/components/Community/ResourcePicker.jsx` | Yes | - |
| `src/components/Community/SessionRoom.jsx` | Yes | - |
| `src/components/Community/StudyRoomsLobby.jsx` | Yes | - |
| `src/components/Community/UserProfilePage.jsx` | Yes | - |
| `src/components/Community/VirtualStudyRoom.jsx` | Yes | - |
| `src/components/Community/community.jsx` | Yes | - |
| `src/components/Dashboard/AISuggestions.jsx` | Yes | - |
| `src/components/Dashboard/AchievementsCard.jsx` | Yes | - |
| `src/components/Dashboard/AnalyticsDashboard.jsx` | Yes | - |
| `src/components/Dashboard/CommunitySpotlight.jsx` | Yes | - |
| `src/components/Dashboard/DashboardHeader.jsx` | Yes | B-06 |
| `src/components/Dashboard/DashboardStatsBar.jsx` | Yes | - |
| `src/components/Dashboard/KeepsSlipping.jsx` | Yes | - |
| `src/components/Dashboard/Leaderboard.jsx` | Yes | - |
| `src/components/Dashboard/Overview.jsx` | Yes | - |
| `src/components/Dashboard/QuickActions.jsx` | Yes | - |
| `src/components/Dashboard/QuickShortcuts.jsx` | Yes | - |
| `src/components/Dashboard/RecentActivity.jsx` | Yes | - |
| `src/components/Dashboard/StudyStats.jsx` | Yes | - |
| `src/components/Dashboard/StudyStreak.jsx` | Yes | - |
| `src/components/Dashboard/UpcomingSession.jsx` | Yes | - |
| `src/components/Dashboard/WeakAreaCard.jsx` | Yes | - |
| `src/components/FAQ/FAQ.jsx` | Yes | - |
| `src/components/Feedback/AdminFeedbackDashboard.jsx` | Yes | - |
| `src/components/Feedback/FeedbackModal.jsx` | Yes | - |
| `src/components/Feedback/InlineTutorFeedback.jsx` | Yes | - |
| `src/components/Feedback/MyFeedback.jsx` | Yes | - |
| `src/components/Feedback/PromptBanner.jsx` | Yes | - |
| `src/components/Feedback/RoadmapBoard.jsx` | Yes | - |
| `src/components/InstallPrompt.tsx` | Yes | - |
| `src/components/Layout/Sidebar.jsx` | Yes | - |
| `src/components/Library/Library.jsx` | Yes | - |
| `src/components/Notifications/NotificationCenter.jsx` | Yes | - |
| `src/components/Notifications/NotificationPromptCard.jsx` | Yes | - |
| `src/components/Notifications/NotificationsPage.jsx` | Yes | - |
| `src/components/Planner/Calendar.jsx` | Yes | - |
| `src/components/Planner/DeadlineManager.jsx` | Yes | - |
| `src/components/Planner/ExternalCalendarSync.jsx` | Yes | B-03 |
| `src/components/Planner/Planner.jsx` | Yes | - |
| `src/components/Planner/PlannerActivityModal.jsx` | Yes | - |
| `src/components/Planner/PlannerStatsBar.jsx` | Yes | - |
| `src/components/Planner/RecurringSetup.jsx` | Yes | - |
| `src/components/Planner/SessionScheduler.jsx` | Yes | - |
| `src/components/Planner/TimeBlocking.jsx` | Yes | - |
| `src/components/Progress/Progress.jsx` | Yes | - |
| `src/components/Progress/StudyTrendChart.jsx` | Yes | - |
| `src/components/Progress/studyTrendUtils.js` | Yes | - |
| `src/components/Settings/Billing.jsx` | Yes | B-04 |
| `src/components/Settings/NotificationSettings.jsx` | Yes | - |
| `src/components/Settings/PaystackCheckoutButton.jsx` | Yes | - |
| `src/components/Settings/Settings.jsx` | Yes | B-05 |
| `src/components/Settings/SocraticStrictness.jsx` | Yes | - |
| `src/components/Shop/Shop.jsx` | Yes | B-06 |
| `src/components/Study/NoteDetail.jsx` | Yes | - |
| `src/components/Study/StudyHistoryDetail.jsx` | Yes | - |
| `src/components/Study/StudyHome.jsx` | Yes | - |
| `src/components/Study/StudyPage.jsx` | Yes | - |
| `src/components/Study/input.jsx` | Yes | - |
| `src/components/Study/studyEnviron/AITutorChat.jsx` | Yes | - |
| `src/components/Study/studyEnviron/Flashcards.jsx` | Yes | - |
| `src/components/Study/studyEnviron/NoteEditor.jsx` | Yes | - |
| `src/components/Study/studyEnviron/PlaceholderPage.jsx` | Yes | - |
| `src/components/Study/studyEnviron/PomodoroTimer.jsx` | Yes | - |
| `src/components/Study/studyEnviron/PracticeQuestions.jsx` | Yes | - |
| `src/components/Study/studyEnviron/ResourceAttachments.jsx` | Yes | - |
| `src/components/Study/studyEnviron/SessionControls.jsx` | Yes | - |
| `src/components/Study/studyEnviron/StudyCompanion.jsx` | Yes | - |
| `src/components/Study/studyEnviron/StudyEnvironment.jsx` | Yes | - |
| `src/components/Study/studyEnviron/StudySession.jsx` | Yes | - |
| `src/components/Study/studyEnviron/TypewriterText.jsx` | Yes | - |
| `src/components/common/AchievementIcon.jsx` | Yes | - |
| `src/components/common/Avatar.jsx` | Yes | - |
| `src/components/common/BottomNavBar.jsx` | Yes | - |
| `src/components/common/CollapsibleSection.jsx` | Yes | - |
| `src/components/common/ErrorBoundary.jsx` | Yes | - |
| `src/components/common/FeedbackDialog.jsx` | Yes | B-02 |
| `src/components/common/GlobalAITutorFab.jsx` | Yes | - |
| `src/components/common/LoadingCompanion.jsx` | Yes | - |
| `src/components/common/LumoAvatar.jsx` | Yes | - |
| `src/components/common/NotFound.jsx` | Yes | - |
| `src/components/common/PageContainer.jsx` | Yes | - |
| `src/components/common/ResourcePreviewModal.jsx` | Yes | - |
| `src/components/common/ResponsiveSheet.jsx` | Yes | - |
| `src/components/common/ScrollToTop.jsx` | Yes | - |
| `src/components/common/SplashScreen.jsx` | Yes | - |
| `src/components/common/TargetCursor.jsx` | Yes | - |
| `src/constants/zIndex.js` | Yes | - |
| `src/features/community/components/feed/ActivityFeed.jsx` | Yes | - |
| `src/features/community/components/feed/ActivityItem.jsx` | Yes | - |
| `src/features/community/components/feed/FeedFilters.jsx` | Yes | - |
| `src/features/community/components/friends/FriendList.jsx` | Yes | - |
| `src/features/community/components/friends/PendingRequests.jsx` | Yes | - |
| `src/features/community/components/friends/UserSearch.jsx` | Yes | - |
| `src/features/community/components/groups/CreateGroupModal.jsx` | Yes | - |
| `src/features/community/components/groups/GroupCard.jsx` | Yes | - |
| `src/features/community/components/groups/GroupDetail.jsx` | Yes | - |
| `src/features/community/components/groups/MemberList.jsx` | Yes | - |
| `src/features/community/components/leaderboard/LeaderboardPodium.jsx` | Yes | - |
| `src/features/community/components/leaderboard/LeaderboardTab.jsx` | Yes | - |
| `src/features/community/components/leaderboard/LeaderboardTable.jsx` | Yes | - |
| `src/features/community/components/leaderboard/MetricTabs.jsx` | Yes | - |
| `src/features/community/components/leaderboard/PeriodTabs.jsx` | Yes | - |
| `src/features/community/components/leaderboard/ScopeTabs.jsx` | Yes | - |
| `src/features/community/components/leaderboard/YourRankCard.jsx` | Yes | - |
| `src/features/community/components/shared/EmptyState.jsx` | Yes | - |
| `src/features/community/components/shared/ErrorState.jsx` | Yes | - |
| `src/features/community/components/shared/ReportDialog.jsx` | Yes | - |
| `src/features/community/components/shared/SkeletonList.jsx` | Yes | - |
| `src/features/community/constants.ts` | Yes | - |
| `src/features/community/hooks/useActivityFeed.js` | Yes | - |
| `src/features/community/hooks/useFriends.js` | Yes | - |
| `src/features/community/hooks/useGroups.js` | Yes | - |
| `src/features/community/hooks/useLeaderboard.js` | Yes | - |
| `src/features/community/index.ts` | Yes | - |
| `src/features/community/services/feedService.js` | Yes | - |
| `src/features/community/services/friendsService.js` | Yes | - |
| `src/features/community/services/groupsService.js` | Yes | - |
| `src/features/community/services/leaderboardService.js` | Yes | - |
| `src/features/community/services/reportsService.js` | Yes | - |
| `src/features/community/types.ts` | Yes | - |
| `src/features/community/utils/friendsUtils.js` | Yes | - |
| `src/features/community/utils/rankUtils.js` | Yes | - |
| `src/features/gamification/components/CelebrationLayer.jsx` | Yes | - |
| `src/features/gamification/components/DailyGoalRing.jsx` | Yes | - |
| `src/features/gamification/components/GemWallet.jsx` | Yes | - |
| `src/features/gamification/components/LevelProgress.jsx` | Yes | - |
| `src/features/gamification/components/LevelRoadmap.jsx` | Yes | - |
| `src/features/gamification/components/NodeDetailSheet.jsx` | Yes | - |
| `src/features/gamification/components/QuestList.jsx` | Yes | - |
| `src/features/gamification/components/RoadmapNode.jsx` | Yes | - |
| `src/features/gamification/components/RoadmapPath.jsx` | Yes | - |
| `src/features/gamification/components/XpToast.jsx` | Yes | - |
| `src/features/gamification/config.js` | Yes | - |
| `src/features/gamification/hooks/useCelebrations.js` | Yes | - |
| `src/features/gamification/hooks/useGamification.js` | Yes | - |
| `src/features/gamification/hooks/useLevelProgress.js` | Yes | - |
| `src/features/gamification/index.js` | Yes | - |
| `src/features/gamification/services/gamificationService.js` | Yes | B-06 |
| `src/features/gamification/utils/levelCurve.js` | Yes | - |
| `src/features/gamification/utils/levelMilestones.js` | Yes | - |
| `src/hooks/useCombinedSessions.js` | Yes | - |
| `src/hooks/useFeedbackPrompts.js` | Yes | - |
| `src/hooks/useInAppNotifications.js` | Yes | - |
| `src/hooks/useLeaderboard.js` | Yes | - |
| `src/hooks/useNotifications.js` | Yes | - |
| `src/hooks/usePlanner.js` | Yes | - |
| `src/hooks/useSlippingSessions.js` | Yes | - |
| `src/hooks/useStreak.js` | Yes | - |
| `src/hooks/useStudySession.js` | Yes | - |
| `src/index.css` | Yes | - |
| `src/lib/accessibility.js` | Yes | - |
| `src/lib/achievementSync.js` | Yes | - |
| `src/lib/aiActionRegistry.js` | Yes | B-08 |
| `src/lib/aiTutor.js` | Yes | - |
| `src/lib/authErrors.js` | Yes | - |
| `src/lib/collaboration.js` | Yes | - |
| `src/lib/communityChat.js` | Yes | - |
| `src/lib/communityTheme.js` | Yes | - |
| `src/lib/dates.js` | Yes | - |
| `src/lib/educationLevel.js` | Yes | - |
| `src/lib/feedback.js` | Yes | - |
| `src/lib/gamification.js` | Yes | B-01 |
| `src/lib/googleCalendarSync.js` | Yes | B-03 |
| `src/lib/leaderboardUtils.js` | Yes | - |
| `src/lib/learnerType.js` | Yes | - |
| `src/lib/learningStyle.js` | Yes | - |
| `src/lib/lumoPrompts.js` | Yes | - |
| `src/lib/notifications.js` | Yes | B-07 |
| `src/lib/onboarding.js` | Yes | - |
| `src/lib/plannerSchema.js` | Yes | - |
| `src/lib/plannerUtils.js` | Yes | - |
| `src/lib/preferredTime.js` | Yes | - |
| `src/lib/primaryGoal.js` | Yes | - |
| `src/lib/push.js` | Yes | - |
| `src/lib/sanitizePartialMarkdown.js` | Yes | - |
| `src/lib/sessionService.js` | Yes | B-01 |
| `src/lib/streaks.js` | Yes | - |
| `src/lib/streaksCore.js` | Yes | - |
| `src/lib/studyDays.js` | Yes | - |
| `src/lib/supabase.js` | Yes | - |
| `src/lib/userSubjects.js` | Yes | - |
| `src/lib/weeklyHours.js` | Yes | - |
| `src/main.jsx` | Yes | - |

---

# APPENDIX B - SCHEMA DRIFT
Live database schema is not directly accessible without Supabase CLI / direct database connection strings in this environment. All comparisons were executed against the SQL migrations directory (`supabase/migrations/` and `supabase/*.sql`).
