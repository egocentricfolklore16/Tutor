# ✨ HYPER TUTOR GAMIFICATION BACKEND SPEC - 2026-10-17

> HOW TO USE THIS FILE
> Option A: paste this ENTIRE file to Claude and say "Build everything in the order given in Part 4, starting with item G-01."
> Option B: paste PART 0 plus ONE item block from Part 3 and say "Build this item."

---

# PART 0 - PASTE-FIRST CONTEXT

**Role & Platform Constraints**:
Hyper Tutor is an AI study platform for high schoolers, college students, and working professionals (many are minors).
- Tech Stack: Supabase (Auth, Postgres RLS, Realtime, Edge Functions), React, Tailwind CSS.
- Security: RLS enabled on all tables, default deny. Client NEVER updates XP, gems, or streak values directly in DB tables.
- Currency & Rewards: Append-only ledgers for XP and Gems. Idempotency keys enforced on every reward event. Negative currency balances strictly forbidden.
- Streaks & Timezones: Day boundaries calculated server-side using 3am local-time cutoff based on user's IANA timezone (`profiles.timezone`).
- Error Handling: Standardized JSON format `{ "error": { "code": "STRING", "message": "human readable" } }`.

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

- Total Items: 6 (G-01 to G-06)
- Priority Breakdown: 🔴 Critical: 2 | 🟠 High: 2 | 🟡 Medium: 2
- Currently Backed: `users_streaks`, basic `award_user_rewards` RPC (partial, direct profile fallback present).
- Not Backed: `xp_events` ledger, `gem_transactions` ledger, `streak_days` table, `badges`/`user_badges`, `quests`/`user_quests`.
- Top Risks: Direct client updates to `profiles.xp_points` / `profiles.gems` bypass server authority; missing unique idempotency constraint on session rewards allows farming.
- Changes Since Last Report: Second version of gamification backend spec generated on 2026-10-17 accompanying the unified Celebration System and gamification UI component additions (`CelebrationLayer`, `LevelProgress`, `GemWallet`, `DailyGoalRing`).

---

# PART 2 - BACKEND THAT ALREADY EXISTS (do not rebuild)

| Table / RPC | Columns / Purpose | Used By (file:line) |
| --- | --- | --- |
| `users_streaks` | `user_id`, `current_streak`, `longest_streak`, `freeze_tokens`, `last_completed_date`, `last_active_date` | `src/hooks/useStreak.js:129` |
| `profiles` | `xp_points`, `gems`, `timezone` | `src/app/ProfileContext.jsx:45` |
| `award_user_rewards` RPC | `activity_user_id`, `xp_amount`, `gems_amount` | `src/lib/gamification.js:43` |
| `record_study_activity` RPC | `p_user_timezone`, `p_cutoff_hour` | `src/hooks/useStreak.js:255` |

---

# PART 3 - ITEMS

## ITEM G-01: XP Append-Only Ledger & Server Authority (`xp_events`)
**Priority:** 🔴 Critical    **Status:** Missing    **Size:** M
**Confidence:** ✅ Confirmed    **Depends on:** None

### 1. What the student experiences and why it matters
Students earn XP predictably for real learning effort. They can see their XP growth history without double-counted XP or cheated values.

### 2. Evidence and what the UI is already waiting for
`src/lib/gamification.js:72` falls back to direct client `supabase.from('profiles').update({ xp_points })`, which allows students to write arbitrary XP in client console.

### 3. Required backend
Table `xp_events` with UNIQUE idempotency key constraint, Postgres trigger to automatically increment `profiles.xp_points` and re-calculate level.

### 4. Proposed schema - FULL DDL
```sql
CREATE TABLE IF NOT EXISTS public.xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  source_type TEXT NOT NULL,
  source_id TEXT,
  idempotency_key TEXT UNIQUE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_events_user_id ON public.xp_events(user_id);
```

| Table | Column | Type | Null | Default | Purpose |
| --- | --- | --- | --- | --- | --- |
| `xp_events` | `id` | UUID | No | `gen_random_uuid()` | Primary Key |
| `xp_events` | `user_id` | UUID | No | None | FK to `auth.users` |
| `xp_events` | `amount` | INTEGER | No | None | Positive XP awarded |
| `xp_events` | `source_type` | TEXT | No | None | Activity type (e.g., 'pomodoro') |
| `xp_events` | `source_id` | TEXT | Yes | NULL | External ID |
| `xp_events` | `idempotency_key` | TEXT | No | None | Unique key preventing duplicates |
| `xp_events` | `metadata` | JSONB | Yes | `'{}'` | Contextual details |
| `xp_events` | `created_at` | TIMESTAMPTZ | No | `NOW()` | Audit timestamp |

