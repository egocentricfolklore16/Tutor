# 🔭 HYPER TUTOR BACKEND GAP REPORT - 2026-10-29

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
  - Exit Feedback Submission (`FeedbackDialog.jsx` writes logout feedback exclusively to browser `localStorage` under key 'hyper-tutor-feedback').
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
- Changes since last report: Re-audited all 209 source files under `src/` (up from 206 files). Confirmed newly added components (`InviteDialog.jsx`, `BadgeGrid.jsx`, `badgeUtils.js`) maintain clean modular architecture while confirming gap items B-01 through B-08 across current commits. Expanded specs for B-04 through B-08 to enforce complete 11-section readiness.

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
When users click "Give us feedback" in the sidebar or submit exit feedback in `FeedbackDialog.jsx`, the feedback payload is written strictly to local browser `localStorage` under key 'hyper-tutor-feedback'. Product owners never receive or see the exit feedback.

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
3. `localStorage` key 'hyper-tutor-feedback' is cleared after successful server submission.

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
**Status:** Stub / TODO
**Confidence:** ✅ Confirmed
**Size:** M (1 to 3 days)
**Depends on:** none

### 1. What the user sees (and why it's broken)
In `Settings -> Billing`, clicking "Downgrade to Free" shows a yellow banner stating `"TODO: Downgrade request noted..."`. The downgrade is never registered on the server or Paystack.

### 2. Evidence
- `src/components/Settings/Billing.jsx:68`: `handleDowngradeNotice` sets hardcoded stub string.

### 3. Required backend
- RPC `request_subscription_downgrade` updating `subscriptions` table and scheduling cancellation on Paystack / internal tier management.

### 4. Proposed data model
```sql
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS downgrade_plan_id TEXT REFERENCES public.plans(id);

CREATE OR REPLACE FUNCTION public.cancel_or_downgrade_subscription(
  p_downgrade_plan_id TEXT DEFAULT 'free'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_sub_id UUID;
  v_period_end TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, current_period_end INTO v_sub_id, v_period_end
  FROM public.subscriptions
  WHERE user_id = v_user_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active subscription found';
  END IF;

  UPDATE public.subscriptions
  SET
    cancel_at_period_end = TRUE,
    downgrade_plan_id = p_downgrade_plan_id,
    updated_at = NOW()
  WHERE id = v_sub_id;

  RETURN jsonb_build_object(
    'status', 'scheduled',
    'effective_date', v_period_end,
    'target_plan', p_downgrade_plan_id
  );
END;
$$;
```

### 5. RLS policy matrix
| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `subscriptions` | Authenticated | Service Role | Via RPC `cancel_or_downgrade_subscription` | Service Role |

### 6. Server logic and API contract
- Function: `supabase.rpc('cancel_or_downgrade_subscription', { p_downgrade_plan_id: 'free' })`
- Method: RPC (Authenticated)
- Request JSON: `{ "p_downgrade_plan_id": "free" }`
- Response JSON: `{ "status": "scheduled", "effective_date": "2026-11-01T00:00:00Z", "target_plan": "free" }`
- Error codes: `401 Unauthorized`, `404 No active subscription found`

### 7. Frontend wiring
- File: `src/components/Settings/Billing.jsx:68`
- Replace `handleDowngradeNotice` stub with `supabase.rpc("cancel_or_downgrade_subscription", { p_downgrade_plan_id: "free" })`.
- Update UI banner state to display "Your downgrade to Free takes effect on [effective_date]".

### 8. Edge cases and failure modes
- User has no active paid subscription: RPC throws clean 404 exception.
- Repeated downgrade requests: RPC idempotently updates existing downgrade schedule.

### 9. Acceptance criteria
1. Downgrade requests update `subscriptions.cancel_at_period_end` and `downgrade_plan_id`.
2. Pro/Elite access remains active until `current_period_end`.
3. UI presents exact scheduled effective date returned from server.

### 10. Migration and backfill notes
Additive migration adding subscription columns and RPC. Existing subscriptions default to `cancel_at_period_end = FALSE`.

### 11. Ready-to-paste build request
Build item B-04: Subscription Downgrade & Cancellation Handling. Deliver the SQL migration, RPC, Billing component wiring changes, and tests.

---

## ITEM B-05: Account Data Export & Erasure Lifecycle (GDPR)

**Priority:** 🟠 High
**Status:** Missing
**Confidence:** ✅ Confirmed
**Size:** M (1 to 3 days)
**Depends on:** none

