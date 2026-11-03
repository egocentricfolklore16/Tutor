import test from "node:test";
import assert from "node:assert";
import {
  calculateXpLevel,
  LEVEL_MILESTONES,
  getNextLevelMilestone,
} from "../src/features/gamification/utils/levelCurve.js";
import {
  generateMapNodes,
  getZoneForLevel,
  getXpRequiredForLevel,
} from "../src/features/gamification/utils/levelMilestones.js";

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
    assert.ok(typeof m.desc === "string" && m.desc.length > 0);
    assert.ok(typeof m.icon === "string" && m.icon.length > 0);
  });
});

test("calculateXpLevel: L4 requires 250 XP (50 x (level + 1)) per level curve formula", () => {
  // L1: 0 - 99 (100) -> L2: 100 - 249 (150) -> L3: 250 - 449 (200) -> L4: 450 - 699 (250)
  const lvl4Start = calculateXpLevel(450);
  assert.strictEqual(lvl4Start.level, 4);
  assert.strictEqual(lvl4Start.xpInCurrentLevel, 0);
  assert.strictEqual(lvl4Start.xpForNextLevel, 250); // 50 * (4 + 1)
  assert.strictEqual(lvl4Start.xpToNextLevel, 250);

  const lvl4Mid = calculateXpLevel(550);
  assert.strictEqual(lvl4Mid.level, 4);
  assert.strictEqual(lvl4Mid.xpInCurrentLevel, 100);
  assert.strictEqual(lvl4Mid.xpForNextLevel, 250);
  assert.strictEqual(lvl4Mid.xpToNextLevel, 150);
});

test("brand-new user (level 1, 0 XP) returns expected level state", () => {
  const brandNewUser = calculateXpLevel(0);
  assert.strictEqual(brandNewUser.level, 1);
  assert.strictEqual(brandNewUser.xpPoints, 0);
  assert.strictEqual(brandNewUser.xpInCurrentLevel, 0);
  assert.strictEqual(brandNewUser.xpForNextLevel, 100);
  assert.strictEqual(brandNewUser.xpToNextLevel, 100);
  assert.strictEqual(brandNewUser.xpProgressPercent, 0);
});

test("generateMapNodes: Level 1 user renders up to Level 5 and includes Level 20 teaser", () => {
  const nodes = generateMapNodes(1);
  assert.strictEqual(nodes[0].level, 1);
  // Milestones beyond L1 are L3 and L5 (next two milestones).
  // So max level rendered should be 5, plus 1 teaser node for L20.
  const regularNodes = nodes.filter((n) => !n.isTeaser);
  assert.strictEqual(regularNodes.length, 5);
  assert.strictEqual(regularNodes[regularNodes.length - 1].level, 5);

  const teaserNode = nodes.find((n) => n.isTeaser);
  assert.ok(teaserNode);
  assert.strictEqual(teaserNode.level, 20);
});

test("generateMapNodes: Level 12 user renders up to Level 20 without teaser", () => {
  const nodes = generateMapNodes(12);
  // Next milestone beyond L12 is L20. Max level rendered should be 20.
  const maxNode = nodes[nodes.length - 1];
  assert.strictEqual(maxNode.level, 20);
  const teaserCount = nodes.filter((n) => n.isTeaser).length;
  assert.strictEqual(teaserCount, 0);
});

test("getZoneForLevel: maps levels to correct zone names", () => {
  assert.strictEqual(getZoneForLevel(1).name, "Starter Valley");
  assert.strictEqual(getZoneForLevel(3).name, "Focus Grove");
  assert.strictEqual(getZoneForLevel(7).name, "Knowledge Citadel");
  assert.strictEqual(getZoneForLevel(15).name, "Scholar's Realm");
  assert.strictEqual(getZoneForLevel(25).name, "Legend Peak");
});

test("getXpRequiredForLevel: calculates cumulative XP for start of level", () => {
  assert.strictEqual(getXpRequiredForLevel(1), 0);
  assert.strictEqual(getXpRequiredForLevel(2), 100);
  assert.strictEqual(getXpRequiredForLevel(3), 250);
});