### 5. RLS policy matrix
```sql
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own XP ledger"
  ON public.xp_events FOR SELECT
  USING (auth.uid() = user_id);
```

### 6. Server logic and API contract
RPC `record_xp_event(p_amount INT, p_source_type TEXT, p_source_id TEXT, p_idempotency_key TEXT)`:
- Validates auth.uid()
- Inserts row into `xp_events`
- On idempotency conflict (`ON CONFLICT (idempotency_key) DO NOTHING`), returns existing balance safely.

### 7. Frontend wiring
Call `gamificationService.awardRewards` via RPC `record_xp_event`. Delete direct fallback table update in `src/lib/gamification.js:63-75`.

### 8. Edge cases
Concurrent sessions across devices generate identical idempotency key `${userId}_${sourceType}_${sourceId}`, ensuring only one succeeds.

### 9. Acceptance criteria
1. Happy path: XP inserted, profile updated.
2. Duplicate call with same idempotency key returns HTTP 200/success without adding XP.

### 10. Backfill and migration notes
Seed `xp_events` with initial event for existing `profiles.xp_points` balance.

### 11. Ready-to-paste build request
Build Item G-01: Create the `xp_events` append-only ledger table with unique idempotency keys and RLS policies. Expose `record_xp_event` RPC to eliminate direct client `profiles.xp_points` updates.

---

## ITEM G-02: Gem Append-Only Ledger & Spending Atomic Operations (`gem_transactions`)
**Priority:** 🔴 Critical    **Status:** Missing    **Size:** M
**Confidence:** ✅ Confirmed    **Depends on:** None

### 1. What the student experiences and why it matters
Gems earned from completing daily goals or streak milestones are saved reliably in a wallet. Spending gems for streak freezes is atomic and cannot result in negative balances.

### 2. Evidence and what the UI is already waiting for
`src/lib/gamification.js:68` performs direct client subtraction/addition of `gems`.

### 3. Required backend
Table `gem_transactions` storing signed integer balance changes with atomic RPC `spend_gems`.

### 4. Proposed schema - FULL DDL
```sql
CREATE TABLE IF NOT EXISTS public.gem_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- positive for earn, negative for spend
  reason TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT,
  idempotency_key TEXT UNIQUE NOT NULL,
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gem_tx_user_id ON public.gem_transactions(user_id);
```

| Table | Column | Type | Null | Default | Purpose |
| --- | --- | --- | --- | --- | --- |
| `gem_transactions` | `id` | UUID | No | `gen_random_uuid()` | Primary Key |
| `gem_transactions` | `user_id` | UUID | No | None | FK to `auth.users` |
| `gem_transactions` | `amount` | INTEGER | No | None | Signed gem delta |
| `gem_transactions` | `reason` | TEXT | No | None | Transaction explanation |
| `gem_transactions` | `idempotency_key` | TEXT | No | None | Unique constraint |
| `gem_transactions` | `balance_after` | INTEGER | No | None | Resulting balance (>= 0) |

### 5. RLS policy matrix
```sql
ALTER TABLE public.gem_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own gem transactions"
  ON public.gem_transactions FOR SELECT
  USING (auth.uid() = user_id);
```

### 6. Server logic and API contract
RPC `spend_gems(p_amount INT, p_reason TEXT, p_idempotency_key TEXT)`:
- Performs `SELECT gems FROM profiles WHERE user_id = auth.uid() FOR UPDATE;`
- Rejects with `INSUFFICIENT_GEMS` if current balance < p_amount.
- Inserts negative transaction and updates `profiles.gems`.

### 7. Frontend wiring
Used by `src/features/gamification/services/gamificationService.js`.

### 8. Edge cases
Rapid double-clicking on "Buy Streak Freeze" triggers idempotency key check or atomic balance rejection on second attempt.

### 9. Acceptance criteria
1. Attempting to spend more gems than balance throws error `INSUFFICIENT_GEMS`.
2. Concurrent spends are safely serialized with `FOR UPDATE`.

### 10. Backfill and migration notes
Insert initial credit row for pre-existing `profiles.gems` values.

### 11. Ready-to-paste build request
Build Item G-02: Create `gem_transactions` table with atomic spending function `spend_gems` and FOR UPDATE locking to prevent negative gem balances and double-spend race conditions.

---

