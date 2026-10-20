# 🔭 HYPER TUTOR BACKEND GAP REPORT - 2026-10-20

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
  - `community_profiles`, `friendships`, `study_groups`, `study_group_members`, `study_group_join_requests`, `messages`, `conversations`, `message_reports`, `forum_posts`, `forum_answers`, `forum_votes`, `forum_reports`, `peer_tutor_profiles`, `match_requests`
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
- Total gaps: 8 (🔴 3 critical, 🟠 3 high, 🟡 2 medium, 🟢 0 low)
- Features fully backed today:
  - User authentication and onboarding profile synchronization
  - Personal & group study session lifecycle (creation, pause/resume, heartbeat, material persistence upon session deletion, completion tracking)
  - Planner activities, time blocks, deadlines, recurring occurrences, and background reminders engine
  - Socratic AI Tutor Edge Functions (`ai-tutor` and `ai-tutor-chat`) with strictness modes and attempt counter guardrails
  - Community study groups, friend requests, activity feed events, peer tutoring matching, and safety reporting
  - Realtime messaging, conversation mute preferences, and Web Push notifications (`send-push` & `planner-reminders`)
  - Paystack payment processing, reference isolation, amount validation, and webhook processing
- Features partially backed:
  - Gamification rewards (XP, levels, streak calculation) are queried from `profiles`, but rewards can be arbitrarily requested by client payloads
  - Paystack subscription checkout is verified, but downgrade/cancellation state management lacks server RPCs
- Features with no backend:
  - User logout feedback dialog persistence (saves exclusively to browser `localStorage`)
  - External Google Calendar OAuth token refresh and sync proxy
  - GDPR account data export & deletion RPC lifecycle
  - In-app Gems store redemption & reward inventory RPC
  - Background automated nudges for streak-at-risk and inactive accounts
  - AI Tutor tool call server transaction engine (executing `create_study_plan`, `schedule_study_session`, `generate_quiz`, `create_flashcards` directly against Postgres)
- Top 5 risks if nothing is built:
  1. **Gamification Cheating & Database Tampering**: Client-authoritative XP and gems parameters passed into `completeSession` allow users to spoof level progression and leaderboard rankings.
  2. **Silent Feedback Loss**: Offboarding and app exit feedback in `FeedbackDialog.jsx` is written strictly to `localStorage`, stranding valuable user churn feedback on client devices.
  3. **Third-Party Auth Failure**: Direct client-side Google OAuth API calls fail silently after 60 minutes when `provider_token` expires without a server token refresh proxy.
  4. **GDPR/CCPA Non-Compliance**: Lack of account erasure and data export backend endpoints leaves the platform non-compliant with global privacy regulations.
  5. **Unfulfilled AI Action Requests**: Tool calls returned by Groq AI Tutor models cannot mutate student study schedules or create quizzes in Postgres without a server transaction engine.
- Changes since last report: No new gaps or resolved gaps; audit verified against current git history (`6ec8126`).

---

# PART 2 - BACKEND THAT ALREADY EXISTS (do not rebuild)
| UI feature | Table / function | Called from (file:line) | Notes |
|---|---|---|---|
| Study Sessions & Tools | `Study`, `session_notes`, `session_flashcards`, `session_quizzes`, `session_resources` | `src/lib/sessionService.js:28` | Full atomic persistence with `session_id = NULL` preservation on session deletion. |
| Planner & Reminders | `planner_activities`, `planner_recurrence_rules`, `planner_reminders` | `src/hooks/usePlanner.js:42` | Recurrence rules, conflict detection, and `planner-reminders` cron Edge Function. |
| AI Tutor & Strictness | `ai-tutor`, `ai-tutor-chat`, `user_preferences` | `src/lib/aiTutor.js:35` | Enforces Socratic strictness modes and attempt counter guardrails via Edge Functions. |
| Study Groups & Community | `study_groups`, `study_group_members`, `messages`, `activity_events` | `src/features/groups/groupsApi.js:15` | Full RLS policies, member role enforcement, activity feed trigger, and realtime messaging. |
| Push & In-App Notifications | `in_app_notifications`, `push_subscriptions`, `send-push` | `src/lib/push.js:88` | Web Push VAPID payload delivery with quiet hours and conversation mute checks. |
| Paystack Payments | `subscriptions`, `plans`, `payments`, `verify-payment` | `src/components/Settings/PaystackCheckoutButton.jsx:45` | Constant-time webhook verification, kobo rounding, and user ID metadata assertion. |

---

# PART 3 - GAP ITEMS

## ITEM B-01: Server-Authoritative Gamification Rewards & XP System

**Priority:** 🔴 Critical
**Status:** Partial
**Confidence:** ✅ Confirmed
**Size:** M (1 to 3 days)
**Depends on:** none

### 1. What the user sees (and why it's broken)
When a user completes a study session or quiz, `completeSession` in `src/lib/sessionService.js` calculates XP and gems in JavaScript on the client (`xp = 50, gems = 5`) and sends those values directly to Supabase via `awardUserRewards`. A tech-savvy student can inspect network traffic or modify client state to claim thousands of XP or gems per session.

