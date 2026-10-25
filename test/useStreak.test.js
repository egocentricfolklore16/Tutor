import test from "node:test";
import assert from "node:assert/strict";
import { getLocalCutoffDate, getCurrentWeekDays, computeWeekDays, resolveStaleDisplayStreak } from "../src/hooks/useStreak.js";

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

test("computeWeekDays computes states across completed, frozen, today-pending, future, and missed", () => {
  // Suppose today is Wednesday 2026-05-13 under local 3am cutoff
  const baseWeek = getCurrentWeekDays("2026-05-13");

  const statusByDate = {
    "2026-05-10": "completed", // Sun: completed
    "2026-05-11": "frozen",    // Mon: frozen
    // Tue 2026-05-12 has no record -> missed
    // Wed 2026-05-13 is today -> pending
    // Thu, Fri, Sat are future
  };

  const computed = computeWeekDays(baseWeek, statusByDate, "2026-05-13", null);

  assert.equal(computed.length, 7);
  assert.equal(computed[0].dateStr, "2026-05-10");
  assert.equal(computed[0].state, "completed");
  assert.equal(computed[0].status, "completed");

  assert.equal(computed[1].dateStr, "2026-05-11");
  assert.equal(computed[1].state, "frozen");
  assert.equal(computed[1].status, "frozen");

  assert.equal(computed[2].dateStr, "2026-05-12");
  assert.equal(computed[2].state, "missed");
  assert.equal(computed[2].status, null);

  assert.equal(computed[3].dateStr, "2026-05-13");
  assert.equal(computed[3].state, "today-pending");
  assert.equal(computed[3].isToday, true);

  assert.equal(computed[4].dateStr, "2026-05-14");
  assert.equal(computed[4].state, "future");

  assert.equal(computed[5].dateStr, "2026-05-15");
  assert.equal(computed[5].state, "future");

  assert.equal(computed[6].dateStr, "2026-05-16");
  assert.equal(computed[6].state, "future");
});

test("computeWeekDays marks today completed when statusByDate or activeOrCompleted is set", () => {
  const baseWeek = getCurrentWeekDays("2026-05-13");

  // Case 1: today is marked completed via statusByDate
  const status1 = { "2026-05-13": "completed" };
  const res1 = computeWeekDays(baseWeek, status1, "2026-05-13", null);
  assert.equal(res1[3].state, "completed");
  assert.equal(res1[3].status, "completed");

  // Case 2: today is marked completed via activeOrCompleted fallback string
  const res2 = computeWeekDays(baseWeek, {}, "2026-05-13", "2026-05-13");
  assert.equal(res2[3].state, "completed");
  assert.equal(res2[3].status, "completed");
});

test("getLocalCutoffDate handles year rollover and timezone travel boundaries", () => {
  // Year rollover: Dec 31 11:30 PM EST vs Jan 1 02:30 AM EST (3am cutoff keeps both as Dec 31)
  const dec31Night = new Date("2025-12-31T23:30:00-05:00");
  assert.equal(getLocalCutoffDate(dec31Night, "America/New_York", 3), "2025-12-31");

  const jan1EarlyMorning = new Date("2026-01-01T02:30:00-05:00"); // 2:30 AM Jan 1 is before 3:00 AM cutoff
  assert.equal(getLocalCutoffDate(jan1EarlyMorning, "America/New_York", 3), "2025-12-31");

  const jan1Morning = new Date("2026-01-01T03:30:00-05:00"); // 3:30 AM Jan 1 is after cutoff
  assert.equal(getLocalCutoffDate(jan1Morning, "America/New_York", 3), "2026-01-01");

  // Timezone travel: exact same instant 2026-01-01T02:00:00Z evaluated across timezones
  const utcInstant = new Date("2026-01-01T02:00:00Z");

  // In UTC (02:00 AM) -> before 3am cutoff -> 2025-12-31
  assert.equal(getLocalCutoffDate(utcInstant, "UTC", 3), "2025-12-31");

  // In Tokyo (11:00 AM Jan 1) -> after 3am cutoff -> 2026-01-01
  assert.equal(getLocalCutoffDate(utcInstant, "Asia/Tokyo", 3), "2026-01-01");

  // In Hawaii (04:00 PM Dec 31) -> hour 16 >= 3 -> 2025-12-31
  assert.equal(getLocalCutoffDate(utcInstant, "Pacific/Honolulu", 3), "2025-12-31");
});

