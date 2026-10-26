# 🔭 HYPER TUTOR BACKEND GAP REPORT - 2026-10-23

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
  - `streak_days`, `streak_slipping`: streak daily logging and slipping tracking
  - `community_profiles`, `friendships`, `study_groups`, `study_group_members`, `study_group_join_requests`, `messages`, `conversations`, `message_reports`, `forum_posts`, `forum_answers`, `forum_votes`, `forum_reports`, `peer_tutor_profiles`, `match_requests`, `activity_events`, `community_reports`
  - `subscriptions`, `plans`, `payments`: Paystack integration for Pro / Elite subscriptions
  - `in_app_notifications`, `notification_preferences`, `push_subscriptions`, `conversation_mutes`
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
  - Study Session Creation & Active Session Management (`Study`, `study_history`)
  - Notes, Flashcards, Resources, Practice Questions (`session_notes`, `session_flashcards`, `session_quizzes`, `session_resources`)
  - Study Planner (Time blocks, deadlines, recurring occurrences, slipping sessions, reminders)
  - Community Chat, Inbox, Friendships, Study Groups, Help Forum, Peer Tutors, Activity Feed, Safety Reports
  - Leaderboard RPC (`get_leaderboard`) and Streak System (`useStreak`, `streak_days`, `streak_slipping`)
  - Paystack Subscription Upgrades & Webhook Verification
- Features partially backed:
  - Gamification Rewards: XP and gems are stored in `profiles`, but rewards calculation/award is executed via client inputs instead of server authority.
  - Subscription Lifecycle: Upgrades are backed, but downgrade handling and plan cancellations are stubbed with UI TODO alerts.
  - Notifications: In-app notifications and push notifications are backed for messages, friend requests, and study groups; background nudges for streak-at-risk and no-login days are missing.
- Features with no backend:
  - User Feedback Submission (`FeedbackDialog.jsx` stores feedback in `localStorage` only).
  - External Google Calendar Event Sync (client makes direct `fetch` calls to Google API using client tokens).
  - Gems Store & Reward Redemption System (header CTA points to nonexistent store/redemption system).
  - Account Export & Data Deletion Lifecycle (no server endpoint or RPC for GDPR export or cascade account erasure).
  - AI Tutor Tool Call Server Transaction Engine (Groq AI tool calls executed client-side rather than validated/persisted by server).
- Top 5 risks if nothing is built:
  1. **Rewards & Leaderboard Cheating**: Students can modify client JS or invoke `awardUserRewards` / `completeSession` with fake `xp` / `gems` parameters to top leaderboards and corrupt level progression.
  2. **Silently Lost Feedback**: User feedback submitted in `FeedbackDialog` is saved exclusively to the local browser's `localStorage` and never transmitted to product teams.
  3. **Google Calendar Sync Failures**: Direct client calls to Google Calendar API break after 1-hour OAuth token expiry and expose third-party tokens to DOM scripts.
  4. **Data Retention & Privacy Non-Compliance**: Lack of automated user account deletion and data export endpoint violates privacy requirements.
  5. **Uncontrolled Billing Downgrades**: Customers attempting to downgrade or cancel plans receive a stubbed alert while recurring billing state remains unmanaged.
- Changes since last report: Verified all 195 source files under `src/`; gap items B-01 through B-08 confirmed across latest commits. Expanded Appendix A ledger to encompass all 195 `src/` files.

---