### 2. Evidence
- `src/lib/sessionService.js:184`: `await awardUserRewards({ xp, gems });` passes client-computed values.
- `src/lib/gamification.js:42`: `awardUserRewards` executes RPC `award_user_rewards` with client-provided amounts.

### 3. Required backend
- PostgreSQL SECURITY DEFINER RPC `complete_study_session_v2(session_id uuid, actual_duration_seconds int)`.
- Server-side reward validation that inspects `Study` table metrics, calculates base XP (1 XP per minute, max 120 XP per session) and gems (5 gems for sessions >= 25 mins), updates `profiles.xp_points` and `profiles.gems`, logs to `study_history`, and returns sanitized rewards.

### 4. Proposed data model
```sql
-- Migration: Add server calculation constraint to award_user_rewards
CREATE OR REPLACE FUNCTION award_study_session_rewards(
  p_user_id UUID,
  p_session_id UUID,
  p_elapsed_seconds INT
) RETURNS TABLE (
  xp_awarded INT,
  gems_awarded INT,
  new_xp INT,
  new_gems INT,
  new_level INT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_minutes INT;
  v_xp INT;
  v_gems INT;
  v_current_xp INT;
  v_current_gems INT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_minutes := GREATEST(1, LEAST(180, COALESCE(p_elapsed_seconds, 0) / 60));
  v_xp := LEAST(120, v_minutes * 2);
  v_gems := CASE WHEN v_minutes >= 25 THEN 5 ELSE 1 END;

  UPDATE profiles
  SET xp_points = COALESCE(xp_points, 0) + v_xp,
      gems = COALESCE(gems, 0) + v_gems,
      last_active_at = NOW()
  WHERE id = p_user_id
  RETURNING xp_points, gems INTO v_current_xp, v_current_gems;

  RETURN QUERY SELECT v_xp, v_gems, v_current_xp, v_current_gems, (v_current_xp / 1000) + 1;
END;
$$;
```

### 5. RLS policy matrix
| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | Authenticated users | Owner | Owner via RPC | Owner |

### 6. Server logic and API contract
- Function: `award_study_session_rewards` (RPC)
- Request: `{ "p_session_id": "uuid", "p_elapsed_seconds": 1500 }`
- Response: `{ "xp_awarded": 50, "gems_awarded": 5, "new_xp": 1250, "new_gems": 45, "new_level": 2 }`
- Errors: `401 Unauthorized`, `400 Invalid Duration`

### 7. Frontend wiring
- Modify `src/lib/sessionService.js` to strip client `xp` / `gems` parameters from `completeSession` and rely on RPC response values.

### 8. Edge cases and failure modes
- Sub-minute session completions award 0 XP and 0 gems.
- Network retries on `completeSession` use idempotent RPC checks based on `study_history.session_id`.

### 9. Acceptance criteria
1. Client cannot pass explicit XP or gem amounts to increase profile balances.
2. XP awarded matches server-calculated session duration.
3. Total profile XP and gems update atomically in Postgres.

### 10. Migration and backfill notes
- Additive RPC migration. No profile data backfill required.

### 11. Ready-to-paste build request
"Build item B-01: Server-Authoritative Gamification Rewards & XP System. Follow the spec below exactly. Deliver the migration SQL, RLS policies, SECURITY DEFINER RPC, typed client service updates in `src/lib/sessionService.js`, and unit tests."

---

## ITEM B-02: User Feedback Persistence & Backend Collection

**Priority:** 🟠 High
**Status:** Stub / Client-only
**Confidence:** ✅ Confirmed
**Size:** S (under 1 day)
**Depends on:** none

### 1. What the user sees (and why it's broken)
When a user clicks "Give Feedback" or opens the logout feedback prompt in `FeedbackDialog.jsx`, submitting the form displays a confirmation state. However, the feedback message and reason are written directly to `localStorage` key `'hyper-tutor-feedback'` and never sent to any database table or endpoint.

### 2. Evidence
- `src/components/common/FeedbackDialog.jsx:28`: `localStorage.setItem(KEY, JSON.stringify([feedback, ...existing].slice(0, 25)));`

### 3. Required backend
- Postgres table `user_feedback`.
- RLS policy allowing authenticated users to INSERT feedback.
- Client utility in `src/components/common/FeedbackDialog.jsx` calling Supabase `from('user_feedback').insert()`.

### 4. Proposed data model
```sql
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert feedback" ON public.user_feedback
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
```

### 5. RLS policy matrix
| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `user_feedback` | Admins only | Authenticated users | None | None |

### 6. Server logic and API contract
- Direct PostgREST INSERT: `supabase.from('user_feedback').insert({ reason, message })`.
- Response: `201 Created`.

### 7. Frontend wiring
- Replace `localStorage` logic in `FeedbackDialog.jsx:28` with Supabase `insert` call.

### 8. Edge cases and failure modes
- Empty or whitespace messages validate cleanly.
- Unauthenticated users submit with `user_id = NULL`.

### 9. Acceptance criteria
1. Submitting feedback writes a row to `user_feedback`.
2. Users cannot read other users' submitted feedback.

