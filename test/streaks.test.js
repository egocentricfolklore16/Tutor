import test from "node:test";
import assert from "node:assert/strict";
import {
  checkAndLogStreakSlip,
  updateStreakForActivity,
  getWeekActivity,
  getUserSlippingData,
  markSlipAsRecovered,
} from "../src/lib/streaks.js";
import { getActivityDate } from "../src/lib/streaksCore.js";
import supabase from "../src/lib/supabase.js";

test("checkAndLogStreakSlip returns error when userId is missing or no streak data found", async () => {
  const missingUserRes = await checkAndLogStreakSlip(null);
  assert.ok(missingUserRes.error);
  assert.equal(missingUserRes.error.message, "Missing user id");

  const originalFrom = supabase.from;
  supabase.from = (_tableName) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: () => Promise.resolve({ data: null, error: new Error("DB Error") }),
      }),
    }),
  });

  try {
    const noStreakRes = await checkAndLogStreakSlip("user_123");
    assert.ok(noStreakRes.error);
  } finally {
    supabase.from = originalFrom;
  }
});

test("checkAndLogStreakSlip returns wasSlipping: false when last_active_date is missing or <= 1 day gap", async () => {
  const originalFrom = supabase.from;
  const todayStr = getActivityDate(new Date(), "UTC", 3);

  supabase.from = (_tableName) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: () => Promise.resolve({
          data: {
            current_streak: 5,
            longest_streak: 10,
            last_active_date: todayStr, // Same date -> 0 days gap
            freeze_tokens_available: 0,
          },
          error: null,
        }),
      }),
    }),
  });

  try {
    const sameDay = await checkAndLogStreakSlip("user_123", { timeZone: "UTC" });
    assert.equal(sameDay.wasSlipping, false);
    assert.equal(sameDay.data, null);
  } finally {
    supabase.from = originalFrom;
  }
});

test("checkAndLogStreakSlip correctly detects streak_broken vs missed_day reasons", async () => {
  const originalFrom = supabase.from;
  let upsertedRecord = null;

  // Compute deterministic last_active_date exactly 2 days before current cutoff activity date
  const todayStr = getActivityDate(new Date(), "UTC", 3);
  const todayMs = new Date(`${todayStr}T00:00:00Z`).getTime();
  const twoDaysAgoStr = new Date(todayMs - 2 * 86400000).toISOString().split("T")[0];

  supabase.from = (tableName) => {
    if (tableName === "users_streaks") {
      return {
        select: () => ({
          eq: (_col, _val) => ({
            maybeSingle: () => Promise.resolve({
              data: {
                current_streak: 5,
                longest_streak: 10,
                last_active_date: twoDaysAgoStr,
                freeze_tokens_available: 0,
              },
              error: null,
            }),
          }),
        }),
      };
    }
    if (tableName === "streak_slipping") {
      return {
        upsert: (payload) => {
          upsertedRecord = payload;
          return Promise.resolve({ error: null });
        },
      };
    }
    return originalFrom(tableName);
  };

  try {
    // 2 days gap with 0 freeze tokens -> streak_broken
    const res1 = await checkAndLogStreakSlip("user_123", { timeZone: "UTC" });
    assert.equal(res1.wasSlipping, true);
    assert.equal(res1.data.reason, "streak_broken");
    assert.equal(res1.data.daysMissed, 2);
    assert.equal(upsertedRecord.reason, "streak_broken");

    // 2 days gap WITH freeze tokens available -> reason: "missed_day"
    supabase.from = (tableName) => {
      if (tableName === "users_streaks") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({
                data: {
                  current_streak: 5,
                  longest_streak: 10,
                  last_active_date: twoDaysAgoStr,
                  freeze_tokens_available: 1, // Freeze token present!
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (tableName === "streak_slipping") {
        return {
          upsert: (payload) => {
            upsertedRecord = payload;
            return Promise.resolve({ error: null });
          },
        };
      }
      return originalFrom(tableName);
    };

    const res2 = await checkAndLogStreakSlip("user_123", { timeZone: "UTC" });
    assert.equal(res2.wasSlipping, true);
    assert.equal(upsertedRecord.reason, "missed_day");
    assert.equal(res2.data.reason, "missed_day", "Returned data reason should be 'missed_day' when freeze token is available");
  } finally {
    supabase.from = originalFrom;
  }
});

test("updateStreakForActivity returns error when userId is missing", async () => {
  const result = await updateStreakForActivity(null);
  assert.ok(result.error);
  assert.equal(result.error.message, "Missing user id");
});

test("updateStreakForActivity dispatches window event and handles RPC fallback", async () => {
  let eventDispatched = false;
  const originalWindow = globalThis.window;

  globalThis.window = {
    dispatchEvent: () => {
      eventDispatched = true;
    },
  };

  const originalRpc = supabase.rpc;
  const originalFrom = supabase.from;

  // RPC fails, triggers fallback querying users_streaks and upserting calculateStreakUpdate result
  supabase.rpc = () => Promise.resolve({ data: null, error: new Error("RPC Not Found") });

  const todayStr = getActivityDate(new Date(), "UTC", 3);
  const todayMs = new Date(`${todayStr}T00:00:00Z`).getTime();
  const yesterdayStr = new Date(todayMs - 86400000).toISOString().split("T")[0];

  let upsertPayload = null;

  supabase.from = (tableName) => {
    if (tableName === "users_streaks") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({
              data: {
                current_streak: 2,
                longest_streak: 5,
                last_active_date: yesterdayStr,
                freeze_tokens_available: 0,
              },
              error: null,
            }),
          }),
        }),
        upsert: (payload) => {
          upsertPayload = payload;
          return {
            select: () => ({
              maybeSingle: () => Promise.resolve({
                data: { ...payload, user_id: "u123" },
                error: null,
              }),
            }),
          };
        },
      };
    }
    return originalFrom(tableName);
  };

  try {
    const res = await updateStreakForActivity("u123", { timeZone: "UTC" });
    assert.equal(res.error, null);
    assert.ok(upsertPayload);
    assert.equal(upsertPayload.current_streak, 3);
    assert.equal(eventDispatched, true);
  } finally {
    supabase.rpc = originalRpc;
    supabase.from = originalFrom;
    globalThis.window = originalWindow;
  }
});

test("getWeekActivity returns empty 7-boolean array for missing user or zero streak", async () => {
  const res1 = await getWeekActivity(null, { current_streak: 5 });
  assert.deepEqual(res1, [false, false, false, false, false, false, false]);

  const res2 = await getWeekActivity("u1", { current_streak: 0 });
  assert.deepEqual(res2, [false, false, false, false, false, false, false]);
});

test("getUserSlippingData and markSlipAsRecovered validate inputs and run queries", async () => {
  const noUserSlipping = await getUserSlippingData(null);
  assert.ok(noUserSlipping.error);

  const noUserMark = await markSlipAsRecovered(null, "slip_1");
  assert.ok(noUserMark.error);

  const noSlipMark = await markSlipAsRecovered("u1", null);
  assert.ok(noSlipMark.error);

  const originalFrom = supabase.from;
  let updateParams = null;

  supabase.from = (tableName) => {
    if (tableName === "streak_slipping") {
      return {
        update: (payload) => {
          updateParams = payload;
          return {
            eq: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        },
      };
    }
    return originalFrom(tableName);
  };

  try {
    const markRes = await markSlipAsRecovered("u123", "slip_456");
    assert.equal(markRes.error, null);
    assert.ok(updateParams.recovered_at);
  } finally {
    supabase.from = originalFrom;
  }
});