## ITEM G-03: Detailed 7-Day Streak Days & Freeze Ledger (`streak_days`)
**Priority:** 🟠 High    **Status:** Partial    **Size:** M
**Confidence:** ✅ Confirmed    **Depends on:** None

### 1. What the student experiences and why it matters
Students see an accurate 7-day row in their streak dropdown showing completed fire icons, blue freeze snowflakes, or missed days relative to their 3am local day cutoff.

### 2. Evidence and what the UI is already waiting for
`src/hooks/useStreak.js:129` queries `users_streaks` table for streak metadata, but 7-day state is computed with pure client helpers (`computeWeekDays`).

### 3. Required backend
Table `streak_days` with `PRIMARY KEY (user_id, local_date)`.

### 4. Proposed schema - FULL DDL
```sql
CREATE TABLE IF NOT EXISTS public.streak_days (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'frozen', 'repaired', 'missed')),
  minutes_studied INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, local_date)
);
```

| Table | Column | Type | Null | Default | Purpose |
| --- | --- | --- | --- | --- | --- |
| `streak_days` | `user_id` | UUID | No | None | FK to `auth.users` |
| `streak_days` | `local_date` | DATE | No | None | Local date string under 3am cutoff |
| `streak_days` | `status` | TEXT | No | None | 'completed', 'frozen', 'repaired' |
| `streak_days` | `minutes_studied` | INT | Yes | 0 | Total minutes for that local day |

### 5. RLS policy matrix
```sql
ALTER TABLE public.streak_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own streak days"
  ON public.streak_days FOR SELECT
  USING (auth.uid() = user_id);
```

### 6. Server logic and API contract
Automatically inserted/updated by server-side `record_study_activity` RPC upon session completion.

### 7. Frontend wiring
Consumed in `src/hooks/useStreak.js`.

### 8. Edge cases
Timezone travel or DST shifts store dates as strict `DATE` ISO strings computed under local timezone 3am cutoff.

### 9. Acceptance criteria
1. Completing activity records row with `status = 'completed'`.
2. Querying range returns exact historical status for each day.

### 10. Backfill and migration notes
None required.

### 11. Ready-to-paste build request
Build Item G-03: Create `streak_days` table with composite primary key `(user_id, local_date)` and populate it inside `record_study_activity`.

---

## ITEM G-04: Daily Quests Engine (`quests` & `user_quests`)
**Priority:** 🟠 High    **Status:** Missing    **Size:** L
**Confidence:** 🟡 Probable    **Depends on:** G-01, G-02

### 1. What the student experiences and why it matters
Students receive 2-3 small daily study quests ("Finish 1 Pomodoro session", "Review 10 flashcards") that reset daily, giving clear short-term focus and gem rewards.

### 2. Evidence and what the UI is already waiting for
`src/features/gamification/config.js` defines `features.dailyQuests = false` awaiting server implementation.

### 3. Required backend
Tables `quest_definitions` and `user_quests` with daily cron or on-login assignment RPC `get_or_assign_daily_quests`.

### 4. Proposed schema - FULL DDL
```sql
CREATE TABLE IF NOT EXISTS public.quest_definitions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_count INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL,
  gem_reward INTEGER NOT NULL,
  quest_type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL REFERENCES public.quest_definitions(id),
  assigned_date DATE NOT NULL,
  current_progress INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  UNIQUE(user_id, quest_id, assigned_date)
);
```

### 5. RLS policy matrix
```sql
ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own quests"
  ON public.user_quests FOR SELECT
  USING (auth.uid() = user_id);
```

### 6. Server logic and API contract
RPC `claim_quest_reward(p_user_quest_id UUID)`:
- Verifies `completed_at IS NOT NULL` and `claimed_at IS NULL`.
- Calls `record_xp_event` and gem deposit in ONE transaction.
- Sets `claimed_at = NOW()`.

### 7. Frontend wiring
Wire `gamificationService.getQuests()` and enable flag `features.dailyQuests = true` in `src/features/gamification/config.js`.

### 8. Edge cases
Attempting to claim an uncompleted quest returns HTTP 400 `QUEST_NOT_COMPLETED`.

### 9. Acceptance criteria
1. Quests assign automatically per local day.
2. Claiming awards XP and gems exactly once.

### 10. Backfill and migration notes
Insert initial 5 seed rows into `quest_definitions`.

### 11. Ready-to-paste build request
Build Item G-04: Create `quest_definitions` and `user_quests` tables, quest assignment logic, and `claim_quest_reward` RPC.

---