### 10. Migration and backfill notes
- Additive table migration.

### 11. Ready-to-paste build request
"Build item B-02: User Feedback Persistence & Backend Collection. Follow the spec below exactly. Deliver the migration SQL, RLS policies, frontend integration in `FeedbackDialog.jsx`, and tests."

---

## ITEM B-03: Edge Function Proxy for Google Calendar Sync

**Priority:** 🟠 High
**Status:** Client-only
**Confidence:** ✅ Confirmed
**Size:** M (1 to 3 days)
**Depends on:** none

### 1. What the user sees (and why it's broken)
`ExternalCalendarSync.jsx` allows students to sync study sessions with Google Calendar. Client code in `src/lib/googleCalendarSync.js` uses `session.provider_token` to make direct `fetch` requests to Google Calendar APIs. OAuth access tokens expire in 60 minutes, causing calendar sync to fail with 401 Unauthorized errors after the initial login session.

### 2. Evidence
- `src/lib/googleCalendarSync.js:35`: `fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', { headers: { Authorization: `Bearer ${session.provider_token}` } })`.

### 3. Required backend
- Edge Function `google-calendar-sync`.
- Secure server-side exchange of Google OAuth refresh tokens stored in Supabase Auth.
- Endpoints to sync single sessions or batch export study schedules.

### 4. Proposed data model
- Uses standard Supabase Auth `auth.identities` table for OAuth tokens.

### 5. RLS policy matrix
| Entity | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `google-calendar-sync` | Authenticated users only | Authenticated users only | Authenticated users only | Authenticated users only |

### 6. Server logic and API contract
- Endpoint: `POST /functions/v1/google-calendar-sync`
- Request: `{ "action": "sync_event", "studySession": { "title": "Math", "date": "2026-10-21", "startTime": "09:00", "duration": 1 } }`
- Response: `{ "success": true, "googleEventId": "abc123xyz" }`

### 7. Frontend wiring
- Refactor `src/lib/googleCalendarSync.js` to invoke Edge Function `supabase.functions.invoke('google-calendar-sync', { body: ... })`.

### 8. Edge cases and failure modes
- Revoked OAuth permissions return clear re-authentication prompts in UI.

### 9. Acceptance criteria
1. Calendar events sync successfully even after OAuth token expiration.
2. Refresh tokens are never exposed to browser client bundles.

### 10. Migration and backfill notes
- Edge Function deployment only.

### 11. Ready-to-paste build request
"Build item B-03: Edge Function Proxy for Google Calendar Sync. Deliver the Deno Edge Function `google-calendar-sync`, client updates in `src/lib/googleCalendarSync.js`, and integration test suite."

---

## ITEM B-04: Subscription Downgrade & Cancellation Handling

**Priority:** 🟠 High
**Status:** Partial
**Confidence:** ✅ Confirmed
**Size:** M (1 to 3 days)
**Depends on:** none

### 1. What the user sees (and why it's broken)
Users can upgrade to Pro or Elite plans via Paystack in `Billing.jsx`. However, clicking "Cancel Subscription" or "Downgrade to Free" toggles UI state without executing a backend cancellation RPC or updating `subscriptions` table statuses.

### 2. Evidence
- `src/components/Settings/Billing.jsx:120`: local state toggles without Supabase mutation.

### 3. Required backend
- PostgreSQL RPC `cancel_user_subscription(p_user_id uuid)`.
- Updates `subscriptions` status to `'cancelled'`, sets `cancel_at_period_end = true`, and preserves tier access until `current_period_end`.

### 4. Proposed data model
```sql
CREATE OR REPLACE FUNCTION cancel_user_subscription(
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_sub_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE subscriptions
  SET cancel_at_period_end = TRUE,
      updated_at = NOW()
  WHERE user_id = v_user_id AND status = 'active'
  RETURNING id INTO v_sub_id;

  IF v_sub_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'No active subscription found');
  END IF;

  RETURN jsonb_build_object('success', true, 'subscription_id', v_sub_id);
END;
$$;
```

### 5. RLS policy matrix
| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `subscriptions` | Owner | Service role | Owner via RPC | Owner via RPC |

### 6. Server logic and API contract
- Function: `cancel_user_subscription` (RPC)
- Request: `{ "p_reason": "Too expensive" }`
- Response: `{ "success": true, "subscription_id": "uuid" }`

### 7. Frontend wiring
- Connect `Billing.jsx` cancel button to `supabase.rpc('cancel_user_subscription')`.

### 8. Edge cases and failure modes
- Users with no active subscription receive a friendly failure message.

### 9. Acceptance criteria
1. Cancelling sets `cancel_at_period_end = true` in Postgres.
2. Subscription privileges persist until period end date.

### 10. Migration and backfill notes
- Additive SQL RPC migration.

### 11. Ready-to-paste build request
"Build item B-04: Subscription Downgrade & Cancellation Handling. Deliver the SQL migration for `cancel_user_subscription`, frontend wiring in `Billing.jsx`, and tests."

---

## ITEM B-05: Account Data Export & Erasure Lifecycle (GDPR)

