import re

with open('docs/backend-gaps/BACKEND_GAPS_2026-10-30.md', 'r') as f:
    text = f.read()

# Replacement for B-04
b04_full = '''## ITEM B-04: Subscription Downgrade & Cancellation Handling

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
'''

# Replacement for B-05
b05_full = '''## ITEM B-05: Account Data Export & Erasure Lifecycle (GDPR)

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
'''

# Replacement for B-06
b06_full = '''## ITEM B-06: Gems Store Ledger & Reward Redemption System

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
'''

# Replacement for B-07
b07_full = '''## ITEM B-07: Background Notification Nudges (Streak-at-Risk & No-Login)

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
'''

# Replacement for B-08
b08_full = '''## ITEM B-08: AI Tutor Tool Call Server Transaction Engine

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
'''

# Replace in text
text = re.sub(r'## ITEM B-04: Subscription Downgrade & Cancellation Handling.*?(?=## ITEM B-05:|\Z)', b04_full + '\n', text, flags=re.DOTALL)
text = re.sub(r'## ITEM B-05: Account Data Export & Erasure Lifecycle \(GDPR\).*?(?=## ITEM B-06:|\Z)', b05_full + '\n', text, flags=re.DOTALL)
text = re.sub(r'## ITEM B-06: Gems Store Ledger & Reward Redemption System.*?(?=## ITEM B-07:|\Z)', b06_full + '\n', text, flags=re.DOTALL)
text = re.sub(r'## ITEM B-07: Background Notification Nudges \(Streak-at-Risk & No-Login\).*?(?=## ITEM B-08:|\Z)', b07_full + '\n', text, flags=re.DOTALL)
text = re.sub(r'## ITEM B-08: AI Tutor Tool Call Server Transaction Engine.*?(?=\n# PART 4|\Z)', b08_full + '\n', text, flags=re.DOTALL)

with open('docs/backend-gaps/BACKEND_GAPS_2026-10-30.md', 'w') as f:
    f.write(text)

print("Report updated successfully.")
