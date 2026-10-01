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