**Priority:** 🟡 Medium
**Status:** Missing
**Confidence:** ✅ Confirmed
**Size:** M (1 to 3 days)
**Depends on:** none

### 1. What the user sees (and why it's broken)
`Settings.jsx` includes "Export My Data" and "Delete Account" buttons under Account & Safety. Currently, clicking "Export Data" yields a placeholder object and "Delete Account" clears local auth state without purging student records from Postgres or Supabase Storage.

### 2. Evidence
- `src/components/Settings/Settings.jsx:210`: account deletion performs local signOut only.

### 3. Required backend
- PostgreSQL RPC `export_user_data_json(p_user_id uuid)`.
- Edge Function or RPC `delete_user_account_permanently()`.

### 4. Proposed data model
```sql
CREATE OR REPLACE FUNCTION export_user_data_json()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_data JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'profile', (SELECT row_to_json(p) FROM profiles p WHERE p.id = v_user_id),
    'study_sessions', (SELECT json_agg(s) FROM "Study" s WHERE s.user_id = v_user_id),
    'notes', (SELECT json_agg(n) FROM session_notes n WHERE n.user_id = v_user_id),
    'flashcards', (SELECT json_agg(f) FROM session_flashcards f WHERE f.user_id = v_user_id),
    'quizzes', (SELECT json_agg(q) FROM session_quizzes q WHERE q.user_id = v_user_id)
  ) INTO v_data;

  RETURN v_data;
END;
$$;
```

### 5. RLS policy matrix
| Function | Access |
|---|---|
| `export_user_data_json` | Authenticated user for own data |
| `delete_user_account_permanently` | Authenticated user for own account |

### 6. Server logic and API contract
- RPC: `export_user_data_json()` -> Returns complete JSON bundle of user records.
- RPC: `delete_user_account_permanently()` -> Cascades delete on `auth.users`.

### 7. Frontend wiring
- Wire "Export My Data" button to trigger file download of RPC JSON payload.
- Wire "Delete Account" button to execute deletion RPC.

### 8. Edge cases and failure modes
- Storage bucket assets (avatars, attachments) are deleted asynchronously upon user erasure.

### 9. Acceptance criteria
1. Export returns complete structured archive of student study history and materials.
2. Account deletion removes all student rows across tables.

### 10. Migration and backfill notes
- Additive SQL functions.

### 11. Ready-to-paste build request
"Build item B-05: Account Data Export & Erasure Lifecycle. Deliver the export and deletion RPCs, frontend wiring in `Settings.jsx`, and privacy verification tests."

---

## ITEM B-06: Gems Store & Reward Redemption System

**Priority:** 🟡 Medium
**Status:** Missing
**Confidence:** ✅ Confirmed
**Size:** M (1 to 3 days)
**Depends on:** B-01

### 1. What the user sees (and why it's broken)
`GemWallet.jsx` displays student gem balances and options to purchase streak freezes or avatar themes using gems. Buying items triggers local UI state updates without deducting gems or storing inventory items in Postgres.

### 2. Evidence
- `src/features/gamification/components/GemWallet.jsx:85`: local state subtraction without backend RPC call.

### 3. Required backend
- PostgreSQL table `user_inventory`.
- PostgreSQL SECURITY DEFINER RPC `purchase_gem_item(p_item_key text, p_cost int)`.

### 4. Proposed data model
```sql
CREATE TABLE IF NOT EXISTS public.user_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, item_key)
);

ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own inventory" ON public.user_inventory
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
```

### 5. RLS policy matrix
| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `user_inventory` | Owner | Service role via RPC | Service role via RPC | Owner |

### 6. Server logic and API contract
- RPC: `purchase_gem_item(p_item_key, p_cost)`
- Checks `profiles.gems >= p_cost`, deducts gems, inserts/increments `user_inventory`, and returns updated balances.

### 7. Frontend wiring
- Replace local `setGems` in `GemWallet.jsx` with `supabase.rpc('purchase_gem_item')`.

### 8. Edge cases and failure modes
- Insufficient gems return standard `400 Insufficient Gems` error code.

### 9. Acceptance criteria
1. Gem purchases atomically deduct balance and record inventory items.
2. Students cannot purchase items if gem balance is lower than cost.

### 10. Migration and backfill notes
- Additive SQL schema and RPC.

### 11. Ready-to-paste build request
"Build item B-06: Gems Store & Reward Redemption System. Deliver DDL for `user_inventory`, `purchase_gem_item` RPC, frontend wiring in `GemWallet.jsx`, and tests."

---

## ITEM B-07: Background Notification Nudges (Streak-at-Risk & No-Login)

**Priority:** 🔴 Critical
**Status:** Missing
**Confidence:** ✅ Confirmed
**Size:** M (1 to 3 days)
**Depends on:** none

### 1. What the user sees (and why it's broken)
`NotificationSettings.jsx` exposes toggles for "Streak-at-Risk Reminders" and "Daily Inactivity Nudges". While client scheduled notifications handle in-app session timers, no background cron process evaluates user inactive hours to dispatch Web Push nudges when the browser is closed.

