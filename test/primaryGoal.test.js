import test from "node:test";
import assert from "node:assert/strict";
import { getPrimaryGoalNote, PRIMARY_GOAL_NOTES } from "../src/lib/primaryGoal.js";

test("getPrimaryGoalNote maps all 4 onboarding choices accurately", () => {
  assert.equal(
    getPrimaryGoalNote("Improve my grades"),
    PRIMARY_GOAL_NOTES["Improve my grades"]
  );
  assert.equal(
    getPrimaryGoalNote("Prepare for an exam"),
    PRIMARY_GOAL_NOTES["Prepare for an exam"]
  );
  assert.equal(
    getPrimaryGoalNote("Learn a new skill"),
    PRIMARY_GOAL_NOTES["Learn a new skill"]
  );
  assert.equal(
    getPrimaryGoalNote("Advance my career"),
    PRIMARY_GOAL_NOTES["Advance my career"]
  );
});

test("getPrimaryGoalNote handles case variations and keywords", () => {
  assert.equal(
    getPrimaryGoalNote("improve my grades!"),
    PRIMARY_GOAL_NOTES["Improve my grades"]
  );
  assert.equal(
    getPrimaryGoalNote("studying for an EXAM"),
    PRIMARY_GOAL_NOTES["Prepare for an exam"]
  );
  assert.equal(
    getPrimaryGoalNote("mastering a new skill"),
    PRIMARY_GOAL_NOTES["Learn a new skill"]
  );
  assert.equal(
    getPrimaryGoalNote("advance career"),
    PRIMARY_GOAL_NOTES["Advance my career"]
  );
});

test("getPrimaryGoalNote falls back safely for null, undefined, empty, or unknown inputs", () => {
  const fallbackNote = "Focusing on building consistent study habits and overall academic success.";
  assert.equal(getPrimaryGoalNote(null), fallbackNote);
  assert.equal(getPrimaryGoalNote(undefined), fallbackNote);
  assert.equal(getPrimaryGoalNote(""), fallbackNote);
  assert.equal(getPrimaryGoalNote("   "), fallbackNote);
  assert.equal(getPrimaryGoalNote("Random unhandled string"), fallbackNote);
});
