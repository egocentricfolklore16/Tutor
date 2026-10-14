import test from "node:test";
import assert from "node:assert/strict";
import { calculateXpLevel, awardUserRewards } from "../src/lib/gamification.js";
import supabase from "../src/lib/supabase.js";

test("calculateXpLevel correctly calculates level boundaries and progress percentages", () => {
  // Level 1: 0 to 99 XP
  const level1Min = calculateXpLevel(0);
  assert.equal(level1Min.level, 1);
  assert.equal(level1Min.xpInCurrentLevel, 0);
  assert.equal(level1Min.xpForNextLevel, 100);
  assert.equal(level1Min.xpToNextLevel, 100);
  assert.equal(level1Min.xpProgressPercent, 0);

  const level1Max = calculateXpLevel(99);
  assert.equal(level1Max.level, 1);
  assert.equal(level1Max.xpInCurrentLevel, 99);
  assert.equal(level1Max.xpForNextLevel, 100);
  assert.equal(level1Max.xpToNextLevel, 1);
  assert.equal(level1Max.xpProgressPercent, 99);

  // Level 2: 100 to 249 XP (+150 XP needed for level 3)
  const level2Start = calculateXpLevel(100);
  assert.equal(level2Start.level, 2);
  assert.equal(level2Start.xpInCurrentLevel, 0);
  assert.equal(level2Start.xpForNextLevel, 150);
  assert.equal(level2Start.xpToNextLevel, 150);
  assert.equal(level2Start.xpProgressPercent, 0);

  const level2Mid = calculateXpLevel(175);
  assert.equal(level2Mid.level, 2);
  assert.equal(level2Mid.xpInCurrentLevel, 75);
  assert.equal(level2Mid.xpForNextLevel, 150);
  assert.equal(level2Mid.xpToNextLevel, 75);
  assert.equal(level2Mid.xpProgressPercent, 50);

  // Level 3: 250 to 449 XP (+200 XP needed for level 4)
  const level3Start = calculateXpLevel(250);
  assert.equal(level3Start.level, 3);
  assert.equal(level3Start.xpInCurrentLevel, 0);
  assert.equal(level3Start.xpForNextLevel, 200);

  // High XP calculation
  const highXp = calculateXpLevel(5000);
  assert.ok(highXp.level > 10);
  assert.ok(highXp.xpProgressPercent >= 0 && highXp.xpProgressPercent <= 100);
});

test("awardUserRewards returns error if userId is missing", async () => {
  const res = await awardUserRewards(null);
  assert.ok(res.error);
  assert.equal(res.error.message, "Missing user id");
});

test("awardUserRewards invokes award_user_rewards RPC with correct parameters", async () => {
  let rpcCall = null;
  const originalRpc = supabase.rpc;

  supabase.rpc = (fnName, params) => {
    rpcCall = { fnName, params };
    return Promise.resolve({
      data: { xp_points: 150, gems: 20 },
      error: null,
    });
  };

  let eventDispatched = false;
  let eventDetail = null;

  const mockWindow = {
    dispatchEvent: (event) => {
      eventDispatched = true;
      eventDetail = event.detail;
    },
    CustomEvent: class CustomEvent {
      constructor(type, options) {
        this.type = type;
        this.detail = options?.detail;
      }
    },
  };

  const originalWindow = globalThis.window;
  globalThis.window = mockWindow;

  try {
    const res = await awardUserRewards("user_test_123", { xp: 50, gems: 10 });
    assert.equal(res.error, null);
    assert.equal(rpcCall.fnName, "award_user_rewards");
    assert.equal(rpcCall.params.activity_user_id, "user_test_123");
    assert.equal(rpcCall.params.xp_amount, 50);
    assert.equal(rpcCall.params.gems_amount, 10);
    assert.equal(res.data.xp_points, 150);
    assert.equal(eventDispatched, true);
    assert.deepEqual(eventDetail, { xp: 50, gems: 10 });
  } finally {
    supabase.rpc = originalRpc;
    globalThis.window = originalWindow;
  }
});

test("awardUserRewards falls back to direct profile update when RPC fails", async () => {
  const originalRpc = supabase.rpc;
  const originalFrom = supabase.from;

  supabase.rpc = () => Promise.resolve({ data: null, error: new Error("RPC failed") });

  let updatedPayload = null;

  supabase.from = (table) => {
    if (table === "profiles") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: { xp_points: 100, gems: 5 },
                error: null,
              }),
          }),
        }),
        update: (payload) => {
          updatedPayload = payload;
          return {
            eq: () => ({
              select: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { xp_points: payload.xp_points, gems: payload.gems },
                    error: null,
                  }),
              }),
            }),
          };
        },
      };
    }
    return originalFrom(table);
  };

  try {
    const res = await awardUserRewards("user_fallback_456", { xp: 25, gems: 5 });
    assert.equal(res.error, null);
    assert.equal(updatedPayload.xp_points, 125);
    assert.equal(updatedPayload.gems, 10);
    assert.equal(res.data.xp_points, 125);
    assert.equal(res.data.gems, 10);
  } finally {
    supabase.rpc = originalRpc;
    supabase.from = originalFrom;
  }
});