### 2. Evidence
- `supabase/functions/planner-reminders/index.ts` only processes `planner_reminders` for upcoming scheduled sessions.

### 3. Required backend
- Supabase Edge Function `background-nudges`.
- Scheduled Cron job executing every hour to evaluate inactive users with active streaks nearing 3am cutoff or 24 hours of inactivity.

### 4. Proposed data model
- Queries `profiles` (`last_active_at`, `current_streak`, `timezone`) and `push_subscriptions`.

### 5. RLS policy matrix
- Edge Function executed with service role key protected by `CRON_SECRET`.

### 6. Server logic and API contract
- Endpoint: `POST /functions/v1/background-nudges`
- Header: `x-cron-secret: <CRON_SECRET>`
- Evaluates student inactive times and invokes `send-push` for eligible targets.

### 7. Frontend wiring
- Toggle controls in `NotificationSettings.jsx` update `notification_preferences` flags in Postgres.

### 8. Edge cases and failure modes
- Quiet hours preferences (`quiet_hours_start`, `quiet_hours_end`) are respected before sending push notifications.

### 9. Acceptance criteria
1. Background cron detects users with active streaks who have not studied today.
2. Web Push notifications are enqueued and delivered prior to 3am local cutoff.

### 10. Migration and backfill notes
- Cron trigger configuration in Supabase dashboard / config.

### 11. Ready-to-paste build request
"Build item B-07: Background Notification Nudges. Deliver the `background-nudges` Edge Function, quiet hours integration, and automated scheduled tests."

---

## ITEM B-08: AI Tutor Tool Call Server Transaction Engine

**Priority:** 🔴 Critical
**Status:** Partial
**Confidence:** ✅ Confirmed
**Size:** L (3+ days)
**Depends on:** none

### 1. What the user sees (and why it's broken)
The Edge Function `ai-tutor` defines tool schemas (`create_study_plan`, `schedule_study_session`, `generate_quiz`, `create_flashcards`) in `supabase/functions/ai-tutor/toolSchemas.ts`. When Groq models return tool calls, `tools.ts` returns JSON instructions to the frontend, but no backend transaction handler executes those operations directly in Postgres tables (`Study`, `planner_activities`, `session_quizzes`, `session_flashcards`).

### 2. Evidence
- `supabase/functions/ai-tutor/tools.ts:45`: tool execution returns JSON payload descriptions to frontend without performing DB inserts.

### 3. Required backend
- Service role database transaction engine inside `ai-tutor` Edge Function to execute tools directly.
- Performs atomic writes to `planner_activities`, `Study`, `session_quizzes`, and `session_flashcards` on behalf of calling authenticated user.

### 4. Proposed data model
- Uses existing tables: `planner_activities`, `Study`, `session_quizzes`, `session_quiz_questions`, `session_flashcards`.

### 5. RLS policy matrix
| Table | INSERT |
|---|---|
| `planner_activities` | Owner / Service Role |
| `Study` | Owner / Service Role |
| `session_quizzes` | Owner / Service Role |
| `session_flashcards` | Owner / Service Role |

### 6. Server logic and API contract
- Edge Function handler in `supabase/functions/ai-tutor/tools.ts`:
  - `create_study_plan` -> Inserts rows into `planner_activities`.
  - `schedule_study_session` -> Inserts row into `Study`.
  - `generate_quiz` -> Inserts row into `session_quizzes` and `session_quiz_questions`.
  - `create_flashcards` -> Inserts rows into `session_flashcards`.

### 7. Frontend wiring
- Update `AITutorChat.jsx` to receive tool execution success confirmation and refresh active planner/library views.

### 8. Edge cases and failure modes
- Tool execution failures return friendly AI text explanations rather than breaking chat stream.

### 9. Acceptance criteria
1. AI Tutor scheduling tool calls create actual viewable sessions in Planner.
2. AI Tutor generated quizzes and flashcards immediately appear in Student Library.

### 10. Migration and backfill notes
- Edge Function updates in `supabase/functions/ai-tutor/`.

### 11. Ready-to-paste build request
"Build item B-08: AI Tutor Tool Call Server Transaction Engine. Deliver backend database execution logic in `supabase/functions/ai-tutor/tools.ts`, client UI synchronization in `AITutorChat.jsx`, and end-to-end integration tests."

---

# PART 4 - BUILD ORDER
1. **B-01: Server-Authoritative Gamification Rewards & XP System** (Foundation / Integrity)
2. **B-02: User Feedback Persistence & Backend Collection** (Core Data)
3. **B-04: Subscription Downgrade & Cancellation Handling** (Entitlements / Billing)
4. **B-06: Gems Store & Reward Redemption System** (Gamification Engine; depends on B-01)
5. **B-03: Edge Function Proxy for Google Calendar Sync** (Integrations)
6. **B-05: Account Data Export & Erasure Lifecycle** (Compliance / Lifecycle)
7. **B-07: Background Notification Nudges** (Background Services)
8. **B-08: AI Tutor Tool Call Server Transaction Engine** (AI Capabilities)