## ITEM G-05: Badges and Achievement Unlocks (`badges` & `user_badges`)
**Priority:** 🟡 Medium    **Status:** Partial    **Size:** M
**Confidence:** ✅ Confirmed    **Depends on:** G-01, G-02

### 1. What the student experiences and why it matters
Students unlock achievement badges (First Session, 7-Day Streak, 100 Flashcards) and celebrate milestones with gem rewards.

### 2. Evidence and what the UI is already waiting for
`src/components/Community/AchievementsPage.jsx` renders static or partial achievement cards.

### 3. Required backend
Tables `badges` and `user_badges` with unlock RPC `unlock_badge_if_eligible`.

### 4. Proposed schema - FULL DDL
```sql
CREATE TABLE IF NOT EXISTS public.badges (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  category TEXT NOT NULL,
  gem_reward INTEGER NOT NULL DEFAULT 15
);

CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_code TEXT NOT NULL REFERENCES public.badges(code),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_code)
);
```

### 5. RLS policy matrix
```sql
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own unlocked badges"
  ON public.user_badges FOR SELECT
  USING (auth.uid() = user_id);
```

### 6. Server logic and API contract
Triggered automatically on activity recording or streak milestone events.

### 7. Frontend wiring
Rendered on `/achievements` and `AchievementsCard.jsx`.

### 8. Edge cases
Duplicate unlocks ignored via `PRIMARY KEY (user_id, badge_code)`.

### 9. Acceptance criteria
1. Meeting criteria inserts row in `user_badges` and awards gem bonus.

### 10. Backfill and migration notes
Seed core badge definitions in `badges`.

### 11. Ready-to-paste build request
Build Item G-05: Create `badges` and `user_badges` tables with automatic unlock triggers.

---

## ITEM G-06: Tunable Economy Configuration Table (`gamification_config`)
**Priority:** 🟡 Medium    **Status:** Missing    **Size:** S
**Confidence:** ✅ Confirmed    **Depends on:** None

### 1. What the student experiences and why it matters
Platform administrators can tune XP amounts and gem costs (e.g. for exam week events) without redeploying backend code.

### 2. Evidence and what the UI is already waiting for
`src/features/gamification/config.js` contains hardcoded PROPOSED constants.

### 3. Required backend
Table `gamification_config` storing key-value pairs for XP multipliers and costs.

### 4. Proposed schema - FULL DDL
```sql
CREATE TABLE IF NOT EXISTS public.gamification_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

| Table | Column | Type | Null | Default | Purpose |
| --- | --- | --- | --- | --- | --- |
| `gamification_config` | `key` | TEXT | No | None | Parameter key name |
| `gamification_config` | `value` | JSONB | No | None | Parameter JSON payload |

### 5. RLS policy matrix
```sql
ALTER TABLE public.gamification_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read gamification config"
  ON public.gamification_config FOR SELECT
  TO authenticated
  USING (true);
