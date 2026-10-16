import test from "node:test";
import assert from "node:assert/strict";
import { calculateXpLevel } from "../src/features/gamification/utils/levelCurve.js";
import { GAMIFICATION_CONFIG } from "../src/features/gamification/config.js";

test("calculateXpLevel computes correct levels for XP boundaries", () => {
  // Level 1: 0 - 99 XP
  assert.deepEqual(calculateXpLevel(0), {
    level: 1,
    xpPoints: 0,
    xpInCurrentLevel: 0,
    xpForNextLevel: 100,
    xpToNextLevel: 100,
    xpProgressPercent: 0,
  });

  assert.equal(calculateXpLevel(99).level, 1);
  assert.equal(calculateXpLevel(99).xpProgressPercent, 99);

  // Level 2: 100 - 249 XP
  assert.equal(calculateXpLevel(100).level, 2);
  assert.equal(calculateXpLevel(100).xpInCurrentLevel, 0);
  assert.equal(calculateXpLevel(100).xpForNextLevel, 150);

  // Level 3: 250+ XP
  assert.equal(calculateXpLevel(250).level, 3);
});

test("calculateXpLevel handles negative, invalid, or non-numeric inputs safely", () => {
  assert.equal(calculateXpLevel(-50).level, 1);
  assert.equal(calculateXpLevel(null).level, 1);
  assert.equal(calculateXpLevel(undefined).level, 1);
  assert.equal(calculateXpLevel("invalid").level, 1);
});

test("GAMIFICATION_CONFIG defines economy defaults and feature flags", () => {
  assert.equal(GAMIFICATION_CONFIG.streak.cutoffHour, 3);
  assert.equal(GAMIFICATION_CONFIG.gemsSpent.streakFreeze, 50);
  assert.equal(GAMIFICATION_CONFIG.features.dailyQuests, false);
});
