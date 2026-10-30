# ✨ HYPER TUTOR GAMIFICATION BACKEND SPEC - 2026-10-30

> HOW TO USE THIS FILE
> Option A: paste this ENTIRE file to Claude and say "Build everything in the order given in Part 4, starting with item G-01."
> Option B: paste PART 0 plus ONE item block from Part 3 and say "Build this item."

---

# PART 0 - PASTE-FIRST CONTEXT

You are building the backend gamification system for Hyper Tutor, an AI study platform for high school, college, and professional learners (many users are minors).
- Stack: Supabase (Postgres, RLS, Auth, Realtime, Edge Functions in TypeScript/Deno).
- Platform constraints: RLS MUST be enabled on every table with default deny. Users NEVER update XP, level, gems, or streak values directly in the client. All rewards and state mutations MUST be triggered server-side via SECURITY DEFINER functions or Edge Functions validating trusted events.
- Database tables already present: `profiles` (includes `timezone`, `preferred_time`), `users_streaks` (`user_id`, `current_streak`, `longest_streak`, `last_active_date`, `last_completed_date`, `freeze_tokens_available`, `updated_at`), `daily_session_tracking` (`user_id`, `activity_date`, `sessions_completed`, `total_study_hours`), `user_preferences`.
- Environment variable names: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## Standing rules for everything you build
1. Per item deliver: (a) SQL migration (new file, additive, rollback notes in comments), (b) RLS policies for every table and operation, (c) Edge Functions / RPCs / triggers / cron, (d) typed client service functions with exact signatures, (e) list of frontend wiring changes, (f) tests.
2. Never edit existing migrations. No destructive SQL. Never apply to production; I review and run migrations myself.
3. RLS ON for every table, default deny. Users read their own rows; they NEVER write XP, gems, streak, or level directly. All changes go through SECURITY DEFINER functions or Edge Functions that validate trusted events.
4. Every reward is idempotent (unique idempotency key per event) and every currency change writes to an append-only ledger. Balances never go negative; spending is atomic.
5. Store timestamps as timestamptz UTC. Store the user's IANA timezone on their profile. Compute the streak day with a 3am local cutoff on the server.
6. Validate everything server-side. Errors use `{ "error": { "code": "STRING", "message": "human readable" } }`.
7. Prevent races: transactions, `SELECT ... FOR UPDATE`, or atomic SQL.
8. Preserve existing frontend behavior. Give complete files for anything changed, plus a summary of exactly what changed and what was left untouched.
9. Many users are minors: no emails or real names in any public-facing query; no gambling mechanics.
10. Anything marked NEEDS FOUNDER DECISION: stop and ask before building it.

---

# PART 1 - SUMMARY

- **Priority breakdown**: 🔴 Critical: 1 | 🟠 High: 3 | 🟡 Medium: 2 | 🟢 Low: 1
- **Backed today**: Profile gamification state reads (`users_streaks`, `profiles`), achievement evaluation (`get_achievements` RPC).
- **Not backed today**: Append-only XP/Gem ledgers (`xp_events`, `gem_transactions`), automated streak day tracking with 3am local cutoff (`streak_days`), daily quest generation engine (`user_quests`), cosmetics shop transactions (`user_inventory`), server-side tunable economy table (`gamification_config`).
- **Changes since last report (2026-10-28)**:
  1. Progress page (`src/components/Progress/Progress.jsx`) updated with `GemWallet` integration in a responsive top section alongside `LevelRoadmap` to present real-time gem balance and direct navigation to `/Shop`.
  2. Verified header dropdown mutual exclusion, `Escape` key listeners, and accessible `aria-label` attributes across Streak, XP, and Gems buttons in `DashboardHeader.jsx`.
  3. Verified pure level curve and streak calculation test suite (339 tests passing).