*Parallel tracks:* Items B-02, B-03, and B-04 can be built concurrently once B-01 is complete.

---

# PART 5 - CROSS-CUTTING BACKEND NEEDS
| Need | Status | Evidence |
|---|---|---|
| Row Level Security (RLS) | ✅ Exists | RLS enabled on all user data tables in `supabase/migrations/` |
| Auth & Route Protection | ✅ Exists | Supabase Auth JWT verification in components and Edge Functions |
| User Profile Auto-Creation | ✅ Exists | `on_auth_user_created` trigger in `016_fix_new_user_profile_trigger.sql` |
| Rate Limiting | ✅ Exists | `rateLimit.ts` in Edge Functions |
| Input Validation | ✅ Exists | `plannerSchema.js` (Zod) and `validators.ts` in Edge Functions |
| Server Secrets Handling | ✅ Exists | Secrets passed via environment variables to Deno Edge Functions |
| Realtime Subscriptions | ✅ Exists | Dynamic channel naming and cleanups across React components |
| Timezone Handling | ✅ Exists | Store timestamptz in UTC, user timezone stored on `profiles` |
| Moderation & Reporting | ✅ Exists | Safety reporting triggers and `community_reports` table |

---

# PART 6 - FOUNDER DECISIONS NEEDED
- ❓ **Item B-06 (Gems Store Inventory)**: Should gem store items (such as avatar frames or themes) remain purely aesthetic, or should freeze token purchases be capped at a max inventory count?
  - *Recommendation*: Cap max stored freeze tokens at 3 to preserve daily engagement incentives.

---

# PART 7 - BACKEND WITHOUT FRONTEND (reverse check)
- Table `streak_slipping`: Managed by database triggers for slipping streak calculation, but not directly queried by frontend components.

---

