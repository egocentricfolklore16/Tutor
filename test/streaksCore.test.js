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

test("stale streak displays as zero", () => {
  assert.equal(getDisplayStreak({ current_streak: 4, last_active_date: "2026-08-30" }, new Date("2026-09-02T12:00:00Z"), "UTC"), 0);
});
