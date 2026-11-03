import test from "node:test";
import assert from "node:assert/strict";
import { getWeeklyHours, getDailyGoalMinutes } from "../src/lib/weeklyHours.js";

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

test("getDailyGoalMinutes uses explicit daily_goal_minutes when provided", () => {
  assert.equal(getDailyGoalMinutes({ daily_goal_minutes: 45 }), 45);
  assert.equal(getDailyGoalMinutes({ dailyGoalMinutes: 60 }), 60);
});

test("getDailyGoalMinutes derives daily target from weekly_hours and study_days", () => {
  // 14 weekly hours (120 mins/day across 7 days -> 120 mins)
  assert.equal(getDailyGoalMinutes({ weekly_hours: 14, study_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] }), 120);

  // 7 weekly hours (60 mins/day across 7 days -> 60 mins)
  assert.equal(getDailyGoalMinutes({ weekly_hours: 7 }), 60);

  // 3.5 weekly hours (30 mins/day across 7 days -> 30 mins)
  assert.equal(getDailyGoalMinutes({ weekly_hours: 3.5 }), 30);

  // 2 weekly hours across 4 study days (120 mins / 4 -> 30 mins)
  assert.equal(getDailyGoalMinutes({ weekly_hours: 2, study_days: ["Mon", "Wed", "Fri", "Sat"] }), 30);
});

test("getDailyGoalMinutes clamps result between 15 and 480 minutes and handles null/missing profile", () => {
  assert.equal(getDailyGoalMinutes(null), 30); // default 30 mins
  assert.equal(getDailyGoalMinutes({ daily_goal_minutes: 5 }), 15); // clamped to min 15
  assert.equal(getDailyGoalMinutes({ daily_goal_minutes: 600 }), 480); // clamped to max 480
});
