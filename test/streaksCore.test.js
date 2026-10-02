import test from "node:test";
import assert from "node:assert/strict";
import { calculateStreakUpdate, getActivityDate, getDisplayStreak } from "../src/lib/streaksCore.js";

test("same-day activity is a no-op", () => {
  const previous = { currentStreak: 4, longestStreak: 6, lastActiveDate: "2026-09-02", freezeTokensAvailable: 0 };
  assert.equal(calculateStreakUpdate(previous, "2026-09-02").noOp, true);
  assert.equal(calculateStreakUpdate(previous, "2026-09-02").currentStreak, 4);
});

test("consecutive activity increments the streak", () => {
  const result = calculateStreakUpdate({ currentStreak: 4, longestStreak: 4, lastActiveDate: "2026-09-01", freezeTokensAvailable: 0 }, "2026-09-02");
  assert.deepEqual(result, { currentStreak: 5, longestStreak: 5, lastActiveDate: "2026-09-02", freezeTokensAvailable: 0 });
});

test("a gap resets the streak", () => {
  const result = calculateStreakUpdate({ currentStreak: 4, longestStreak: 7, lastActiveDate: "2026-08-30", freezeTokensAvailable: 0 }, "2026-09-02");
  assert.deepEqual(result, { currentStreak: 1, longestStreak: 7, lastActiveDate: "2026-09-02", freezeTokensAvailable: 0 });
});

test("first activity starts a streak", () => {
  const result = calculateStreakUpdate({ currentStreak: 0, longestStreak: 0, lastActiveDate: null, freezeTokensAvailable: 0 }, "2026-09-02");
  assert.equal(result.currentStreak, 1);
});

test("a freeze token preserves a one-day gap", () => {
  const result = calculateStreakUpdate({ currentStreak: 4, longestStreak: 4, lastActiveDate: "2026-08-31", freezeTokensAvailable: 1 }, "2026-09-02");
  assert.deepEqual(result, { currentStreak: 5, longestStreak: 5, lastActiveDate: "2026-09-02", freezeTokensAvailable: 0 });
});

test("activity before the 3am cutoff belongs to the prior local day", () => {
  assert.equal(getActivityDate(new Date("2026-09-02T06:30:00Z"), "America/New_York", 3), "2026-09-01");
  assert.equal(getActivityDate(new Date("2026-09-02T06:59:00Z"), "America/New_York", 3), "2026-09-01");
  assert.equal(getActivityDate(new Date("2026-09-02T07:00:00Z"), "America/New_York", 3), "2026-09-02");
  assert.equal(getActivityDate(new Date("2026-09-02T06:00:00Z"), "America/New_York", 3), "2026-09-01");
});

test("3am local-time cutoff boundary: exact 2:59:59am vs 3:00:00am in local timezones", () => {
  // Asia/Tokyo (UTC+9)
  // 2026-05-10T17:59:59Z is 2:59:59 AM Tokyo time on May 11 -> prior day May 10
  assert.equal(getActivityDate(new Date("2026-05-10T17:59:59Z"), "Asia/Tokyo", 3), "2026-05-10");
  // 2026-05-10T18:00:00Z is 3:00:00 AM Tokyo time on May 11 -> current day May 11
  assert.equal(getActivityDate(new Date("2026-05-10T18:00:00Z"), "Asia/Tokyo", 3), "2026-05-11");

  // UTC
  // 2026-05-10T02:59:59Z -> prior day May 9
  assert.equal(getActivityDate(new Date("2026-05-10T02:59:59Z"), "UTC", 3), "2026-05-09");
  // 2026-05-10T03:00:00Z -> current day May 10
  assert.equal(getActivityDate(new Date("2026-05-10T03:00:00Z"), "UTC", 3), "2026-05-10");
});

test("DST transitions: Spring forward and Fall back cutoff boundaries in America/New_York", () => {
  // US Spring Forward: March 8, 2026 (clocks jump 2:00 AM EST -> 3:00 AM EDT at 07:00 UTC)
  // 06:59:00Z is 1:59 AM EST (hour < 3) -> prior day 2026-03-07
  assert.equal(getActivityDate(new Date("2026-03-08T06:59:00Z"), "America/New_York", 3), "2026-03-07");
  // 07:00:00Z is 3:00 AM EDT (hour >= 3) -> current day 2026-03-08
  assert.equal(getActivityDate(new Date("2026-03-08T07:00:00Z"), "America/New_York", 3), "2026-03-08");

  // US Fall Back: November 1, 2026 (clocks fall 2:00 AM EDT -> 1:00 AM EST at 06:00 UTC)
  // 07:59:00Z is 2:59 AM EST (hour < 3) -> prior day 2026-10-31
  assert.equal(getActivityDate(new Date("2026-11-01T07:59:00Z"), "America/New_York", 3), "2026-10-31");
  // 08:00:00Z is 3:00 AM EST (hour >= 3) -> current day 2026-11-01
  assert.equal(getActivityDate(new Date("2026-11-01T08:00:00Z"), "America/New_York", 3), "2026-11-01");
});

