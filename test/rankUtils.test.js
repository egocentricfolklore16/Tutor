import test from "node:test";
import assert from "node:assert/strict";
import { formatMetricValue, getWeeklyResetCountdown } from "../src/features/community/utils/rankUtils.js";
import { fetchLeaderboardData } from "../src/features/community/services/leaderboardService.js";
import supabase from "../src/lib/supabase.js";

test("formatMetricValue formats XP values accurately", () => {
  assert.equal(formatMetricValue(0, "xp"), "0 XP");
  assert.equal(formatMetricValue(350, "xp"), "350 XP");
  assert.equal(formatMetricValue(1250, "xp"), "1,250 XP");
  assert.equal(formatMetricValue(9999, "xp"), "9,999 XP");
  assert.equal(formatMetricValue(10000, "xp"), "10.0k XP");
  assert.equal(formatMetricValue(12400, "xp"), "12.4k XP");
  assert.equal(formatMetricValue(123456, "xp"), "123.5k XP");
  assert.equal(formatMetricValue(null, "xp"), "0 XP");
  assert.equal(formatMetricValue(undefined, "xp"), "0 XP");
  assert.equal(formatMetricValue("invalid", "xp"), "0 XP");
});

test("formatMetricValue formats hours values accurately", () => {
  assert.equal(formatMetricValue(0, "hours"), "0m");
  assert.equal(formatMetricValue(0.25, "hours"), "15m");
  assert.equal(formatMetricValue(0.5, "hours"), "30m");
  assert.equal(formatMetricValue(1, "hours"), "1h");
  assert.equal(formatMetricValue(2.5, "hours"), "2h 30m");
  assert.equal(formatMetricValue(10, "hours"), "10h");
  assert.equal(formatMetricValue(null, "hours"), "0m");
  assert.equal(formatMetricValue("abc", "hours"), "0m");
});

test("formatMetricValue formats streak values with singular and plural forms", () => {
  assert.equal(formatMetricValue(0, "streak"), "0 days");
  assert.equal(formatMetricValue(1, "streak"), "1 day");
  assert.equal(formatMetricValue(5, "streak"), "5 days");
  assert.equal(formatMetricValue(null, "streak"), "0 days");
  assert.equal(formatMetricValue(undefined, "streak"), "0 days");
});

test("formatMetricValue falls back safely for unknown metrics", () => {
  assert.equal(formatMetricValue(100, "unknown_metric"), "100");
  assert.equal(formatMetricValue(null, "unknown_metric"), "0");
});

test("getWeeklyResetCountdown computes exact reset countdown across time boundaries", () => {
  // Sunday 23:00 UTC (1 hour before reset)
  const sunNight = new Date("2026-05-17T23:00:00Z");
  assert.equal(getWeeklyResetCountdown(sunNight), "0d 1h");

  // Monday 00:00 UTC (exact reset moment)
  const monStart = new Date("2026-05-18T00:00:00Z");
  assert.equal(getWeeklyResetCountdown(monStart), "7d 0h");

  // Monday 01:00 UTC (1 hour after reset)
  const monAfter = new Date("2026-05-18T01:00:00Z");
  assert.equal(getWeeklyResetCountdown(monAfter), "6d 23h");

  // Wednesday 12:00 UTC (mid-week)
  const wedMid = new Date("2026-05-20T12:00:00Z");
  assert.equal(getWeeklyResetCountdown(wedMid), "4d 12h");

  // Saturday 18:00 UTC
  const satEve = new Date("2026-05-23T18:00:00Z");
  assert.equal(getWeeklyResetCountdown(satEve), "1d 6h");

  // Month rollover boundary (May 31, 2026 Sunday 20:00 UTC -> next Mon Jun 1)
  const monthRollover = new Date("2026-05-31T20:00:00Z");
  assert.equal(getWeeklyResetCountdown(monthRollover), "0d 4h");

  // Year rollover boundary (Dec 31, 2025 Wednesday 20:00 UTC -> next Mon Jan 5 2026)
  const yearRollover = new Date("2025-12-31T20:00:00Z");
  assert.equal(getWeeklyResetCountdown(yearRollover), "4d 4h");

  // Fallback for invalid input
  assert.ok(typeof getWeeklyResetCountdown(null) === "string");
  assert.ok(typeof getWeeklyResetCountdown("invalid_date") === "string");
});

test("fetchLeaderboardData maps Supabase get_leaderboard RPC response to formatted entries and user details", async () => {
  const originalRpc = supabase.rpc;

  supabase.rpc = (fnName, params) => {
    assert.equal(fnName, "get_leaderboard");
    assert.equal(params.p_scope, "global");
    assert.equal(params.p_period, "weekly");
    assert.equal(params.p_metric, "xp");
    assert.equal(params.p_limit, 10);

    return Promise.resolve({
      data: {
        entries: [
          {
            user_id: "user_1",
            username: "Alice",
            full_name: "Alice Smith",
            user_img: "https://example.com/alice.jpg",
            rank: 1,
            rank_change: 2,
            value: "1500",
            level: "5",
            is_me: false,
          },
          {
            user_id: "user_2",
            username: null,
            full_name: null,
            user_img: null,
            rank: 2,
            rank_change: null,
            value: null,
            level: null,
            is_me: true,
          },
        ],
        me: {
          user_id: "user_2",
          username: "You",
          full_name: "You",
          user_img: null,
          rank: 2,
          rank_change: 0,
          value: "1000",
          level: "3",
        },
      },
      error: null,
    });
  };

  try {
    const result = await fetchLeaderboardData({ scope: "global", period: "weekly", metric: "xp", limit: 10 });

    assert.equal(result.entries.length, 2);

    assert.equal(result.entries[0].user_id, "user_1");
    assert.equal(result.entries[0].username, "Alice");
    assert.equal(result.entries[0].full_name, "Alice Smith");
    assert.equal(result.entries[0].rank, 1);
    assert.equal(result.entries[0].rank_change, 2);
    assert.equal(result.entries[0].value, 1500);
    assert.equal(result.entries[0].level, 5);
    assert.equal(result.entries[0].is_me, false);

    // Fallbacks for missing/null fields
    assert.equal(result.entries[1].username, "Learner");
    assert.equal(result.entries[1].full_name, "Learner");
    assert.equal(result.entries[1].rank_change, 0);
    assert.equal(result.entries[1].value, 0);
    assert.equal(result.entries[1].level, 1);
    assert.equal(result.entries[1].is_me, true);

    // Me profile mapping
    assert.ok(result.me);
    assert.equal(result.me.user_id, "user_2");
    assert.equal(result.me.rank, 2);
    assert.equal(result.me.value, 1000);
    assert.equal(result.me.level, 3);
    assert.equal(result.me.is_me, true);
  } finally {
    supabase.rpc = originalRpc;
  }
});

test("fetchLeaderboardData handles RPC error gracefully", async () => {
  const originalRpc = supabase.rpc;

  supabase.rpc = () => Promise.resolve({ data: null, error: { message: "RPC error" } });

  try {
    await assert.rejects(
      () => fetchLeaderboardData({ scope: "global" }),
      (err) => err.message === "RPC error"
    );
  } finally {
    supabase.rpc = originalRpc;
  }
});