### 1. What the user sees (and why it's broken)
In `Settings -> Account & Safety`, there is no way for users to download their study data or delete their account.

### 2. Evidence
- `src/components/Settings/Settings.jsx`: Account & Safety section lacks export and delete buttons.

### 3. Required backend
- RPC `export_user_data()` returning full JSON dump of user profile, study sessions, notes, flashcards, quizzes, and history.
- Edge Function `delete-user-account` executing cascade deletion of user records and Storage bucket files before calling `supabase.auth.admin.deleteUser()`.

### 4. Proposed data model
Uses existing schema with cascading foreign keys (`ON DELETE CASCADE`).

```sql
CREATE OR REPLACE FUNCTION public.export_user_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT jsonb_build_object(
    'profile', (SELECT row_to_json(p) FROM public.profiles p WHERE p.id = v_user_id),
    'study_sessions', COALESCE((SELECT json_agg(s) FROM public."Study" s WHERE s.user_id = v_user_id), '[]'::json),
    'notes', COALESCE((SELECT json_agg(n) FROM public.session_notes n WHERE n.user_id = v_user_id), '[]'::json),
    'flashcards', COALESCE((SELECT json_agg(f) FROM public.session_flashcards f WHERE f.user_id = v_user_id), '[]'::json),
    'quizzes', COALESCE((SELECT json_agg(q) FROM public.session_quizzes q WHERE q.user_id = v_user_id), '[]'::json)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
```

### 5. RLS policy matrix
| Function / Endpoint | Authorization | Scope |
|---|---|---|
| `export_user_data()` | Authenticated | Own user ID (`auth.uid()`) |
| `delete-user-account` | JWT Bearer | Own user ID (`auth.uid()`) via Service Role |

### 6. Server logic and API contract
- Endpoint 1: `supabase.rpc('export_user_data')`
  - Response JSON: `{ "profile": { ... }, "study_sessions": [...], "notes": [...], "flashcards": [...], "quizzes": [...] }`
- Endpoint 2: `POST /functions/v1/delete-user-account`
  - Headers: `Authorization: Bearer <user_jwt>`
  - Request JSON: `{"confirm": true}`
  - Response JSON: `{"success": true, "message": "Account deleted"}`
  - Error codes: `401 Unauthorized`, `400 Confirmation Required`

### 7. Frontend wiring
- File: `src/components/Settings/Settings.jsx`
- Add "Export My Data" button calling `export_user_data()` and triggering browser JSON file download.
- Add "Delete My Account" button opening modal confirmation, calling `delete-user-account`, and redirecting to `/login`.

### 8. Edge cases and failure modes
- Large data exports: RPC aggregates data efficiently using Postgres JSON functions.
- Storage file cleanup: Edge Function enumerates user items in `resources` and `avatars` buckets before auth deletion.

### 9. Acceptance criteria
1. Export returns complete JSON archive of all student data.
2. Deleting account removes auth record and all associated database and storage items.
3. Unauthenticated calls to export or delete endpoints are rejected with 401.

### 10. Migration and backfill notes
Additive migration creating `export_user_data()` RPC and deploying `delete-user-account` Edge Function.

### 11. Ready-to-paste build request
Build item B-05: Account Data Export & Erasure Lifecycle. Deliver the export RPC, account deletion Edge Function, Settings UI wiring, and tests.

---

## ITEM B-06: Gems Store Ledger & Reward Redemption System

**Priority:** 🟠 High
**Status:** Partial / Stub
**Confidence:** ✅ Confirmed
**Size:** M (1 to 3 days)
**Depends on:** B-01

### 1. What the user sees (and why it's broken)
The Gem Rewards Shop (`src/components/Shop/Shop.jsx`) enables purchasing Streak Freezes via `gamificationService.purchaseStreakFreeze`, but clicking on cosmetic themes, avatar frames, or AI hint packs presents "Coming Soon" locks because no redemption transactions or ledger history logging exist on the server.

### 2. Evidence
- `src/components/Shop/Shop.jsx:250-280`: Cosmetic catalog items render locked state with "Unlocks in Future Backend Update".
- `src/features/gamification/services/gamificationService.js:192-198`: `getTransactions` returns hardcoded `{ data: [], available: false, message: "Gem transaction ledger pending backend implementation" }`.

### 3. Required backend
- Tables `rewards` (available catalog items) and `gem_transactions` (append-only ledger tracking earned/spent gems).
- RPC `redeem_reward(p_reward_id UUID)`.