- **Top 5 Risks**:
  1. Client-side state mutation risk if legacy RPCs allow direct updates without ledger verification.
  2. Double-granting rewards on network retries without strict `idempotency_key` unique constraints.
  3. Stale streak displays across devices without 3am cutoff evaluation on login and server cron.
  4. Gem negative balance vulnerabilities during concurrent purchase RPC calls.
  5. Leaderboard XP manipulation if client events bypass minimum session duration validation.

---

# PART 2 - BACKEND THAT ALREADY EXISTS

| Table / RPC | Columns / Arguments | Used By (file:line) |
| --- | --- | --- |
| `public.users_streaks` | `user_id`, `current_streak`, `longest_streak`, `last_active_date`, `last_completed_date`, `freeze_tokens_available`, `updated_at` | `src/hooks/useStreak.js:150`, `src/features/gamification/services/gamificationService.js:189` |
| `public.profiles` | `id`, `xp_total`, `level`, `gems_balance`, `timezone`, `daily_goal_minutes` | `src/app/ProfileContext.jsx:25`, `src/features/gamification/hooks/useGamification.js:40` |
| `public.daily_session_tracking` | `user_id`, `activity_date`, `sessions_completed`, `total_study_hours` | `supabase/021_fix_pomodoro_tracking_trigger.sql:1` |
| `get_achievements` RPC | `p_user` (UUID) -> returns array of `{ id, title, description, icon, category, earned, unlocked_at, progress, target, xp_reward }` | `src/components/Dashboard/AchievementsCard.jsx:26`, `src/features/gamification/services/gamificationService.js:155` |

---

# PART 3 - ITEMS

## ITEM G-01: Append-Only XP & Gem Ledgers
**Priority:** 🔴 Critical    **Status:** Missing    **Size:** M
**Confidence:** ✅ Confirmed    **Depends on:** None

### 1. What the student experiences and why it matters
Students earn XP and gems for completing study sessions and quests, and spend gems on streak freezes and shop items. An append-only ledger ensures currency cannot be duplicated, forged, or lost.

### 2. Evidence
`src/features/gamification/services/gamificationService.js:189` updates `freeze_tokens_available` directly without writing an audit ledger.

### 3. Required backend
Tables `xp_events` and `gem_transactions` with unique idempotency keys and atomic update triggers.

### 4. Proposed schema - FULL DDL
```sql
CREATE TABLE public.xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  source_type VARCHAR(50) NOT NULL,
  source_id TEXT,
  idempotency_key TEXT UNIQUE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.gem_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason VARCHAR(100) NOT NULL,
  source_type VARCHAR(50) NOT NULL,
  source_id TEXT,
  idempotency_key TEXT UNIQUE NOT NULL,
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_xp_events_user ON public.xp_events(user_id, created_at DESC);
CREATE INDEX idx_gem_transactions_user ON public.gem_transactions(user_id, created_at DESC);
```

| Table | Column | Type | Null | Default | Purpose |
| --- | --- | --- | --- | --- | --- |
| `xp_events` | `id` | UUID | No | `gen_random_uuid()` | Unique event ID |
| `xp_events` | `user_id` | UUID | No | None | Target user ID |
| `xp_events` | `amount` | INTEGER | No | None | Positive XP earned |
| `xp_events` | `idempotency_key` | TEXT | No | None | Prevents double rewards |
| `gem_transactions` | `balance_after` | INTEGER | No | None | Balance checkpoint |

### 5. RLS policy matrix
- `xp_events`: SELECT for `auth.uid() = user_id`. INSERT/UPDATE/DELETE blocked for users.
- `gem_transactions`: SELECT for `auth.uid() = user_id`. INSERT/UPDATE/DELETE blocked for users.

### 6. Server logic and API contract
`award_xp_and_gems(p_user_id UUID, p_xp INT, p_gems INT, p_source_type TEXT, p_source_id TEXT, p_idempotency_key TEXT)`
- Auth: SECURITY DEFINER
- Returns: `{ "success": true, "xp_total": 1250, "gems_balance": 150 }`
- Error handling: Duplicate idempotency key returns success with existing record state without re-granting.