test("out-of-order activity dates (travel/timezone sync) return no-op and do not wipe active streak", () => {
  const previous = { currentStreak: 15, longestStreak: 20, lastActiveDate: "2026-05-11", freezeTokensAvailable: 1 };
  // User flew across date line or sync recorded activity from 2026-05-10 (earlier than lastActiveDate)
  const result = calculateStreakUpdate(previous, "2026-05-10");
  assert.equal(result.noOp, true);
  assert.equal(result.currentStreak, 15);
  assert.equal(result.lastActiveDate, "2026-05-11");
});

test("rapid double completion or concurrent tabs on same date returns no-op", () => {
  const previous = { currentStreak: 7, longestStreak: 10, lastActiveDate: "2026-05-10", freezeTokensAvailable: 2 };
  const first = calculateStreakUpdate(previous, "2026-05-11");
  assert.equal(first.currentStreak, 8);
  assert.equal(first.lastActiveDate, "2026-05-11");

  // Rapid second invocation in another tab with same date
  const second = calculateStreakUpdate(first, "2026-05-11");
  assert.equal(second.noOp, true);
  assert.equal(second.currentStreak, 8);
  assert.equal(second.lastActiveDate, "2026-05-11");
});

test("freeze token behavior: disabled, zero tokens, or multi-day gap", () => {
  // 1-day gap with 0 freeze tokens available resets streak
  const noTokens = calculateStreakUpdate(
    { currentStreak: 10, longestStreak: 10, lastActiveDate: "2026-05-08", freezeTokensAvailable: 0 },
    "2026-05-10",
    true
  );
  assert.equal(noTokens.currentStreak, 1);

  // 1-day gap with freeze tokens available BUT freezeEnabled=false resets streak
  const freezeDisabled = calculateStreakUpdate(
    { currentStreak: 10, longestStreak: 10, lastActiveDate: "2026-05-08", freezeTokensAvailable: 2 },
    "2026-05-10",
    false
  );
  assert.equal(freezeDisabled.currentStreak, 1);
  assert.equal(freezeDisabled.freezeTokensAvailable, 2);

  // 2-day gap (3 days since activity) resets streak even if freeze token is available
  const multiDayGap = calculateStreakUpdate(
    { currentStreak: 10, longestStreak: 10, lastActiveDate: "2026-05-07", freezeTokensAvailable: 2 },
    "2026-05-10",
    true
  );
  assert.equal(multiDayGap.currentStreak, 1);
  assert.equal(multiDayGap.freezeTokensAvailable, 2);
});

test("very long streaks increment correctly and update longestStreak", () => {
  const yearStreak = calculateStreakUpdate(
    { currentStreak: 365, longestStreak: 365, lastActiveDate: "2026-12-31", freezeTokensAvailable: 0 },
    "2027-01-01"
  );
  assert.equal(yearStreak.currentStreak, 366);
  assert.equal(yearStreak.longestStreak, 366);

  const thousandStreak = calculateStreakUpdate(
    { currentStreak: 1000, longestStreak: 1200, lastActiveDate: "2026-12-31", freezeTokensAvailable: 1 },
    "2027-01-01"
  );
  assert.equal(thousandStreak.currentStreak, 1001);
  assert.equal(thousandStreak.longestStreak, 1200);
});

test("stale streak displays as zero", () => {
  assert.equal(getDisplayStreak({ current_streak: 4, last_active_date: "2026-08-30" }, new Date("2026-09-02T12:00:00Z"), "UTC"), 0);
  assert.equal(getDisplayStreak({ current_streak: 5, last_active_date: "2026-09-02" }, new Date("2026-09-02T12:00:00Z"), "UTC"), 5);
  assert.equal(getDisplayStreak({ current_streak: 5, last_active_date: "2026-09-01" }, new Date("2026-09-02T12:00:00Z"), "UTC"), 5);
});