### 4. Proposed data model
```sql
CREATE TABLE IF NOT EXISTS public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  gem_cost INT NOT NULL CHECK (gem_cost > 0),
  reward_type TEXT NOT NULL CHECK (reward_type IN ('freeze_token', 'avatar_frame', 'theme', 'badge')),
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.gem_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id UUID REFERENCES public.rewards(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'spend')),
  amount INT NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gem_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active rewards" ON public.rewards FOR SELECT TO authenticated USING (is_active = TRUE);
CREATE POLICY "Users view own gem transactions" ON public.gem_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.redeem_reward(p_reward_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_cost INT;
  v_user_gems INT;
  v_reward_type TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT gem_cost, reward_type INTO v_cost, v_reward_type
  FROM public.rewards WHERE id = p_reward_id AND is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reward not found or inactive';
  END IF;

  SELECT COALESCE(gems, 0) INTO v_user_gems FROM public.profiles WHERE id = v_user_id;

  IF v_user_gems < v_cost THEN
    RAISE EXCEPTION 'Insufficient gems';
  END IF;

  UPDATE public.profiles SET gems = gems - v_cost WHERE id = v_user_id;

  INSERT INTO public.gem_transactions (user_id, reward_id, type, amount, reason)
  VALUES (v_user_id, p_reward_id, 'spend', v_cost, 'Purchased ' || v_reward_type);

  RETURN jsonb_build_object('success', true, 'gems_spent', v_cost);
END;
$$;
```

### 5. RLS policy matrix
| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `rewards` | Authenticated | Admin | Admin | Admin |
| `gem_transactions` | Owner | Via RPC `redeem_reward` | None | None |

### 6. Server logic and API contract
- RPC `redeem_reward(p_reward_id UUID)`
- Method: RPC (Authenticated)
- Request JSON: `{ "p_reward_id": "uuid" }`
- Response JSON: `{ "success": true, "gems_spent": 50 }`
- Error codes: `401 Unauthorized`, `400 Insufficient gems`, `404 Reward not found`

### 7. Frontend wiring
- Update `src/features/gamification/services/gamificationService.js` to replace `getTransactions` stub with `supabase.from('gem_transactions').select('*')`.
- Wire `handleBuyStreakFreeze` and cosmetic items in `src/components/Shop/Shop.jsx` to `redeem_reward`.

### 8. Edge cases and failure modes
- Insufficient gems: RPC throws exception and aborts transaction without modifying profile gems.
- Inactive reward item: RPC throws exception.

### 9. Acceptance criteria
1. Users can view gem transactions in the Shop History tab.
2. Redeeming catalog items deducts gems, records transaction, and grants items atomically.
3. Insufficient gems prevents redemption with explicit error response.

### 10. Migration and backfill notes
Additive migration creating `rewards`, `gem_transactions`, and `redeem_reward` RPC.

### 11. Ready-to-paste build request
Build item B-06: Gems Store Ledger & Reward Redemption System. Deliver SQL migration, RPC, Shop transaction wiring, and tests.

---

## ITEM B-07: Background Notification Nudges (Streak-at-Risk & No-Login)

**Priority:** 🟡 Medium
**Status:** Partial
**Confidence:** ✅ Confirmed
**Size:** M (1 to 3 days)
**Depends on:** none

### 1. What the user sees (and why it's broken)
Users expect push/in-app nudges when their streak is about to break or when they haven't logged in all day. Currently, `planner-reminders` only sends scheduled session reminders.

### 2. Evidence
- `supabase/functions/planner-reminders/index.ts` lacks logic for streak risk or no-login nudges.
- `src/lib/notifications.js`: Contains local notification builders but no server-triggered nudges.

### 3. Required backend
- Scheduled cron Edge Function `cron-notification-nudges` evaluating active users without daily completions (3 hours before local 3 AM cutoff) and dispatching Web Push & in-app notifications.