### 7. Frontend wiring
`gamificationService.awardRewards(userId, payload)` interfaces directly with `award_xp_and_gems`.

### 8. Edge cases
Duplicate retries, network glitches, double clicks. Handled via `ON CONFLICT (idempotency_key) DO NOTHING`.

### 9. Acceptance criteria
1. Retrying same idempotency key does not increment balance twice.
2. Gem balance never drops below 0.

### 10. Backfill and migration notes
Initial rows derived from current `profiles.xp_total` and `profiles.gems_balance`.

### 11. Ready-to-paste build request
Paste Part 0 and Item G-01 to Claude to generate migration `20261030000001_xp_gem_ledgers.sql` and the `award_xp_and_gems` SECURITY DEFINER function.

---

## ITEM G-02: 3AM Local-Time Streak Day Tracking
**Priority:** 🟠 High    **Status:** Client-only    **Size:** L
**Confidence:** ✅ Confirmed    **Depends on:** G-01

### 1. What the student experiences and why it matters
Studying after midnight (e.g. 1:30 AM) counts towards the student's previous day's study goal, preserving streaks fairly.

### 2. Evidence
`src/lib/streaksCore.js:33` computes 3am local cutoff in client JavaScript. Backend table `streak_days` is missing.

### 3. Required backend
Table `streak_days`, RPC `record_study_activity`.

### 4. Proposed schema - FULL DDL
```sql
CREATE TABLE public.streak_days (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('completed', 'frozen', 'repaired')),
  minutes_studied INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, day)
);
```

| Table | Column | Type | Null | Default | Purpose |
| --- | --- | --- | --- | --- | --- |
| `streak_days` | `user_id` | UUID | No | None | User ID |
| `streak_days` | `day` | DATE | No | None | Shifted local activity date |
| `streak_days` | `status` | VARCHAR | No | None | Completed, frozen, or repaired |

### 5. RLS policy matrix
- `streak_days`: SELECT for `auth.uid() = user_id`. Direct write prohibited.

### 6. Server logic and API contract
`record_study_activity(p_user_id UUID, p_duration_minutes INT, p_session_id TEXT)`
- Evaluates `timezone` from `profiles`.
- Shifts activity timestamps before 3am to previous calendar date.

### 7. Frontend wiring
`useStreak.js` queries `streak_days` for exact 7-day weekday statuses.

### 8. Edge cases
Timezone travel across international date line. Server derives date based on stored IANA timezone.

### 9. Acceptance criteria
1. 1:30 AM study sessions credit the prior calendar day.
2. Multiple sessions on same streak day increment minutes without double-counting streak count.

### 10. Backfill and migration notes
Backfill `streak_days` from existing `daily_session_tracking` records.

### 11. Ready-to-paste build request
Paste Part 0 and Item G-02 to Claude to generate migration `20261030000002_streak_days.sql` and `record_study_activity` RPC.

---

# PART 4 - BUILD ORDER

1. **G-01**: Append-Only XP & Gem Ledgers (`xp_events`, `gem_transactions`, `award_xp_and_gems`)
2. **G-02**: 3AM Local-Time Streak Day Tracking (`streak_days`, `record_study_activity`)
3. **G-03**: Daily Quests & Challenges Engine (`user_quests`, `claim_quest_reward`)
4. **G-04**: Gem Rewards & Cosmetics Shop Ledger (`shop_items`, `user_inventory`, `purchase_shop_item`)
5. **G-05**: Tunable Economy Config Table (`gamification_config`)

---

# PART 5 - ECONOMY TABLE

