import test from "node:test";
import assert from "node:assert/strict";
import { gamificationService } from "../src/features/gamification/services/gamificationService.js";

test("gamificationService.getBadges returns fallback badges when userId is missing", async () => {
  const result = await gamificationService.getBadges(null);
  assert.equal(result.available, true);
  assert.equal(result.isFallback, true);
  assert.ok(Array.isArray(result.data));
  assert.ok(result.data.length >= 3);

  const firstBadge = result.data[0];
  assert.ok(firstBadge.id);
  assert.ok(firstBadge.title);
  assert.ok(firstBadge.description);
  assert.equal(typeof firstBadge.earned, "boolean");
});

test("gamificationService.getBadges returns fallback badges when RPC throws or returns empty", async () => {
  const result = await gamificationService.getBadges("user_123");
  assert.equal(result.available, true);
  assert.equal(typeof result.isFallback, "boolean");
  assert.ok(Array.isArray(result.data));
  assert.ok(result.data.length >= 3);
});
