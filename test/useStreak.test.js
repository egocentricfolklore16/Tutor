import test from "node:test";
import assert from "node:assert/strict";
import { getLocalCutoffDate, getCurrentWeekDays } from "../src/hooks/useStreak.js";

test("getLocalCutoffDate respects 3am cutoff and timezone", () => {
  // Mock Date: 2025-05-10T02:00:00Z -> Before 3am UTC, belongs to 2025-05-09
  const earlyMorning = new Date("2025-05-10T02:00:00Z");
  const dateStr1 = getLocalCutoffDate(earlyMorning, "UTC", 3);
  assert.equal(dateStr1, "2025-05-09");

  // Mock Date: 2025-05-10T04:00:00Z -> After 3am UTC, belongs to 2025-05-10
  const morning = new Date("2025-05-10T04:00:00Z");
  const dateStr2 = getLocalCutoffDate(morning, "UTC", 3);
  assert.equal(dateStr2, "2025-05-10");
});

test("getCurrentWeekDays computes 7 Sun-Sat days accurately around today", () => {
  // Suppose today cutoff is Wednesday 2025-05-14
  const weekDays = getCurrentWeekDays("2025-05-14", "UTC");

  assert.equal(weekDays.length, 7);
  assert.equal(weekDays[0].label, "S"); // Sun
  assert.equal(weekDays[0].dateStr, "2025-05-11");
  assert.equal(weekDays[3].label, "W"); // Wed
  assert.equal(weekDays[3].dateStr, "2025-05-14");
  assert.equal(weekDays[3].isToday, true);
  assert.equal(weekDays[6].label, "S"); // Sat
  assert.equal(weekDays[6].dateStr, "2025-05-17");
});

test("streak display formatter logic for loading, error, and active streak values", () => {
  // Helper simulating how components render streak text based on useStreak state
  const formatStreakBadge = ({ currentStreak, loading, error }) => {
    if (loading || currentStreak === null) return "–d";
    if (error) return "–d";
    return `${currentStreak}d`;
  };

  const formatGreetingChip = ({ currentStreak, loading, error }) => {
    if (loading || currentStreak === null) return "–d Streak";
    if (error) return "–d Streak";
    return `${currentStreak}d Streak`;
  };

  // Scenario 1: Active streak = 5
  const activeState = { currentStreak: 5, loading: false, error: null };
  assert.equal(formatStreakBadge(activeState), "5d");
  assert.equal(formatGreetingChip(activeState), "5d Streak");

  // Scenario 2: Loading state must NOT render "0d" or "0d Streak"
  const loadingState = { currentStreak: null, loading: true, error: null };
  assert.equal(formatStreakBadge(loadingState), "–d");
  assert.notEqual(formatStreakBadge(loadingState), "0d");
  assert.equal(formatGreetingChip(loadingState), "–d Streak");
  assert.notEqual(formatGreetingChip(loadingState), "0d Streak");

  // Scenario 3: Error state must NOT render "0d" or "0d Streak"
  const errorState = { currentStreak: null, loading: false, error: new Error("Network failure") };
  assert.equal(formatStreakBadge(errorState), "–d");
  assert.notEqual(formatStreakBadge(errorState), "0d");
  assert.equal(formatGreetingChip(errorState), "–d Streak");
  assert.notEqual(formatGreetingChip(errorState), "0d Streak");
});
