import test from "node:test";
import assert from "node:assert/strict";
import { getWeeklyHours } from "../src/lib/weeklyHours.js";

test("getWeeklyHours returns valid weekly_hours from profile", () => {
  assert.equal(getWeeklyHours({ weekly_hours: 10 }), 10);
  assert.equal(getWeeklyHours({ weekly_hours: 1 }), 1);
  assert.equal(getWeeklyHours({ weekly_hours: 80 }), 80);
  assert.equal(getWeeklyHours({ weekly_hours: "15" }), 15);
});

test("getWeeklyHours falls back safely to 5 when profile or value is missing, null, or out of bounds", () => {
  assert.equal(getWeeklyHours(null), 5);
  assert.equal(getWeeklyHours(undefined), 5);
  assert.equal(getWeeklyHours({}), 5);
  assert.equal(getWeeklyHours({ weekly_hours: null }), 5);
  assert.equal(getWeeklyHours({ weekly_hours: 0 }), 5);
  assert.equal(getWeeklyHours({ weekly_hours: -5 }), 5);
  assert.equal(getWeeklyHours({ weekly_hours: 120 }), 5);
  assert.equal(getWeeklyHours({ weekly_hours: "invalid" }), 5);
});