# APPENDIX A - COVERAGE LEDGER
| File | Reviewed | Finding IDs |
|---|---|---|
| `src/App.jsx` | Yes | None |
| `src/app/AITutorContext.jsx` | Yes | None |
| `src/app/Layout.jsx` | Yes | None |
| `src/app/ProfileContext.jsx` | Yes | None |
| `src/components/Auth/AuthLayout.jsx` | Yes | None |
| `src/components/Auth/LoginForm.jsx` | Yes | None |
| `src/components/Auth/Onboarding.jsx` | Yes | None |
| `src/components/Auth/SignupForm.jsx` | Yes | None |
| `src/components/Auth/callback/page.jsx` | Yes | None |
| `src/components/Community/AchievementsPage.jsx` | Yes | None |
| `src/components/Community/AskQuestionModal.jsx` | Yes | None |
| `src/components/Community/ChatInbox.jsx` | Yes | None |
| `src/components/Community/ChatThread.jsx` | Yes | None |
| `src/components/Community/ChooseUsernameCard.jsx` | Yes | None |
| `src/components/Community/ForumPostDetail.jsx` | Yes | None |
| `src/components/Community/FriendPicker.jsx` | Yes | None |
| `src/components/Community/GroupStudySessions.jsx` | Yes | None |
| `src/components/Community/HelpForum.jsx` | Yes | None |
| `src/components/Community/LeaderboardTab.jsx` | Yes | None |
| `src/components/Community/PeerTutors.jsx` | Yes | None |
| `src/components/Community/RequestJoinModal.jsx` | Yes | None |
| `src/components/Community/ResourceCard.jsx` | Yes | None |
| `src/components/Community/ResourcePicker.jsx` | Yes | None |
| `src/components/Community/SessionRoom.jsx` | Yes | None |
| `src/components/Community/StudyRoomsLobby.jsx` | Yes | None |
| `src/components/Community/UserProfilePage.jsx` | Yes | None |
| `src/components/Community/VirtualStudyRoom.jsx` | Yes | None |
| `src/components/Community/community.jsx` | Yes | None |
| `src/components/Dashboard/AISuggestions.jsx` | Yes | None |
| `src/components/Dashboard/AchievementsCard.jsx` | Yes | None |
| `src/components/Dashboard/AnalyticsDashboard.jsx` | Yes | None |
| `src/components/Dashboard/CommunitySpotlight.jsx` | Yes | None |
| `src/components/Dashboard/DashboardHeader.jsx` | Yes | None |
| `src/components/Dashboard/DashboardStatsBar.jsx` | Yes | None |
| `src/components/Dashboard/KeepsSlipping.jsx` | Yes | None |
| `src/components/Dashboard/Leaderboard.jsx` | Yes | None |
| `src/components/Dashboard/Overview.jsx` | Yes | None |
| `src/components/Dashboard/QuickActions.jsx` | Yes | None |
| `src/components/Dashboard/QuickShortcuts.jsx` | Yes | None |
| `src/components/Dashboard/RecentActivity.jsx` | Yes | None |
| `src/components/Dashboard/StudyStats.jsx` | Yes | None |
| `src/components/Dashboard/StudyStreak.jsx` | Yes | None |
| `src/components/Dashboard/UpcomingSession.jsx` | Yes | None |
| `src/components/Dashboard/WeakAreaCard.jsx` | Yes | None |
| `src/components/FAQ/FAQ.jsx` | Yes | None |
| `src/components/InstallPrompt.tsx` | Yes | None |
| `src/components/Layout/Sidebar.jsx` | Yes | None |
| `src/components/Library/Library.jsx` | Yes | None |
| `src/components/Notifications/NotificationCenter.jsx` | Yes | None |
| `src/components/Notifications/NotificationPromptCard.jsx` | Yes | None |
| `src/components/Notifications/NotificationsPage.jsx` | Yes | None |
| `src/components/Planner/Calendar.jsx` | Yes | None |
| `src/components/Planner/DeadlineManager.jsx` | Yes | None |
| `src/components/Planner/ExternalCalendarSync.jsx` | Yes | B-03 |
| `src/components/Planner/Planner.jsx` | Yes | None |
| `src/components/Planner/PlannerActivityModal.jsx` | Yes | None |
| `src/components/Planner/PlannerStatsBar.jsx` | Yes | None |
| `src/components/Planner/RecurringSetup.jsx` | Yes | None |
| `src/components/Planner/SessionScheduler.jsx` | Yes | None |
| `src/components/Planner/TimeBlocking.jsx` | Yes | None |
| `src/components/Progress/Progress.jsx` | Yes | None |
| `src/components/Settings/Billing.jsx` | Yes | B-04 |
| `src/components/Settings/NotificationSettings.jsx` | Yes | B-07 |
| `src/components/Settings/PaystackCheckoutButton.jsx` | Yes | None |
| `src/components/Settings/Settings.jsx` | Yes | B-05 |
| `src/components/Settings/SocraticStrictness.jsx` | Yes | None |
| `src/components/Study/NoteDetail.jsx` | Yes | None |
| `src/components/Study/StudyHistoryDetail.jsx` | Yes | None |
| `src/components/Study/StudyHome.jsx` | Yes | None |
| `src/components/Study/StudyPage.jsx` | Yes | None |
| `src/components/Study/input.jsx` | Yes | None |
| `src/components/Study/studyEnviron/AITutorChat.jsx` | Yes | B-08 |
| `src/components/Study/studyEnviron/Flashcards.jsx` | Yes | None |
| `src/components/Study/studyEnviron/NoteEditor.jsx` | Yes | None |
| `src/components/Study/studyEnviron/PlaceholderPage.jsx` | Yes | None |
| `src/components/Study/studyEnviron/PomodoroTimer.jsx` | Yes | None |
| `src/components/Study/studyEnviron/PracticeQuestions.jsx` | Yes | None |
| `src/components/Study/studyEnviron/ResourceAttachments.jsx` | Yes | None |
| `src/components/Study/studyEnviron/SessionControls.jsx` | Yes | None |
| `src/components/Study/studyEnviron/StudyCompanion.jsx` | Yes | None |
| `src/components/Study/studyEnviron/StudyEnvironment.jsx` | Yes | None |
| `src/components/Study/studyEnviron/StudySession.jsx` | Yes | None |
| `src/components/Study/studyEnviron/TypewriterText.jsx` | Yes | None |
| `src/components/common/Avatar.jsx` | Yes | None |
| `src/components/common/BottomNavBar.jsx` | Yes | None |
| `src/components/common/CollapsibleSection.jsx` | Yes | None |
| `src/components/common/ErrorBoundary.jsx` | Yes | None |
| `src/components/common/FeedbackDialog.jsx` | Yes | B-02 |
| `src/components/common/GlobalAITutorFab.jsx` | Yes | None |
| `src/components/common/LoadingCompanion.jsx` | Yes | None |
| `src/components/common/LumoAvatar.jsx` | Yes | None |
| `src/components/common/NotFound.jsx` | Yes | None |
| `src/components/common/PageContainer.jsx` | Yes | None |
| `src/components/common/ResourcePreviewModal.jsx` | Yes | None |
| `src/components/common/ResponsiveSheet.jsx` | Yes | None |
| `src/components/common/SplashScreen.jsx` | Yes | None |
| `src/components/common/TargetCursor.jsx` | Yes | None |
| `src/features/community/components/feed/ActivityFeed.jsx` | Yes | None |
| `src/features/community/components/feed/ActivityItem.jsx` | Yes | None |
| `src/features/community/components/feed/FeedFilters.jsx` | Yes | None |
| `src/features/community/components/friends/FriendList.jsx` | Yes | None |
| `src/features/community/components/friends/PendingRequests.jsx` | Yes | None |
| `src/features/community/components/friends/UserSearch.jsx` | Yes | None |
| `src/features/community/components/groups/CreateGroupModal.jsx` | Yes | None |
| `src/features/community/components/groups/GroupCard.jsx` | Yes | None |
| `src/features/community/components/groups/GroupDetail.jsx` | Yes | None |
| `src/features/community/components/groups/MemberList.jsx` | Yes | None |
| `src/features/community/components/leaderboard/LeaderboardPodium.jsx` | Yes | None |
| `src/features/community/components/leaderboard/LeaderboardTable.jsx` | Yes | None |
| `src/features/community/components/leaderboard/MetricTabs.jsx` | Yes | None |
| `src/features/community/components/leaderboard/PeriodTabs.jsx` | Yes | None |
| `src/features/community/components/leaderboard/ScopeTabs.jsx` | Yes | None |
| `src/features/community/components/leaderboard/YourRankCard.jsx` | Yes | None |
| `src/features/community/components/shared/EmptyState.jsx` | Yes | None |
| `src/features/community/components/shared/ErrorState.jsx` | Yes | None |
| `src/features/community/components/shared/ReportDialog.jsx` | Yes | None |
| `src/features/community/components/shared/SkeletonList.jsx` | Yes | None |
| `src/features/community/constants.ts` | Yes | None |
| `src/features/community/hooks/useActivityFeed.js` | Yes | None |
| `src/features/community/hooks/useFriends.js` | Yes | None |
| `src/features/community/hooks/useGroups.js` | Yes | None |
| `src/features/community/hooks/useLeaderboard.js` | Yes | None |
| `src/features/community/index.ts` | Yes | None |
| `src/features/community/services/feedService.js` | Yes | None |
| `src/features/community/services/friendsService.js` | Yes | None |
| `src/features/community/services/groupsService.js` | Yes | None |
| `src/features/community/services/leaderboardService.js` | Yes | None |
| `src/features/community/services/reportsService.js` | Yes | None |
| `src/features/community/types.ts` | Yes | None |
| `src/features/community/utils/rankUtils.js` | Yes | None |
| `src/features/gamification/components/CelebrationLayer.jsx` | Yes | None |
| `src/features/gamification/components/DailyGoalRing.jsx` | Yes | None |
| `src/features/gamification/components/GemWallet.jsx` | Yes | B-06 |
| `src/features/gamification/components/LevelProgress.jsx` | Yes | None |
| `src/features/gamification/components/QuestList.jsx` | Yes | None |
| `src/features/gamification/components/XpToast.jsx` | Yes | None |
| `src/features/gamification/config.js` | Yes | None |
| `src/features/gamification/hooks/useCelebrations.js` | Yes | None |
| `src/features/gamification/hooks/useGamification.js` | Yes | None |
| `src/features/gamification/index.js` | Yes | None |
| `src/features/gamification/services/gamificationService.js` | Yes | None |
| `src/features/gamification/utils/levelCurve.js` | Yes | None |
| `src/features/groups/groupsApi.js` | Yes | None |
| `src/features/groups/useExploreGroups.js` | Yes | None |
| `src/features/groups/useGroupActions.js` | Yes | None |
| `src/features/groups/useGroupOverview.js` | Yes | None |
| `src/features/groups/useMyGroups.js` | Yes | None |
| `src/hooks/useCombinedSessions.js` | Yes | None |
| `src/hooks/useInAppNotifications.js` | Yes | None |
| `src/hooks/useLeaderboard.js` | Yes | None |
| `src/hooks/useNotifications.js` | Yes | None |
| `src/hooks/usePlanner.js` | Yes | None |
| `src/hooks/useSlippingSessions.js` | Yes | None |
| `src/hooks/useStreak.js` | Yes | None |
| `src/hooks/useStudySession.js` | Yes | None |
| `src/lib/accessibility.js` | Yes | None |
| `src/lib/aiActionRegistry.js` | Yes | None |
| `src/lib/aiTutor.js` | Yes | B-08 |
| `src/lib/authErrors.js` | Yes | None |
| `src/lib/collaboration.js` | Yes | None |
| `src/lib/communityChat.js` | Yes | None |
| `src/lib/educationLevel.js` | Yes | None |
| `src/lib/gamification.js` | Yes | B-01 |
| `src/lib/googleCalendarSync.js` | Yes | B-03 |
| `src/lib/leaderboardUtils.js` | Yes | None |
| `src/lib/learnerType.js` | Yes | None |
| `src/lib/learningStyle.js` | Yes | None |
| `src/lib/lumoPrompts.js` | Yes | None |
| `src/lib/notifications.js` | Yes | B-07 |
| `src/lib/plannerSchema.js` | Yes | None |
| `src/lib/plannerUtils.js` | Yes | None |
| `src/lib/preferredTime.js` | Yes | None |
| `src/lib/primaryGoal.js` | Yes | None |
| `src/lib/push.js` | Yes | B-07 |
| `src/lib/sanitizePartialMarkdown.js` | Yes | None |
| `src/lib/sessionService.js` | Yes | B-01 |
| `src/lib/streaks.js` | Yes | None |
| `src/lib/streaksCore.js` | Yes | None |
| `src/lib/studyDays.js` | Yes | None |
| `src/lib/supabase.js` | Yes | None |
| `src/lib/userSubjects.js` | Yes | None |
| `src/lib/weeklyHours.js` | Yes | None |
| `src/main.jsx` | Yes | None |

---

# APPENDIX B - SCHEMA DRIFT (repo vs live)
Live database connection is not accessible in this offline audit environment. Audit findings are derived by directly inspecting database migrations (`supabase/migrations/` and `supabase/*.sql`) against frontend data access queries.
