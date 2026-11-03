import test from "node:test";
import assert from "node:assert/strict";
import supabase from "../src/lib/supabase.js";
import {
  checkAndLogStreakSlip,
  getUserStreak,
  getUserSlippingData,
  getWeekActivity,
  getDailySessionTracking,
  markSlipAsRecovered,
  updateStreakForActivity,
} from "../src/lib/streaks.js";

test("checkAndLogStreakSlip returns error when userId is missing", async () => {
  const result = await checkAndLogStreakSlip(null);
  assert.ok(result.error);
  assert.equal(result.error.message, "Missing user id");
});

test("checkAndLogStreakSlip handles missing streak record or missing last_active_date", async () => {
  const originalFrom = supabase.from;

  supabase.from = (table) => {
    if (table === "users_streaks") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      };
    }
    return originalFrom(table);
  };

  try {
    const noRecordRes = await checkAndLogStreakSlip("user_123");
    assert.ok(noRecordRes.error);

    // Test missing last_active_date
    supabase.from = (table) => {
      if (table === "users_streaks") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { user_id: "user_123", last_active_date: null }, error: null }),
            }),
          }),
        };
      }
      return originalFrom(table);
    };

    const noDateRes = await checkAndLogStreakSlip("user_123");
    assert.equal(noDateRes.wasSlipping, false);
    assert.equal(noDateRes.data, null);
  } finally {
    supabase.from = originalFrom;
  }
});

test("checkAndLogStreakSlip recognizes consecutive activity as non-slipping", async () => {
  const originalFrom = supabase.from;

  supabase.from = (table) => {
    if (table === "users_streaks") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: {
                  user_id: "user_123",
                  current_streak: 5,
                  last_active_date: "2026-05-10",
                  freeze_tokens_available: 0,
                },
                error: null,
              }),
          }),
        }),
      };
    }
    return originalFrom(table);
  };

  try {
    // Current date is 2026-05-11 (1 day gap -> same or next day activity)
    const res = await checkAndLogStreakSlip("user_123", {
      now: new Date("2026-05-11T12:00:00Z"),
      timeZone: "UTC",
    });
    assert.equal(res.wasSlipping, false);
    assert.equal(res.data, null);
  } finally {
    supabase.from = originalFrom;
  }
});

test("checkAndLogStreakSlip distinguishes streak_broken (0 freeze tokens) from missed_day (tokens available)", async () => {
  let loggedSlip = null;
  const originalFrom = supabase.from;

  const createMockFrom = (freezeTokens) => (table) => {
    if (table === "users_streaks") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: {
                  user_id: "user_123",
                  current_streak: 10,
                  last_active_date: "2026-05-08",
                  freeze_tokens_available: freezeTokens,
                },
                error: null,
              }),
          }),
        }),
      };
    }
    if (table === "streak_slipping") {
      return {
        upsert: (payload) => {
          loggedSlip = payload;
          return Promise.resolve({ error: null });
        },
      };
    }
    return originalFrom(table);
  };

  try {
    // Case 1: 2-day gap (activity on 2026-05-10) with 0 freeze tokens -> streak_broken
    supabase.from = createMockFrom(0);
    const brokenRes = await checkAndLogStreakSlip("user_123", {
      now: new Date("2026-05-10T12:00:00Z"),
      timeZone: "UTC",
    });
    assert.equal(brokenRes.wasSlipping, true);
    assert.equal(brokenRes.data.reason, "streak_broken");
    assert.equal(brokenRes.data.daysMissed, 2);
    assert.equal(loggedSlip.reason, "streak_broken");
    assert.equal(loggedSlip.slip_date, "2026-05-08");

    // Case 2: 2-day gap (activity on 2026-05-10) with 1 freeze token -> missed_day
    loggedSlip = null;
    supabase.from = createMockFrom(1);
    const missedRes = await checkAndLogStreakSlip("user_123", {
      now: new Date("2026-05-10T12:00:00Z"),
      timeZone: "UTC",
    });
    assert.equal(missedRes.wasSlipping, true);
    assert.equal(missedRes.data.reason, "missed_day");
    assert.equal(missedRes.data.daysMissed, 2);
    assert.equal(loggedSlip.reason, "missed_day");

    // Case 3: 4-day gap (activity on 2026-05-12) -> missed_day regardless of tokens
    loggedSlip = null;
    supabase.from = createMockFrom(2);
    const multiDayRes = await checkAndLogStreakSlip("user_123", {
      now: new Date("2026-05-12T12:00:00Z"),
      timeZone: "UTC",
    });
    assert.equal(multiDayRes.wasSlipping, true);
    assert.equal(multiDayRes.data.reason, "missed_day");
    assert.equal(multiDayRes.data.daysMissed, 4);
  } finally {
    supabase.from = originalFrom;
  }
});

