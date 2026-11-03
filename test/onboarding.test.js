import test from "node:test";
import assert from "node:assert/strict";
import {
  validateDisplayName,
  validateStepAnswer,
  mapDailyTimeToWeeklyHours,
  QUESTION_STEPS,
} from "../src/lib/onboarding.js";

test("validateDisplayName validates display name inputs correctly", () => {
  // Empty or missing
  assert.equal(validateDisplayName(""), "Name is required.");
  assert.equal(validateDisplayName("   "), "Name is required.");

  // Too short
  assert.equal(validateDisplayName("A"), "Name must be at least 2 characters.");

  // Too long
  assert.equal(validateDisplayName("a".repeat(25)), "Name must be 24 characters or less.");

  // Invalid characters
  assert.equal(
    validateDisplayName("Alex<script>"),
    "Name can only contain letters, numbers, spaces, hyphens, and apostrophes."
  );
  assert.equal(
    validateDisplayName("John@Doe"),
    "Name can only contain letters, numbers, spaces, hyphens, and apostrophes."
  );

  // Valid names
  assert.equal(validateDisplayName("Alex"), null);
  assert.equal(validateDisplayName("Mary-Jane O'Connor"), null);
  assert.equal(validateDisplayName("Learner 123"), null);
});

test("mapDailyTimeToWeeklyHours converts daily choices to weekly hours", () => {
  assert.equal(mapDailyTimeToWeeklyHours("15 minutes / day"), 2);
  assert.equal(mapDailyTimeToWeeklyHours("30 minutes / day"), 3.5);
  assert.equal(mapDailyTimeToWeeklyHours("1 hour / day"), 7);
  assert.equal(mapDailyTimeToWeeklyHours("2+ hours / day"), 14);
  assert.equal(mapDailyTimeToWeeklyHours("Unknown"), 5);
});

test("validateStepAnswer checks each question step accurately", () => {
  const nameStep = QUESTION_STEPS.find((s) => s.id === "name");
  const subjectsStep = QUESTION_STEPS.find((s) => s.id === "subjects");
  const goalStep = QUESTION_STEPS.find((s) => s.id === "primary_goal");
  const levelStep = QUESTION_STEPS.find((s) => s.id === "education_level");
  const styleStep = QUESTION_STEPS.find((s) => s.id === "learning_style");
  const dailyTimeStep = QUESTION_STEPS.find((s) => s.id === "daily_time");
  const completionStep = QUESTION_STEPS.find((s) => s.id === "completion");

  // Name step validation
  assert.equal(validateStepAnswer(nameStep, { display_name: "" }), false);
  assert.equal(validateStepAnswer(nameStep, { display_name: "Caleb" }), true);

  // Multi-subject step validation (handles selected options or custom otherSubject)
  assert.equal(validateStepAnswer(subjectsStep, { subjects: [], otherSubject: "" }), false);
  assert.equal(validateStepAnswer(subjectsStep, { subjects: ["Math"], otherSubject: "" }), true);
  assert.equal(
    validateStepAnswer(subjectsStep, { subjects: [], otherSubject: "Economics" }),
    true
  );

  // Goal step validation
  assert.equal(validateStepAnswer(goalStep, { primary_goal: "" }), false);
  assert.equal(validateStepAnswer(goalStep, { primary_goal: "Pass an exam" }), true);

  // Education level step validation
  assert.equal(validateStepAnswer(levelStep, { education_level: "" }), false);
  assert.equal(validateStepAnswer(levelStep, { education_level: "Intermediate" }), true);

  // Learning style multi-select step validation
  assert.equal(validateStepAnswer(styleStep, { learning_style: [] }), false);
  assert.equal(
    validateStepAnswer(styleStep, { learning_style: ["Explanations", "Examples"] }),
    true
  );

  // Daily time step validation
  assert.equal(validateStepAnswer(dailyTimeStep, { daily_time: "" }), false);
  assert.equal(validateStepAnswer(dailyTimeStep, { daily_time: "30 minutes / day" }), true);

  // Completion step (unrequired)
  assert.equal(validateStepAnswer(completionStep, {}), true);
});

test("onboarding step clamp logic handles step indices within 6-question boundary", () => {
  const TOTAL_QUESTION_STEPS = QUESTION_STEPS.length - 1;

  const getClampedStep = (savedStep) => {
    const parsed = typeof savedStep === "number" ? savedStep : 0;
    return Math.min(Math.max(0, parsed), TOTAL_QUESTION_STEPS - 1);
  };

  assert.equal(getClampedStep(0), 0);
  assert.equal(getClampedStep(3), 3);
  assert.equal(getClampedStep(10), 5);
  assert.equal(getClampedStep(-1), 0);
  assert.equal(getClampedStep(undefined), 0);
});
