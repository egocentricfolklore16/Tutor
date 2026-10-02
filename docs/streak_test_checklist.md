# Manual Test Checklist: Streak System

## 1. First Day Activity
- [ ] Complete first study session on a fresh profile.
- [ ] Verify `current_streak` becomes 1, `longest_streak` becomes 1.
- [ ] Verify today's weekday cell in the header dropdown updates to state `'completed'` displaying the fire icon (`streak.svg`).

## 2. Consecutive Day Activity
- [ ] Complete a study session on day 2.
- [ ] Verify `current_streak` increments to 2, `longest_streak` increments to 2.
- [ ] Verify both completed days show fire icons in the weekday row.

## 3. Missed Day with Freeze Token
- [ ] Skip 1 calendar day when user has `freeze_tokens > 0`.
- [ ] Log in on day 3: `check_stale_streak` consumes 1 freeze token and marks yesterday as `'frozen'`.
- [ ] Complete study session on day 3: `record_study_activity` increments streak to 3 without consuming a second freeze token.
- [ ] Verify yesterday's cell renders the `Snowflake` icon in blue tint.

## 4. Missed Day WITHOUT Freeze Token
- [ ] Skip 1 calendar day when user has 0 freeze tokens.
- [ ] Log in / record activity on day 3: `current_streak` resets to 1 (or 0 if unstudied).
- [ ] Missed day renders as a muted empty circle.

## 5. Same-Day Double Call (Idempotency)
- [ ] Complete multiple sessions on the same calendar day.
- [ ] Verify `record_study_activity` does not double-count or increment streak multiple times in one day.

## 6. Timezone / 3am Cutoff Boundary
- [ ] Complete session at 2:30 AM local time: activity maps to the prior local day under 3am cutoff rules.
- [ ] Complete session at 3:15 AM local time: activity maps to the new local day.