# PART 2 - BACKEND THAT ALREADY EXISTS (do not rebuild)
| UI feature | Table / function | Called from (file:line) | Notes |
|---|---|---|---|
| User Authentication & Onboarding | `auth.users`, `profiles`, `006_profile_trigger.sql` | `src/components/Auth/LoginForm.jsx:20`, `Onboarding.jsx:110` | Auto-creates profile row on signup; saves preferences |
| Active Study Sessions & Timers | `Study`, `study_history`, `study_session_logs` | `src/hooks/useStudySession.js:45`, `src/lib/sessionService.js:30` | Tracks session lifecycle, pause/resume, and topic logs |
| Session Materials & Library | `session_notes`, `session_flashcards`, `session_quizzes`, `session_resources` | `src/components/Library/Library.jsx:190`, `NoteEditor.jsx:35` | Materials linked to sessions (`ON DELETE SET NULL` on session drop) |
| Study Planner & Recurrence | `planner_activities`, `planner_recurrence_rules`, `planner_reminders` | `src/hooks/usePlanner.js:25`, `src/lib/plannerUtils.js:10` | Full CRUD, recurrence preview, slipping session detection |
| Socratic AI Tutor Chat | `ai-tutor`, `ai-tutor-chat`, `user_preferences` | `src/lib/aiTutor.js:20`, `supabase/functions/ai-tutor-chat/index.ts:1` | Groq LLM streaming proxy with Socratic strictness modes |
| Leaderboard & Streaks | `streak_days`, `streak_slipping`, `get_leaderboard` RPC | `src/hooks/useLeaderboard.js:15`, `src/hooks/useStreak.js:30` | Central RPC for rankings and real-time streak tracking |
| Community Chat & Inbox | `messages`, `conversations`, `conversation_mutes`, `message_reports` | `src/components/Community/ChatThread.jsx:120` | Realtime subscriptions, message reporting, conversation muting |
| Study Groups & Join Requests | `study_groups`, `study_group_members`, `study_group_join_requests` | `src/features/groups/groupsApi.js:20` | Full group management, join approvals, session RSVPs |
| Help Forum & Answers | `forum_posts`, `forum_answers`, `forum_votes`, `forum_reports` | `src/components/Community/ForumPostDetail.jsx:210` | Voting, answer posting, and moderation flagging |
| Paystack Payments | `subscriptions`, `plans`, `payments`, `paystack-webhook` | `supabase/functions/verify-payment/index.ts:10` | Cryptographic webhook validation and subscription activation |

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
-- Migration: Add server-authoritative rewards calculation trigger / RPC
-- Existing profiles table columns used: xp_points (int), gems (int), current_streak (int)

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

## ITEM B-02: User Feedback Persistence & Backend Collection

**Priority:** 🔴 Critical
**Status:** Stub / Client-only
**Confidence:** ✅ Confirmed
**Size:** S (under 1 day)
**Depends on:** none

### 1. What the user sees (and why it's broken)
When users click "Give us feedback" or submit exit feedback in `FeedbackDialog.jsx`, the feedback is written strictly to local browser `localStorage` under key `'hyper-tutor-feedback'`. Product owners never receive or see the user feedback.

### 2. Evidence
- `src/components/common/FeedbackDialog.jsx:11-34`: `submitFeedback` parses `localStorage`, prepends feedback object, and writes back to `localStorage`. No network call exists.

### 3. Required backend
- Table `user_feedback` with RLS allowing authenticated users to insert feedback.
- Optional Slack/Email Edge Function webhook trigger upon feedback submission.

