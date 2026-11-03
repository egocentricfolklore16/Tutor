import test from "node:test";
import assert from "node:assert/strict";
import {
  getLocalDateKey,
  buildDailyPoints,
  computeMovingAverage,
  computeTrendStats,
  formatYAxisTicks,
} from "../src/components/Progress/studyTrendUtils.js";

test("getLocalDateKey formats dates consistently in YYYY-MM-DD", () => {
  const d = new Date(2025, 2, 15); // March 15 2025
  assert.strictEqual(getLocalDateKey(d), "2025-03-15");
  assert.strictEqual(getLocalDateKey(null), "");
  assert.strictEqual(getLocalDateKey("invalid"), "");
});

test("buildDailyPoints creates zero-filled continuous daily points for range", () => {
  const refDate = new Date(2025, 2, 30); // March 30 2025
  const sessions = [
    { Date: new Date(2025, 2, 30).toISOString(), Duration: "2.5" },
    { Date: new Date(2025, 2, 29).toISOString(), Duration: 1.5 },
    { Date: new Date(2025, 2, 29).toISOString(), Duration: 1 }, // total 2.5 on March 29
  ];

  const points = buildDailyPoints(sessions, 7, refDate);
  assert.strictEqual(points.length, 7);

  // Last point is March 30
  const lastPoint = points[points.length - 1];
  assert.strictEqual(lastPoint.key, "2025-03-30");
  assert.strictEqual(lastPoint.hours, 2.5);

  // Second to last is March 29
  const prevPoint = points[points.length - 2];
  assert.strictEqual(prevPoint.key, "2025-03-29");
  assert.strictEqual(prevPoint.hours, 2.5);

  // Unfilled day is 0
  const firstPoint = points[0];
  assert.strictEqual(firstPoint.hours, 0);
});

test("computeMovingAverage computes trailing 7-day average correctly", () => {
  const points = [
    { hours: 1 },
    { hours: 2 },
    { hours: 3 },
    { hours: 4 },
    { hours: 5 },
    { hours: 6 },
    { hours: 7 }, // average of 1..7 is 28 / 7 = 4
    { hours: 0 }, // trailing 7-day (index 1..7): 2..7 + 0 = 27 / 7 = 3.86
  ];

  const avgPoints = computeMovingAverage(points, 7);
  assert.strictEqual(avgPoints[6].avg7, 4);
  assert.strictEqual(avgPoints[7].avg7, 3.86);
});

test("computeTrendStats calculates active days, peak, averages, and deltas safely", () => {
  const current = [
    { hours: 0 },
    { hours: 2, day: "Mar 10", fullDate: "Mar 10, 2025", key: "2025-03-10" },
    { hours: 4, day: "Mar 11", fullDate: "Mar 11, 2025", key: "2025-03-11" },
    { hours: 0 },
  ];
  const previous = [
    { hours: 1 },
    { hours: 1 },
    { hours: 1 },
    { hours: 1 },
  ];

  const stats = computeTrendStats(current, previous);
  assert.strictEqual(stats.totalHours, 6);
  assert.strictEqual(stats.activeDays, 2);
  assert.strictEqual(stats.totalDays, 4);
  assert.strictEqual(stats.avgPerActiveDay, 3);
  assert.strictEqual(stats.peakHours, 4);
  assert.strictEqual(stats.peakDate, "Mar 11");
  assert.strictEqual(stats.prevTotalHours, 4);
  assert.strictEqual(stats.diffHours, 2); // 6 - 4 = +2
  assert.strictEqual(stats.deltaPercent, 50); // 2 / 4 = +50%
  assert.strictEqual(stats.isUp, true);
});

test("computeTrendStats protects against divide-by-zero when all points are 0", () => {
  const current = [{ hours: 0 }, { hours: 0 }];
  const previous = [{ hours: 0 }, { hours: 0 }];

  const stats = computeTrendStats(current, previous);
  assert.strictEqual(stats.totalHours, 0);
  assert.strictEqual(stats.activeDays, 0);
  assert.strictEqual(stats.avgPerActiveDay, 0);
  assert.strictEqual(stats.peakHours, 0);
  assert.strictEqual(stats.diffHours, 0);
  assert.strictEqual(stats.deltaPercent, 0);
  assert.strictEqual(stats.isUp, false);
  assert.strictEqual(stats.isDown, false);
});

test("formatYAxisTicks guarantees minimum domain height of 4h", () => {
  const low = formatYAxisTicks(1.5);
  assert.strictEqual(low.niceMax, 4);
  assert.deepStrictEqual(low.ticks, [0, 1, 2, 3, 4]);

  const high = formatYAxisTicks(6.2);
  assert.strictEqual(high.niceMax, 8);
  assert.deepStrictEqual(high.ticks, [0, 2, 4, 6, 8]);
});
