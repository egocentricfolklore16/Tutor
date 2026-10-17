import test from "node:test";
import assert from "node:assert/strict";
import { calculateXpLevel } from "../src/features/gamification/utils/levelCurve.js";

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