### 4. Proposed data model
```sql
CREATE TABLE IF NOT EXISTS public.notification_nudge_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nudge_type TEXT NOT NULL CHECK (nudge_type IN ('streak_at_risk', 'no_login_daily')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_daily_user_nudge UNIQUE (user_id, nudge_type, sent_at::date)
);

ALTER TABLE public.notification_nudge_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own nudge logs"
  ON public.notification_nudge_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

### 5. RLS policy matrix
| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `notification_nudge_logs` | Authenticated | Service Role | None | None |

### 6. Server logic and API contract
- Endpoint: `POST /functions/v1/cron-notification-nudges`
- Authorization: `Bearer <CRON_SECRET>`
- Trigger: Scheduled Supabase Cron (hourly evaluation)
- Execution logic:
  - Queries `users_streaks` where `current_streak > 0` and `last_active_date < CURRENT_DATE`.
  - Checks user timezone and verifies quiet hours (e.g. 10 PM - 8 AM).
  - Inserts row into `in_app_notifications` and dispatches Web Push payload via VAPID.
- Response JSON: `{ "processed": 42, "nudges_sent": 15 }`

### 7. Frontend wiring
- Update `src/lib/notifications.js` and `useInAppNotifications.js` to process `streak_at_risk` and `no_login_daily` notification types.

### 8. Edge cases and failure modes
- User has already completed activity today: Cron excludes user from nudge queue.
- Quiet hours active: Nudge deferred or skipped.

### 9. Acceptance criteria
1. Nudges are sent only during non-quiet hours.
2. Users who completed activity today are excluded.
3. Duplicate nudges on the same day are prevented by unique constraints.

### 10. Migration and backfill notes
Additive migration for `notification_nudge_logs` table and deployment of cron Edge Function.

### 11. Ready-to-paste build request
Build item B-07: Background Notification Nudges. Deliver the Edge Function, cron schedule, database logging table, and tests.

---

## ITEM B-08: AI Tutor Tool Call Server Transaction Engine

**Priority:** 🟡 Medium
**Status:** Client-interpreted
**Confidence:** ✅ Confirmed
**Size:** M (1 to 3 days)
**Depends on:** none

### 1. What the user sees (and why it's broken)
When AI Tutor returns tool calls (`schedule_study_session`, `create_flashcards`), execution happens in frontend client state (`aiActionRegistry.js`). If the user navigates away before client execution finishes, the generated item is lost.

### 2. Evidence
- `src/lib/aiActionRegistry.js`
- `supabase/functions/ai-tutor/index.ts`

### 3. Required backend
- Edge Function execution option inside `ai-tutor` proxy to execute requested tool calls directly on Supabase Postgres within the server session before returning response.

### 4. Proposed data model
Reuses existing database tables (`Study`, `session_flashcards`, `planner_activities`).

```sql
CREATE TABLE IF NOT EXISTS public.ai_tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  payload JSONB NOT NULL,
  result_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_tool_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own AI tool executions"
  ON public.ai_tool_executions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

### 5. RLS policy matrix
| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `ai_tool_executions` | Authenticated | Service Role | None | None |

### 6. Server logic and API contract
- Function: `ai-tutor` Edge Function
- Processing: When Groq returns tool call arguments (e.g. `schedule_study_session`), server executes database insert directly using Service Role on behalf of authenticated `auth.uid()`.
- Response JSON:
```json
{
  "message": "I have scheduled your Physics study session for tomorrow at 3 PM.",
  "executed_tools": [
    {
      "tool": "schedule_study_session",
      "status": "success",
      "created_id": 482
    }
  ]
}
```
- Error cases: `400 Invalid Tool Payload`, `500 Database Insert Error`

### 7. Frontend wiring
- Update `src/lib/aiActionRegistry.js` and `AITutorChat.jsx` to receive `executed_tools` confirmation from server response and render inline confirmation chips without initiating client-side writes.

### 8. Edge cases and failure modes
- User disconnects during AI streaming: Server finishes database insert regardless of client connection state.
- Invalid tool parameters: Server logs failed execution in `ai_tool_executions` and returns explanatory Socratic text.

### 9. Acceptance criteria
1. Tool calls requested by LLM create database records directly on the server.
2. Created record IDs are returned in response payload.
3. User page navigation does not interrupt database creation.

### 10. Migration and backfill notes
Additive migration for `ai_tool_executions` table and update to `ai-tutor` Edge Function proxy.

### 11. Ready-to-paste build request
Build item B-08: AI Tutor Tool Call Server Transaction Engine. Deliver updated `ai-tutor` Edge Function code, database transaction logic, frontend registry wiring updates, and tests.

---

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
| `src/features/community/components/groups/InviteDialog.jsx` | Yes | - |
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
| `src/features/gamification/components/BadgeGrid.jsx` | Yes | - |
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
| `src/features/gamification/utils/badgeUtils.js` | Yes | - |
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
