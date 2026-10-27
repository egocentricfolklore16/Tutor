import test from "node:test";
import assert from "node:assert/strict";
import { getDailyGoalMinutes } from "../src/lib/weeklyHours.js";

test("Progress daily goal hours calculation from profile onboarding preferences", () => {
  // 15 minutes / day -> weekly_hours: 2
  const profile15m = { weekly_hours: 2, study_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] };
  assert.equal(getDailyGoalMinutes(profile15m) / 60, 0.2833333333333333); // 17 mins rounded -> 0.283h

  // 30 minutes / day -> weekly_hours: 3.5
  const profile30m = { weekly_hours: 3.5 };
  assert.equal(getDailyGoalMinutes(profile30m) / 60, 0.5); // 30 mins -> 0.5h

  // 1 hour / day -> weekly_hours: 7
  const profile1h = { weekly_hours: 7 };
  assert.equal(getDailyGoalMinutes(profile1h) / 60, 1); // 60 mins -> 1.0h

  // 2+ hours / day -> weekly_hours: 14
  const profile2h = { weekly_hours: 14 };
  assert.equal(getDailyGoalMinutes(profile2h) / 60, 2); // 120 mins -> 2.0h

  // Explicit daily_goal_minutes preference overrides
  const profileExplicit = { daily_goal_minutes: 45, weekly_hours: 7 };
  assert.equal(getDailyGoalMinutes(profileExplicit) / 60, 0.75); // 45 mins -> 0.75h
});

test("Progress daily goal hours calculation falls back safely for null or empty profile", () => {
  // Null profile
  assert.equal(getDailyGoalMinutes(null) / 60, 0.5); // Default 30 mins -> 0.5h

  // Undefined profile
  assert.equal(getDailyGoalMinutes(undefined) / 60, 0.5);

  // Profile with empty object or missing weekly_hours/study_days
  assert.equal(getDailyGoalMinutes({}) / 60, 0.7166666666666667); // getWeeklyHours({}) defaults to 5 hrs / 7 days = 43 mins -> 0.716h

  // Profile with invalid weekly_hours value
  assert.equal(getDailyGoalMinutes({ weekly_hours: "invalid" }) / 60, 0.7166666666666667);
});