```

### 6. Server logic and API contract
Read by RPCs and Edge Functions during reward calculations.

### 7. Frontend wiring
Fetched by `gamificationService` on app init.

### 8. Edge cases
Missing config keys fall back to hardcoded defaults in `config.js`.

### 9. Acceptance criteria
1. Changing key in DB immediately adjusts reward calculations.

### 10. Backfill and migration notes
Seed initial row with values matching `src/features/gamification/config.js`.

### 11. Ready-to-paste build request
Build Item G-06: Create `gamification_config` table for dynamic server-side economy tuning.

---

# PART 4 - BUILD ORDER

1. **G-01**: `xp_events` ledger & server authority (Foundation)
2. **G-02**: `gem_transactions` ledger & atomic spending (Foundation)
3. **G-03**: `streak_days` 7-day row recording (Streak accuracy)
4. **G-06**: `gamification_config` table (Dynamic config)
5. **G-04**: Daily Quests engine (Engagement loop)
6. **G-05**: Badges & Achievement unlocks (Long-term motivation)

---

# PART 5 - ECONOMY TABLE

All numbers are PROPOSED and subject to founder tuning:

| Source / Activity | Action / Event | XP Earned | Gems Earned | Gem Cost | Daily Cap |
| --- | --- | --- | --- | --- | --- |
| Focus Session | 25 min Pomodoro completion | 20 XP | - | - | 10 sessions (200 XP) |
| Cycle Bonus | 4-Pomodoro cycle finished | +10 XP | - | - | 2 cycles (+20 XP) |
| Flashcards | Review set completed | 10 XP | - | - | 5 sets (50 XP) |
| Quiz | Quiz finished | 15 XP | - | - | 5 quizzes (75 XP) |
| Quiz Ace | Score >= 80% | +10 XP | - | - | 5 bonuses (+50 XP) |
| Daily Goal | Reaching target minutes | 25 XP | 5 Gems | - | 1 / day |
| Streak 7d | 7 consecutive days | 50 XP | 20 Gems | - | Once per milestone |
| Streak 30d | 30 consecutive days | 200 XP | 100 Gems | - | Once per milestone |
| Streak Freeze | Purchase token | - | - | 50 Gems | Max 2 held |
| Streak Repair | Repair broken streak | - | - | 100 Gems | 1 / month |

---

# PART 6 - FOUNDER DECISIONS NEEDED

1. **Streak Freeze Max Hold Limit**: Is a maximum of 2 held streak freeze tokens appropriate, or should active subscribers receive additional freeze slots?
2. **Streak Day Minimum Study Requirement**: Is 10 minutes of active study time appropriate as the minimum threshold to mark a streak day completed?
3. **Daily XP Cap**: Confirm if a 500 XP daily soft cap with diminishing returns balances exam week heavy usage.

---

# PART 7 - REAL-WORLD SCENARIO RESULTS

| # | Real-World Scenario | Status | Notes |
| --- | --- | --- | --- |
| 1 | Brand-new user on day 1 | PASS | Defaults to Level 1, 0 XP, 0 Gems, 0d streak with welcoming state. |
| 2 | Studies at 1:30am (before 3am cutoff) | PASS | Assigned to prior local day via `getLocalCutoffDate` 3am boundary. |
| 3 | Studies at 11:59pm and 12:01am | PASS | Both fall in same local day under 3am cutoff; second session on next evening increments streak. |
| 4 | Multiple sessions in 1 day | PASS | Streak increments +1 only once per local day; XP added up to daily soft cap. |
| 5 | Double-click / retry session completion | PASS | Idempotency key on `xp_events` prevents double reward. |
| 6 | Two devices finish session simultaneously | PASS | Unique idempotency constraint and `FOR UPDATE` transaction serialize rewards. |
| 7 | Offline completion sync | PASS | Server validates local activity timestamp under local timezone cutoff. |
| 8 | Misses 1 day with freeze token | PASS | Token consumed, day marked 'frozen', streak preserved. |
| 9 | Misses 1 day without freeze token | PASS | Streak resets to 0, longest streak retained in `longest_streak`. |
| 10 | Misses several days then returns | PASS | Stale streak resolved on login via `check_stale_streak`. |
| 11 | Timezone travel | PASS | Server checks activity date string under user's stored IANA timezone. |
| 12 | Daylight-saving shift | PASS | Native Intl timeZone calculations safely cross DST boundaries without skipping days. |
| 13 | Exam week heavy usage | PASS | Daily XP cap prevents farming while preserving milestone rewards. |
| 14 | Client state manipulation attempt | PASS | Server RPC validates activity duration; client table updates disallowed in spec. |
| 15 | Insufficient gems for freeze | PASS | Friendly error message displayed; balance checked with `CHECK (balance >= 0)`. |
| 16 | Level-up while app closed | PASS | Derived from total ledger XP on login; level-up celebrated on next open. |
| 17 | Historical account backfill | PASS | Migration populates initial `xp_events` credit for pre-existing profiles. |
| 18 | Leaderboard consistency | PASS | Reads directly from trusted `profiles.xp_points` and `users_streaks`. |

---

# APPENDIX - FRONTEND FILES TOUCHED THIS RUN AND THE SERVICE FUNCTIONS THEY EXPECT

Files modified or created:
- `src/features/gamification/config.js`
- `src/features/gamification/utils/levelCurve.js`
- `src/features/gamification/services/gamificationService.js`
- `src/features/gamification/hooks/useGamification.js`
- `src/features/gamification/hooks/useCelebrations.js`
- `src/features/gamification/components/CelebrationLayer.jsx`
- `src/features/gamification/components/LevelProgress.jsx`
- `src/features/gamification/components/GemWallet.jsx`
- `src/features/gamification/components/DailyGoalRing.jsx`
- `src/features/gamification/components/XpToast.jsx`
- `src/features/gamification/index.js`
- `src/components/Dashboard/DashboardHeader.jsx`

Expected Service Functions:
- `gamificationService.getGamificationState(userId: string): Promise<{ data: GamificationState, error: any }>`
- `gamificationService.awardRewards(userId: string, rewards: { xp?: number, gems?: number }): Promise<{ data: any, error: any }>`
- `gamificationService.getQuests(): Promise<{ data: Quest[], available: boolean, message: string }>`