test("getUserStreak validates input and fetches users_streaks record", async () => {
  const noIdRes = await getUserStreak(null);
  assert.ok(noIdRes.error);

  const originalFrom = supabase.from;
  supabase.from = (table) => {
    if (table === "users_streaks") {
      return {
        select: () => ({
          eq: (col, val) => ({
            maybeSingle: () =>
              Promise.resolve({
                data: { user_id: val, current_streak: 7, longest_streak: 12, last_active_date: "2026-05-10", freeze_tokens_available: 2 },
                error: null,
              }),
          }),
        }),
      };
    }
    return originalFrom(table);
  };

  try {
    const res = await getUserStreak("user_abc");
    assert.equal(res.error, null);
    assert.equal(res.data.current_streak, 7);
    assert.equal(res.data.longest_streak, 12);
  } finally {
    supabase.from = originalFrom;
  }
});

test("getUserSlippingData queries streak_slipping table with limit and ordering", async () => {
  const noIdRes = await getUserSlippingData(null);
  assert.ok(noIdRes.error);

  const originalFrom = supabase.from;
  let queriedLimit = null;

  supabase.from = (table) => {
    if (table === "streak_slipping") {
      return {
        select: () => ({
          eq: (col, val) => ({
            order: () => ({
              limit: (l) => {
                queriedLimit = l;
                return Promise.resolve({
                  data: [{ id: "slip_1", user_id: val, reason: "missed_day", slip_date: "2026-05-08" }],
                  error: null,
                });
              },
            }),
          }),
        }),
      };
    }
    return originalFrom(table);
  };

  try {
    const res = await getUserSlippingData("user_abc", 5);
    assert.equal(res.error, null);
    assert.equal(queriedLimit, 5);
    assert.equal(res.data.length, 1);
    assert.equal(res.data[0].reason, "missed_day");
  } finally {
    supabase.from = originalFrom;
  }
});

test("getWeekActivity constructs 7-day Sunday-Saturday boolean array for active days", async () => {
  // Wednesday May 13, 2026
  // Sunday = May 10, Mon = May 11, Tue = May 12, Wed = May 13, Thu = May 14, Fri = May 15, Sat = May 16
  const mockNow = new Date("2026-05-13T12:00:00Z");

  const emptyRes = await getWeekActivity(null, { current_streak: 5 });
  assert.deepEqual(emptyRes, [false, false, false, false, false, false, false]);

  const zeroStreakRes = await getWeekActivity("user_123", { current_streak: 0 });
  assert.deepEqual(zeroStreakRes, [false, false, false, false, false, false, false]);

  const originalFrom = supabase.from;

  supabase.from = (table) => {
    if (table === "daily_session_tracking") {
      return {
        select: () => ({
          eq: () => ({
            gte: () => ({
              lte: () =>
                Promise.resolve({
                  data: [
                    { activity_date: "2026-05-10", met_daily_goal: true }, // Sunday
                    { activity_date: "2026-05-12", met_daily_goal: true }, // Tuesday
                  ],
                }),
            }),
          }),
        }),
      };
    }
    return originalFrom(table);
  };

  try {
    const streakData = { current_streak: 3, last_active_date: "2026-05-13" }; // Wed
    const week = await getWeekActivity("user_123", streakData, { now: mockNow });

    // Expect: Sun(true), Mon(false), Tue(true), Wed(true via last_active_date), Thu(false), Fri(false), Sat(false)
    assert.deepEqual(week, [true, false, true, true, false, false, false]);
  } finally {
    supabase.from = originalFrom;
  }
});

