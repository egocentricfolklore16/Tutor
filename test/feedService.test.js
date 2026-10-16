import test from "node:test";
import assert from "node:assert/strict";
import { fetchActivityFeed, publishActivityEvent } from "../src/features/community/services/feedService.js";

test("fetchActivityFeed is defined and exports a function", () => {
  assert.strictEqual(typeof fetchActivityFeed, "function");
});

test("publishActivityEvent validates actorId presence before sending insert", async () => {
  const result = await publishActivityEvent(null, "session_completed");
  assert.strictEqual(result, null);
});