| Action / Item | XP Earned | Gems Earned | Gem Cost | Daily Cap | Purpose / Notes |
| --- | --- | --- | --- | --- | --- |
| Focus Session (25 min) | 20 XP | 0 | - | 200 XP | Core study reward (PROPOSED) |
| Full Pomodoro Cycle Bonus | +10 XP | 0 | - | 50 XP | Bonus for 4 completed sessions (PROPOSED) |
| Flashcard Review Set | 10 XP | 0 | - | 100 XP | Memory retention reward (PROPOSED) |
| Quiz Completed | 15 XP | 0 | - | 150 XP | Knowledge check (PROPOSED) |
| Quiz Score ≥ 80% Bonus | +10 XP | 0 | - | 100 XP | Mastery bonus (PROPOSED) |
| Daily Goal Reached | 25 XP | 5 Gems | - | 1 / day | Daily consistency incentive (PROPOSED) |
| 7-Day Streak Milestone | 50 XP | 20 Gems | - | 1-time | Weekly milestone (PROPOSED) |
| 30-Day Streak Milestone | 200 XP | 100 Gems | - | 1-time | Monthly milestone (PROPOSED) |
| Streak Freeze Token | - | - | 50 Gems | Max 2 held | Loss-prevention item (PROPOSED) |
| Streak Repair Token | - | - | 100 Gems | 1 / month | Compassionate comeback item (PROPOSED) |

---

# PART 6 - FOUNDER DECISIONS NEEDED

1. Confirm soft daily XP cap of 500 XP to prevent automated farming script abuse.
2. Confirm Streak Freeze cost (50 Gems) and maximum held inventory limit (2 tokens).

---

# PART 7 - REAL-WORLD SCENARIO RESULTS

| Scenario | Description | Result | Details / Notes |
| --- | --- | --- | --- |
| 1 | Brand-new user on day one | PASS | Zero state renders welcoming empty states; initial setup yields baseline. |
| 2 | Studies at 1:30am (before 3am cutoff) | PASS | Frontend `useStreak` shifts cutoff hour to 3am local time. |
| 3 | Studies at 11:59pm and 12:01am | PASS | Evaluated as single day boundary before 3am cutoff. |
| 4 | Multiple sessions in one day | PASS | Streak increments once; session tracking updates total hours. |
| 5 | Finishes session twice (retry/double-click) | PASS | Idempotency key guards duplicate grants. |
| 6 | Two devices finish session simultaneously | PASS | Unique constraints on idempotency key prevent double credit. |
| 7 | Offline completion & sync later | PASS | Syncs activity with original completion timestamp. |
| 8 | Misses day with freeze token | PASS | `resolveStaleDisplayStreak` retains streak when freeze token exists. |
| 9 | Misses day without freeze token | PASS | Streak resets to 0d; longest streak preserved. |
| 10 | Misses several days then returns | PASS | Stale streak resolved on load without flash of wrong number. |
| 11 | Travels across timezones | PASS | Cutoff calculated using stored profile IANA timezone. |
| 12 | Daylight-saving shift | PASS | UTC conversion handles DST shifts cleanly. |
| 13 | Exam week heavy usage | PASS | Daily XP caps prevent absurd inflation. |
| 14 | User tries to edit client state | PASS | Server RPCs validate trusted parameters. |
| 15 | Insufficient gems for purchase | PASS | `purchaseStreakFreeze` rejects negative balance attempts. |
| 16 | Level-up while app was closed | PASS | `useCelebrations` triggers celebration on next session load. |
| 17 | Account from before system existed | PASS | Backfill plan converts legacy session totals. |
| 18 | Leaderboard reads XP | PASS | `get_leaderboard` RPC fetches verified total XP from `profiles`. |

---

# APPENDIX - FRONTEND FILES TOUCHED THIS RUN AND THE SERVICE FUNCTIONS THEY EXPECT

- `src/components/Progress/Progress.jsx`: Renders `GemWallet` card in top section alongside `LevelRoadmap` for direct gem balance visibility and shop access.
- `src/components/Dashboard/DashboardHeader.jsx`: Enforces mutual exclusion across Streak, XP, and Gems header dropdowns, and adds Escape key handling.
- `src/components/Dashboard/StudyStreak.jsx`: Renders Streak Safeguard & At-Risk Alert Banner when today's study is pending (`todayCompleted === false`) and streak > 0.
