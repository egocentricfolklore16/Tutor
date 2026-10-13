import { test } from "node:test";
import assert from "node:assert/strict";

function getGroupCardState({ isMember, isPending, isCooldown, privacy }) {
  if (isMember) return "member";
  if (isPending) return "pending";
  if (isCooldown) return "cooldown";
  if (privacy === "public") return "join_public";
  return "request_private";
}

function computeCooldownDaysLeft(decidedAtISO, nowISO = new Date().toISOString()) {
  if (!decidedAtISO) return 0;
  const decidedMs = new Date(decidedAtISO).getTime();
  const nowMs = new Date(nowISO).getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const diffMs = decidedMs + sevenDaysMs - nowMs;

  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

test("getGroupCardState identifies member status", () => {
  const state = getGroupCardState({ isMember: true, isPending: false, isCooldown: false, privacy: "public" });
  assert.equal(state, "member");
});

test("getGroupCardState identifies pending join request status", () => {
  const state = getGroupCardState({ isMember: false, isPending: true, isCooldown: false, privacy: "private" });
  assert.equal(state, "pending");
});

test("getGroupCardState identifies active cooldown status after decline", () => {
  const state = getGroupCardState({ isMember: false, isPending: false, isCooldown: true, privacy: "private" });
  assert.equal(state, "cooldown");
});

test("getGroupCardState identifies public group instant join state", () => {
  const state = getGroupCardState({ isMember: false, isPending: false, isCooldown: false, privacy: "public" });
  assert.equal(state, "join_public");
});

test("getGroupCardState identifies private group request state", () => {
  const state = getGroupCardState({ isMember: false, isPending: false, isCooldown: false, privacy: "private" });
  assert.equal(state, "request_private");
});

test("computeCooldownDaysLeft calculates 7-day cooldown remaining accurately", () => {
  const now = new Date("2025-05-25T12:00:00Z");
  const threeDaysAgo = new Date("2025-05-22T12:00:00Z").toISOString();
  const eightDaysAgo = new Date("2025-05-17T12:00:00Z").toISOString();

  assert.equal(computeCooldownDaysLeft(threeDaysAgo, now.toISOString()), 4);
  assert.equal(computeCooldownDaysLeft(eightDaysAgo, now.toISOString()), 0);
});
