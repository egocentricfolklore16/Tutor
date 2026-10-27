import { test } from "node:test";
import assert from "node:assert/strict";
import { sortBadges } from "../src/features/gamification/utils/badgeUtils.js";

test("sortBadges places earned badges before unearned badges", () => {
  const input = [
    { id: 1, title: "Unearned 1", earned: false, progress: 2, target: 10 },
    { id: 2, title: "Earned 1", earned: true, unlocked_at: "2026-10-20T10:00:00Z" },
    { id: 3, title: "Unearned 2", earned: false, progress: 8, target: 10 },
  ];

  const sorted = sortBadges(input);
  assert.equal(sorted[0].id, 2);
  assert.equal(sorted[1].id, 3); // 8/10 > 2/10
  assert.equal(sorted[2].id, 1);
});

test("sortBadges sorts earned badges descending by unlock date", () => {
  const input = [
    { id: 1, title: "Earned Older", earned: true, unlocked_at: "2026-10-15T10:00:00Z" },
    { id: 2, title: "Earned Newer", earned: true, unlocked_at: "2026-10-25T10:00:00Z" },
  ];

  const sorted = sortBadges(input);
  assert.equal(sorted[0].id, 2);
  assert.equal(sorted[1].id, 1);
});

test("sortBadges sorts unearned badges descending by completion ratio", () => {
  const input = [
    { id: 1, title: "Low Progress", earned: false, progress: 1, target: 10 },
    { id: 2, title: "High Progress", earned: false, progress: 9, target: 10 },
    { id: 3, title: "Medium Progress", earned: false, progress: 5, target: 10 },
  ];

  const sorted = sortBadges(input);
  assert.equal(sorted[0].id, 2);
  assert.equal(sorted[1].id, 3);
  assert.equal(sorted[2].id, 1);
});

test("sortBadges handles null, undefined, empty array, or invalid items safely", () => {
  assert.deepEqual(sortBadges(null), []);
  assert.deepEqual(sortBadges(undefined), []);
  assert.deepEqual(sortBadges([]), []);
  assert.deepEqual(sortBadges([null, undefined, { earned: true }]), [{ earned: true }]);
});
