import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateDaysLeft } from "../src/lib/deadlineUtils.js";

test("calculateDaysLeft calculates future, today, and overdue deadline days accurately", () => {
  const referenceNow = new Date("2025-05-15T10:00:00Z");

  // Future deadline in 3 days
  const inThreeDays = calculateDaysLeft("2025-05-18", referenceNow);
  assert.equal(inThreeDays, 3);

  // Due today
  const dueToday = calculateDaysLeft("2025-05-15", referenceNow);
  assert.equal(dueToday, 0);

  // Overdue by 2 days
  const overdueTwoDays = calculateDaysLeft("2025-05-13", referenceNow);
  assert.equal(overdueTwoDays, -2);
});

test("calculateDaysLeft handles ISO date strings and missing input safely", () => {
  const referenceNow = new Date("2025-05-15T12:00:00Z");

  // ISO format string
  const isoDate = calculateDaysLeft("2025-05-20T00:00:00.000Z", referenceNow);
  assert.equal(isoDate, 5);

  // Null or undefined
  assert.equal(calculateDaysLeft(null, referenceNow), 0);
  assert.equal(calculateDaysLeft(undefined, referenceNow), 0);
});
