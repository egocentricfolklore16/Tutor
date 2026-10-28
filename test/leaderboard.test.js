import test from "node:test";
import assert from "node:assert/strict";
import { formatMetricValue, getWeeklyResetCountdown } from "../src/features/community/utils/rankUtils.js";

test("formatMetricValue formats XP correctly", () => {
  assert.equal(formatMetricValue(0, "xp"), "0 XP");
  assert.equal(formatMetricValue(500, "xp"), "500 XP");
  assert.equal(formatMetricValue(1250, "xp"), "1,250 XP");
  assert.equal(formatMetricValue(15000, "xp"), "15.0k XP");
});

test("formatMetricValue formats study hours correctly", () => {
  assert.equal(formatMetricValue(0.5, "hours"), "30m");
  assert.equal(formatMetricValue(1, "hours"), "1h");
  assert.equal(formatMetricValue(2.5, "hours"), "2h 30m");
});

test("formatMetricValue formats streaks correctly", () => {
  assert.equal(formatMetricValue(1, "streak"), "1 day");
  assert.equal(formatMetricValue(5, "streak"), "5 days");
  assert.equal(formatMetricValue(0, "streak"), "0 days");
});

test("formatMetricValue safely falls back for missing or invalid values", () => {
  assert.equal(formatMetricValue(null, "xp"), "0 XP");
  assert.equal(formatMetricValue(undefined, "unknown"), "0");
});

test("getWeeklyResetCountdown returns valid countdown string format", () => {
  const countdown = getWeeklyResetCountdown();
  assert.match(countdown, /^\d+d \d+h$/);
});