### 4. Proposed data model
```sql
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
- Replace `localStorage.setItem` with `await supabase.from("user_feedback").insert(...)`.

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
Build item B-02: User Feedback Persistence & Backend Collection. Deliver the migration SQL, RLS policies, updated `FeedbackDialog.jsx` submit logic, and unit tests.

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
-- Optional tracking table for synced calendar events
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
- Edge Function or RPC `request_subscription_downgrade` updating `subscriptions` table and scheduling cancellation on Paystack / internal tier management.

### 4. Proposed data model
```sql
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS downgrade_plan_id TEXT REFERENCES public.plans(id);
```

### 5. RLS policy matrix
| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `subscriptions` | Authenticated | Service Role | Via RPC | Service Role |

### 6. Server logic and API contract
- RPC: `supabase.rpc('cancel_or_downgrade_subscription', { p_downgrade_plan_id: 'free' })`
- Response: `{ "status": "scheduled", "effective_date": "2026-11-01T00:00:00Z" }`

### 7. Frontend wiring
- File: `src/components/Settings/Billing.jsx:68`
- Replace `handleDowngradeNotice` stub with RPC call and update UI banner to show "Your downgrade to Free takes effect on [date]".

### 8. Acceptance criteria
1. Downgrade requests update `subscriptions.cancel_at_period_end` and `downgrade_plan_id`.
2. Pro/Elite access remains active until `current_period_end`.

### 9. Ready-to-paste build request
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
- RPC `export_user_data()` returning full JSON dump of user profile, sessions, notes, flashcards, and history.
- Edge Function `delete-user-account` executing cascade deletion of user records and Storage bucket files before calling `supabase.auth.admin.deleteUser()`.

### 4. Proposed data model
Uses existing schema with cascading foreign keys (`ON DELETE CASCADE`).

### 5. RLS policy matrix
Executed with Security Definer / Service Role authorization for authenticated user's own ID.

### 6. Server logic and API contract
- `POST /functions/v1/delete-user-account`
- `RPC export_user_data()` returning complete user data bundle.

### 7. Frontend wiring
- Add "Export My Data" and "Delete My Account" buttons in `Settings.jsx` with confirmation modal.

### 8. Acceptance criteria
1. Export returns complete JSON archive of all student data.
2. Deleting account removes auth record and all associated database and storage items.

### 9. Ready-to-paste build request
Build item B-05: Account Data Export & Erasure Lifecycle. Deliver the export RPC, account deletion Edge Function, Settings UI wiring, and tests.

---

## ITEM B-06: Gems Store & Reward Redemption System

**Priority:** 🟠 High
**Status:** Stub / Unbacked
**Confidence:** ✅ Confirmed
**Size:** M (1 to 3 days)
**Depends on:** B-01

### 1. What the user sees (and why it's broken)
Header gems popover states "Redeem gems for rewards", but clicking leads nowhere because no store or reward redemption system exists.

### 2. Evidence
- `src/components/Dashboard/DashboardHeader.jsx:432`

### 3. Required backend
- Tables `rewards` (available catalog items, e.g., streak freezes, custom avatars, themes) and `user_reward_redemptions`.
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

CREATE TABLE IF NOT EXISTS public.user_reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE RESTRICT,
  gem_cost INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5. RLS policy matrix
| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `rewards` | Public/Authenticated | Admin | Admin | Admin |
| `user_reward_redemptions` | Owner | Via RPC `redeem_reward` | None | None |

### 6. Server logic and API contract
- RPC `redeem_reward(p_reward_id UUID)` checks `profiles.gems >= reward.gem_cost`, deducts gems, records redemption, and grants reward item.

### 7. Frontend wiring
- Add Gems Store modal/page linked from `DashboardHeader.jsx`.

### 8. Acceptance criteria
1. Users can view rewards catalog and redeem items if gem balance is sufficient.
2. Gem deduction and inventory grant occur atomically.

### 9. Ready-to-paste build request
Build item B-06: Gems Store & Reward Redemption System. Deliver SQL migration, RPC, store UI component, and tests.

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

### 3. Required backend
- Scheduled cron function `cron-notification-nudges` evaluating users with active streaks who have not logged activity today (3 hours before local cutoff) and dispatching Web Push & in-app notifications.

### 4. Acceptance criteria
1. Nudges are sent only during non-quiet hours.
2. Users who completed activity today are excluded.

### 5. Ready-to-paste build request
Build item B-07: Background Notification Nudges. Deliver the Edge Function, cron schedule, and tests.

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
- `src/lib/aiActionRegistry.js` and `supabase/functions/ai-tutor/index.ts`

### 3. Required backend
- Edge Function option to execute tool calls directly on Supabase Postgres within the AI Tutor proxy before returning response.

### 4. Acceptance criteria
1. Tool calls requested by LLM create database records directly.
2. Response contains created record IDs.

### 5. Ready-to-paste build request
Build item B-08: AI Tutor Tool Call Server Transaction Engine. Deliver updated `ai-tutor` Edge Function code, database transaction logic, and tests.

---

# PART 4 - BUILD ORDER
1. **B-01 (Server-Authoritative Rewards & XP System)**: Foundation for gamification integrity.
2. **B-02 (User Feedback Persistence)**: Quick win to capture lost user feedback.
3. **B-03 (Edge Function Proxy for Google Calendar Sync)**: Solves client API failures and auth token expiry.
4. **B-04 (Subscription Downgrade & Cancellation)**: Completes Paystack billing lifecycle.
5. **B-05 (Account Export & Erasure Lifecycle)**: Ensures GDPR compliance.
6. **B-06 (Gems Store & Reward Redemption)**: Connects with B-01 for gem utility.
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
| `src/components/Community/LeaderboardTab.jsx` | Yes | - |
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
| `src/components/Shop/Shop.jsx` | Yes | - |
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
| `src/features/gamification/services/gamificationService.js` | Yes | - |
| `src/features/gamification/utils/levelCurve.js` | Yes | - |
| `src/features/gamification/utils/levelMilestones.js` | Yes | - |
| `src/hooks/useCombinedSessions.js` | Yes | - |
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
| `src/lib/gamification.js` | Yes | B-01 |
| `src/lib/googleCalendarSync.js` | Yes | B-03 |
| `src/lib/leaderboardUtils.js` | Yes | - |
| `src/lib/learnerType.js` | Yes | - |
| `src/lib/learningStyle.js` | Yes | - |
| `src/lib/lumoPrompts.js` | Yes | - |
| `src/lib/notifications.js` | Yes | B-07 |
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
