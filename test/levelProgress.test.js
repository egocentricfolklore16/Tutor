import test from "node:test";
import assert from "node:assert";
import {
  calculateXpLevel,
  LEVEL_MILESTONES,
  getNextLevelMilestone,
} from "../src/features/gamification/utils/levelCurve.js";

test("calculateXpLevel: zero and initial XP starts at Level 1", () => {
  const lvl0 = calculateXpLevel(0);
  assert.strictEqual(lvl0.level, 1);
  assert.strictEqual(lvl0.xpInCurrentLevel, 0);
  assert.strictEqual(lvl0.xpForNextLevel, 100);
  assert.strictEqual(lvl0.xpToNextLevel, 100);
  assert.strictEqual(lvl0.xpProgressPercent, 0);

  const lvl50 = calculateXpLevel(50);
  assert.strictEqual(lvl50.level, 1);
  assert.strictEqual(lvl50.xpInCurrentLevel, 50);
  assert.strictEqual(lvl50.xpToNextLevel, 50);
  assert.strictEqual(lvl50.xpProgressPercent, 50);
});

test("calculateXpLevel: levels up at exact threshold", () => {
  const lvl100 = calculateXpLevel(100);
  assert.strictEqual(lvl100.level, 2);
  assert.strictEqual(lvl100.xpInCurrentLevel, 0);
  assert.strictEqual(lvl100.xpForNextLevel, 150);
  assert.strictEqual(lvl100.xpToNextLevel, 150);
  assert.strictEqual(lvl100.xpProgressPercent, 0);
});

test("calculateXpLevel: handles high XP values correctly", () => {
  const lvl1000 = calculateXpLevel(1000);
  assert.ok(lvl1000.level > 2);
  assert.ok(lvl1000.xpProgressPercent >= 0 && lvl1000.xpProgressPercent <= 100);
});

test("calculateXpLevel: safely handles invalid or negative inputs", () => {
  const invalidNull = calculateXpLevel(null);
  assert.strictEqual(invalidNull.level, 1);

  const invalidNeg = calculateXpLevel(-500);
  assert.strictEqual(invalidNeg.level, 1);

  const invalidNaN = calculateXpLevel(NaN);
  assert.strictEqual(invalidNaN.level, 1);
});

test("getNextLevelMilestone: returns correct milestone for levels", () => {
  const m1 = getNextLevelMilestone(1);
  assert.strictEqual(m1.level, 3);

  const m3 = getNextLevelMilestone(3);
  assert.strictEqual(m3.level, 5);

  const mMax = getNextLevelMilestone(25);
  assert.strictEqual(mMax.level, 20); // Returns highest milestone
});

test("LEVEL_MILESTONES: contains expected non-empty array of milestone definitions", () => {
  assert.ok(Array.isArray(LEVEL_MILESTONES));
  assert.ok(LEVEL_MILESTONES.length >= 5);
  LEVEL_MILESTONES.forEach((m) => {
    assert.ok(typeof m.level === "number");
    assert.ok(typeof m.title === "string" && m.title.length > 0);
    assert.ok(typeof m.perk === "string" && m.perk.length > 0);
  });
});
