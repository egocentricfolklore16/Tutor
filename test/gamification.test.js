import test from "node:test";
import assert from "node:assert/strict";
import { calculateXpLevel } from "../src/features/gamification/utils/levelCurve.js";
import { GAMIFICATION_CONFIG } from "../src/features/gamification/config.js";
import { gamificationService } from "../src/features/gamification/services/gamificationService.js";

test("calculateXpLevel computes levels, thresholds, and progress accurately", () => {
  // 0 XP -> Level 1
  const lvl1 = calculateXpLevel(0);
  assert.equal(lvl1.level, 1);
  assert.equal(lvl1.xpInCurrentLevel, 0);
  assert.equal(lvl1.xpForNextLevel, 100);
  assert.equal(lvl1.xpToNextLevel, 100);
  assert.equal(lvl1.xpProgressPercent, 0);

  // 150 XP -> Level 2 (Level 1 needs 100 XP, Level 2 needs 150 XP)
  const lvl2 = calculateXpLevel(150);
  assert.equal(lvl2.level, 2);
  assert.equal(lvl2.xpInCurrentLevel, 50); // 150 - 100
  assert.equal(lvl2.xpForNextLevel, 150);  // Level 2 threshold is 150
  assert.equal(lvl2.xpToNextLevel, 100);   // 150 - 50
  assert.equal(lvl2.xpProgressPercent, 33);

  // Handles negative or invalid inputs safely
  const invalid = calculateXpLevel(-50);
  assert.equal(invalid.level, 1);
  assert.equal(invalid.xpInCurrentLevel, 0);
});

test("GAMIFICATION_CONFIG defines economy defaults and feature flags", () => {
  assert.equal(GAMIFICATION_CONFIG.xpSources.focusSession25Min, 20);
  assert.equal(GAMIFICATION_CONFIG.dailyXpCap, 500);
  assert.equal(GAMIFICATION_CONFIG.gemsEarned.dailyGoalReached, 5);
  assert.equal(GAMIFICATION_CONFIG.gemsSpent.streakFreeze, 50);
  assert.equal(GAMIFICATION_CONFIG.streak.cutoffHour, 3);
  assert.equal(typeof GAMIFICATION_CONFIG.features.dailyQuests, "boolean");
});

test("gamificationService.getQuests returns honest unavailable state when backend is pending", async () => {
  const result = await gamificationService.getQuests();
  assert.equal(result.available, false);
  assert.deepEqual(result.data, []);
  assert.ok(typeof result.message === "string");
});

test("gamificationService.getGamificationState requires a valid userId", async () => {
  const res = await gamificationService.getGamificationState(null);
  assert.equal(res.data, null);
  assert.ok(res.error instanceof Error);
});
