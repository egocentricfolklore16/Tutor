import test from "node:test";
import assert from "node:assert/strict";
import { sortBadges } from "../src/features/gamification/utils/badgeUtils.js";

test("sortBadges sorts earned badges first by unlocked_at descending", () => {
  const sampleBadges = [
    { id: 1, title: "Unearned 1", earned: false, progress: 2, target: 10 },
    { id: 2, title: "Earned Old", earned: true, unlocked_at: "2026-01-01T00:00:00Z" },
    { id: 3, title: "Earned New", earned: true, unlocked_at: "2026-05-01T00:00:00Z" },
  ];

  const sorted = sortBadges(sampleBadges);
  assert.equal(sorted[0].title, "Earned New");
  assert.equal(sorted[1].title, "Earned Old");
  assert.equal(sorted[2].title, "Unearned 1");
});

test("sortBadges sorts unearned badges by progress ratio descending", () => {
  const sampleBadges = [
    { id: 1, title: "20% Done", earned: false, progress: 2, target: 10 },
    { id: 2, title: "80% Done", earned: false, progress: 8, target: 10 },
    { id: 3, title: "50% Done", earned: false, progress: 5, target: 10 },
  ];

  const sorted = sortBadges(sampleBadges);
  assert.equal(sorted[0].title, "80% Done");
  assert.equal(sorted[1].title, "50% Done");
  assert.equal(sorted[2].title, "20% Done");
});

test("sortBadges safely handles empty or non-array inputs", () => {
  assert.deepEqual(sortBadges(null), []);
  assert.deepEqual(sortBadges(undefined), []);
  assert.deepEqual(sortBadges([]), []);
});