test("getDailySessionTracking validates user ID and queries range", async () => {
  const noIdRes = await getDailySessionTracking(null);
  assert.ok(noIdRes.error);

  const originalFrom = supabase.from;
  let queryGteDate = null;

  supabase.from = (table) => {
    if (table === "daily_session_tracking") {
      return {
        select: () => ({
          eq: () => ({
            gte: (col, val) => {
              queryGteDate = val;
              return {
                order: () =>
                  Promise.resolve({
                    data: [{ activity_date: "2026-05-10", sessions_completed: 2 }],
                    error: null,
                  }),
              };
            },
          }),
        }),
      };
    }
    return originalFrom(table);
  };

  try {
    const res = await getDailySessionTracking("user_123", 10, { now: new Date("2026-05-15T12:00:00Z") });
    assert.equal(res.error, null);
    assert.equal(queryGteDate, "2026-05-05");
    assert.equal(res.data.length, 1);
  } finally {
    supabase.from = originalFrom;
  }
});

test("markSlipAsRecovered validates inputs and updates recovered_at timestamp", async () => {
  const invalidRes = await markSlipAsRecovered(null, "slip_123");
  assert.ok(invalidRes.error);

  const originalFrom = supabase.from;
  let updatePayload = null;

  supabase.from = (table) => {
    if (table === "streak_slipping") {
      return {
        update: (payload) => {
          updatePayload = payload;
          return {
            eq: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        },
      };
    }
    return originalFrom(table);
  };

  try {
    const res = await markSlipAsRecovered("user_123", "slip_456");
    assert.equal(res.error, null);
    assert.ok(updatePayload.recovered_at);
  } finally {
    supabase.from = originalFrom;
  }
});

test("updateStreakForActivity executes RPC and falls back to users_streaks upsert on failure", async () => {
  const noIdRes = await updateStreakForActivity(null);
  assert.ok(noIdRes.error);

  const originalRpc = supabase.rpc;
  const originalFrom = supabase.from;

  let rpcParams = null;
  supabase.rpc = (fnName, params) => {
    rpcParams = { fnName, params };
    return Promise.resolve({ data: { current_streak: 8, longest_streak: 10 }, error: null });
  };

  try {
    // Successful RPC execution
    const res = await updateStreakForActivity("user_123", { timeZone: "UTC", cutoffHour: 3 });
    assert.equal(res.error, null);
    assert.equal(rpcParams.fnName, "update_user_streak");
    assert.equal(rpcParams.params.activity_user_id, "user_123");

    // Test RPC failure triggering direct fallback upsert
    supabase.rpc = () => Promise.resolve({ data: null, error: new Error("RPC failure") });

    let upsertPayload = null;
    supabase.from = (table) => {
      if (table === "users_streaks") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    user_id: "user_123",
                    current_streak: 5,
                    longest_streak: 8,
                    last_active_date: "2026-05-10",
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
                maybeSingle: () => Promise.resolve({ data: { ...payload }, error: null }),
              }),
            };
          },
        };
      }
      return originalFrom(table);
    };

    const fallbackRes = await updateStreakForActivity("user_123", {
      now: new Date("2026-05-11T12:00:00Z"),
      timeZone: "UTC",
    });

    assert.equal(fallbackRes.error, null);
    assert.equal(upsertPayload.current_streak, 6);
    assert.equal(upsertPayload.last_active_date, "2026-05-11");
  } finally {
    supabase.rpc = originalRpc;
    supabase.from = originalFrom;
  }
});
