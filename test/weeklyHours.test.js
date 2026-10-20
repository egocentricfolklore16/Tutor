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

test("getDailyGoalMinutes derives daily target from onboarding weekly_hours and study_days", () => {
  // 5 hours / 5 days = 60 mins/day
  assert.equal(getDailyGoalMinutes({ weekly_hours: 5, study_days: ["Mon", "Tue", "Wed", "Thu", "Fri"] }), 60);

  // 14 hours / 7 days = 120 mins/day
  assert.equal(getDailyGoalMinutes({ weekly_hours: 14, study_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] }), 120);

  // 3 hours / 2 days = 90 mins/day
  assert.equal(getDailyGoalMinutes({ weekly_hours: 3, study_days: ["Sat", "Sun"] }), 90);

  // 5 hours / missing study_days array defaults to 5 days -> 60 mins/day
  assert.equal(getDailyGoalMinutes({ weekly_hours: 5 }), 60);
});

test("getDailyGoalMinutes prioritizes explicit daily_goal_minutes override", () => {
  assert.equal(getDailyGoalMinutes({ daily_goal_minutes: 45, weekly_hours: 10, study_days: ["Mon"] }), 45);
  assert.equal(getDailyGoalMinutes({ daily_goal_minutes: "75" }), 75);
});

test("getDailyGoalMinutes falls back safely for missing, null, or invalid profiles", () => {
  assert.equal(getDailyGoalMinutes(null), 30);
  assert.equal(getDailyGoalMinutes(undefined), 30);
  assert.equal(getDailyGoalMinutes({}), 60); // 5 hrs / 5 default days = 60 mins
});

test("getDailyGoalMinutes clamps values within safe minimum and maximum bounds", () => {
  // Very low goal: 1 hour / 7 days = 8.5 mins -> clamped to min 15 mins
  assert.equal(getDailyGoalMinutes({ weekly_hours: 1, study_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] }), 15);

  // Very high goal: 80 hours / 1 day = 4800 mins -> clamped to max 480 mins
  assert.equal(getDailyGoalMinutes({ weekly_hours: 80, study_days: ["Mon"] }), 480);
});