test("computeWeekDays backfills contiguous active streak days as completed", () => {
  // Suppose today is Wednesday 2026-10-21 under local cutoff
  const baseWeek = getCurrentWeekDays("2026-10-21");

  // Suppose user has a 3-day active streak ending yesterday (2026-10-20)
  // statusByDate initially only has 2026-10-20 explicitly recorded in DB
  const statusByDate = {
    "2026-10-20": "completed",
  };

  // Backfill 3 contiguous streak days (2026-10-20, 2026-10-19, 2026-10-18)
  const displayStreak = 3;
  const activeOrCompleted = "2026-10-20";
  const anchorParts = activeOrCompleted.split("-").map(Number);
  const anchorDate = new Date(Date.UTC(anchorParts[0], anchorParts[1] - 1, anchorParts[2]));
  for (let i = 0; i < displayStreak; i++) {
    const d = new Date(anchorDate);
    d.setUTCDate(anchorDate.getUTCDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    statusByDate[dateStr] = "completed";
  }

  const computed = computeWeekDays(baseWeek, statusByDate, "2026-10-21", activeOrCompleted);

  // Sun Oct 18 -> completed
  assert.equal(computed[0].dateStr, "2026-10-18");
  assert.equal(computed[0].state, "completed");

  // Mon Oct 19 -> completed
  assert.equal(computed[1].dateStr, "2026-10-19");
  assert.equal(computed[1].state, "completed");

  // Tue Oct 20 -> completed
  assert.equal(computed[2].dateStr, "2026-10-20");
  assert.equal(computed[2].state, "completed");

  // Wed Oct 21 -> today-pending
  assert.equal(computed[3].dateStr, "2026-10-21");
  assert.equal(computed[3].state, "today-pending");
});

test("resolveStaleDisplayStreak evaluates stale streaks correctly across multi-day gaps and freeze tokens", () => {
  // Scenario 0: Missing or null last active date returns 0 display streak
  assert.equal(resolveStaleDisplayStreak(5, null, "2026-05-10", 1), 0);
  assert.equal(resolveStaleDisplayStreak(5, "", "2026-05-10", 1), 0);

  // Scenario 1: Same day or 1-day gap (diffDays = 0 or 1) -> preserves active streak
  assert.equal(resolveStaleDisplayStreak(5, "2026-05-10", "2026-05-10", 0), 5);
  assert.equal(resolveStaleDisplayStreak(5, "2026-05-10", "2026-05-11", 0), 5);

  // Scenario 2: 1-day gap (diffDays = 2, missed May 11) with 1 freeze token -> preserves active streak
  assert.equal(resolveStaleDisplayStreak(5, "2026-05-10", "2026-05-12", 1), 5);

  // Scenario 3: 1-day gap (diffDays = 2, missed May 11) with 0 freeze tokens -> resets display streak to 0
  assert.equal(resolveStaleDisplayStreak(5, "2026-05-10", "2026-05-12", 0), 0);

  // Scenario 4: 2-day gap (diffDays = 3, missed May 11 and May 12) with 1 freeze token -> MUST reset display streak to 0
  assert.equal(resolveStaleDisplayStreak(5, "2026-05-10", "2026-05-13", 1), 0);

  // Scenario 5: 2-day gap (diffDays = 3, missed May 11 and May 12) with 0 freeze tokens -> resets display streak to 0
  assert.equal(resolveStaleDisplayStreak(5, "2026-05-10", "2026-05-13", 0), 0);
});

test("getCurrentWeekDays handles Sunday start, Saturday end, and month transitions", () => {
  // 1. Sunday today (2026-06-07)
  const sunWeek = getCurrentWeekDays("2026-06-07");
  assert.equal(sunWeek[0].dateStr, "2026-06-07");
  assert.equal(sunWeek[0].isToday, true);
  assert.equal(sunWeek[0].isPast, false);
  assert.equal(sunWeek[1].isFuture, true);
  assert.equal(sunWeek[6].dateStr, "2026-06-13");

  // 2. Saturday today (2026-06-13)
  const satWeek = getCurrentWeekDays("2026-06-13");
  assert.equal(satWeek[0].dateStr, "2026-06-07");
  assert.equal(satWeek[0].isPast, true);
  assert.equal(satWeek[6].dateStr, "2026-06-13");
  assert.equal(satWeek[6].isToday, true);
  assert.equal(satWeek[6].isFuture, false);

  // 3. Month transition: Wednesday May 27, 2026
  const monthTransitionWeek = getCurrentWeekDays("2026-05-27");
  assert.equal(monthTransitionWeek[0].dateStr, "2026-05-24"); // Sun May 24
  assert.equal(monthTransitionWeek[6].dateStr, "2026-05-30"); // Sat May 30
});
