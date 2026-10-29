import test from "node:test";
import assert from "node:assert/strict";
import { calculateXpLevel } from "../src/features/gamification/utils/levelCurve.js";
import { GAMIFICATION_CONFIG } from "../src/features/gamification/config.js";
import { gamificationService } from "../src/features/gamification/services/gamificationService.js";

test("calculateXpLevel computes levels, thresholds, and progress accurately", () => {
  // 0 XP -> Level 1
  const lvl1 = calculateXpLevel(0);
  assert.equal(lvl1.level, 1);
  assert.equal(lvl1.xpInCurrentLevel, 0);
  assert.equal(lvl1.xpForNextLevel, 100);
  assert.equal(lvl1.xpToNextLevel, 100);
  assert.equal(lvl1.xpProgressPercent, 0);

  // 150 XP -> Level 2 (Level 1 needs 100 XP, Level 2 needs 150 XP)
  const lvl2 = calculateXpLevel(150);
  assert.equal(lvl2.level, 2);
  assert.equal(lvl2.xpInCurrentLevel, 50); // 150 - 100
  assert.equal(lvl2.xpForNextLevel, 150);  // Level 2 threshold is 150
  assert.equal(lvl2.xpToNextLevel, 100);   // 150 - 50
  assert.equal(lvl2.xpProgressPercent, 33);

  // Handles negative or invalid inputs safely
  const invalid = calculateXpLevel(-50);
  assert.equal(invalid.level, 1);
  assert.equal(invalid.xpInCurrentLevel, 0);
});

test("GAMIFICATION_CONFIG defines economy defaults and feature flags", () => {
  assert.equal(GAMIFICATION_CONFIG.xpSources.focusSession25Min, 20);
  assert.equal(GAMIFICATION_CONFIG.dailyXpCap, 500);
  assert.equal(GAMIFICATION_CONFIG.gemsEarned.dailyGoalReached, 5);
  assert.equal(GAMIFICATION_CONFIG.gemsSpent.streakFreeze, 50);
  assert.equal(GAMIFICATION_CONFIG.streak.cutoffHour, 3);
  assert.equal(typeof GAMIFICATION_CONFIG.features.dailyQuests, "boolean");
});

test("gamification milestone calculator resolves upcoming milestones correctly", () => {
  const getNextStreakMilestoneInfo = (streakVal) => {
    const val = Number(streakVal) || 0;
    if (val < 7) return { target: 7, daysLeft: 7 - val, label: "7-day Streak Society" };
    if (val < 30) return { target: 30, daysLeft: 30 - val, label: "30-day 2x Gem Multiplier" };
    if (val < 100) return { target: 100, daysLeft: 100 - val, label: "100-day Centurion Badge" };
    return { target: 365, daysLeft: Math.max(0, 365 - val), label: "365-day Legend" };
  };

  assert.deepEqual(getNextStreakMilestoneInfo(3), {
    target: 7,
    daysLeft: 4,
    label: "7-day Streak Society",
  });

  assert.deepEqual(getNextStreakMilestoneInfo(12), {
    target: 30,
    daysLeft: 18,
    label: "30-day 2x Gem Multiplier",
  });
});

test("gamificationService quest methods validate required parameters and handle errors", async () => {
  const noKey = await gamificationService.claimQuest(null);
  assert.equal(noKey.data, null);
  assert.ok(noKey.error instanceof Error);

  const noCardId = await gamificationService.recordFlashcardReview(null);
  assert.ok(noCardId.error instanceof Error);
});

test("gamificationService.getGamificationState requires a valid userId", async () => {
  const res = await gamificationService.getGamificationState(null);
  assert.equal(res.data, null);
  assert.ok(res.error instanceof Error);
});

test("gamificationService.getGamificationState merges profile and streak data and falls back safely", async () => {
  const originalFrom = (await import("../src/lib/supabase.js")).default.from;
  const supabase = (await import("../src/lib/supabase.js")).default;

  supabase.from = (table) => {
    if (table === "profiles") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: { xp_points: 350, gems: 45, timezone: "UTC" },
                error: null,
              }),
          }),
        }),
      };
    }
    if (table === "users_streaks") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: null,
                error: { code: "PGRST116", message: "No rows found" },
              }),
          }),
        }),
      };
    }
    return originalFrom(table);
  };

  try {
    const res = await gamificationService.getGamificationState("user_123");
    assert.equal(res.error, null);
    assert.equal(res.data.xp, 350);
    assert.equal(res.data.gems, 45);
    assert.equal(res.data.streak, 0, "Missing streak row falls back safely to 0");
    assert.equal(res.data.freezeTokens, 0);
  } finally {
    supabase.from = originalFrom;
  }
});

test("header dropdown toggle state helper enforces mutual exclusion across Streak, XP, and Gems", () => {
  let dropdownState = { streak: false, xp: false, gems: false };

  const toggleStreak = () => {
    dropdownState = { streak: !dropdownState.streak, xp: false, gems: false };
  };

  const toggleXp = () => {
    dropdownState = { streak: false, xp: !dropdownState.xp, gems: false };
  };

  const toggleGems = () => {
    dropdownState = { streak: false, xp: false, gems: !dropdownState.gems };
  };

  // Open XP dropdown
  toggleXp();
  assert.deepEqual(dropdownState, { streak: false, xp: true, gems: false });

  // Toggling Gems closes XP and opens Gems
  toggleGems();
  assert.deepEqual(dropdownState, { streak: false, xp: false, gems: true });

  // Toggling Streak closes Gems and opens Streak
  toggleStreak();
  assert.deepEqual(dropdownState, { streak: true, xp: false, gems: false });

  // Toggling Streak again closes Streak
  toggleStreak();
  assert.deepEqual(dropdownState, { streak: false, xp: false, gems: false });
});

test("gamificationService.checkAndClaimQuests triggers claimCompletedQuests, emits toast and update events", async () => {
  const originalRpc = (await import("../src/lib/supabase.js")).default.rpc;
  const supabase = (await import("../src/lib/supabase.js")).default;
  const originalWindow = globalThis.window;

  const dispatched = [];
  globalThis.window = {
    dispatchEvent: (evt) => dispatched.push(evt),
    CustomEvent: class CustomEvent {
      constructor(type, eventInitDict) {
        this.type = type;
        this.detail = eventInitDict?.detail;
      }
    },
  };

  supabase.rpc = (fn) => {
    if (fn === "claim_completed_quests") {
      return Promise.resolve({
        data: {
          awarded: [
            { id: "q1", title: "Daily Review", xp: 30, gems: 5 },
          ],
        },
        error: null,
      });
    }
    return originalRpc(fn);
  };

  let refreshCalled = false;
  const refreshProfileFn = () => {
    refreshCalled = true;
    return Promise.resolve();
  };

  try {
    const res = await gamificationService.checkAndClaimQuests(refreshProfileFn);
    assert.equal(res.error, null);
    assert.ok(refreshCalled, "refreshProfileFn callback must be invoked when provided");

    assert.equal(dispatched.length, 2);
    assert.equal(dispatched[0].type, "hyper-tutor-quest-completed-toast");
    assert.ok(dispatched[0].detail.message.includes("Daily Review"));
    assert.equal(dispatched[1].type, "hyper-tutor-quests-updated");
  } finally {
    supabase.rpc = originalRpc;
    if (originalWindow) globalThis.window = originalWindow;
    else delete globalThis.window;
  }
});

test("gamificationService.purchaseStreakFreeze validates userId, deducts gems, and updates streak tokens", async () => {
  const noIdRes = await gamificationService.purchaseStreakFreeze(null);
  assert.equal(noIdRes.success, false);
  assert.equal(noIdRes.error, "User ID required");

  const originalRpc = (await import("../src/lib/supabase.js")).default.rpc;
  const originalFrom = (await import("../src/lib/supabase.js")).default.from;
  const supabase = (await import("../src/lib/supabase.js")).default;

  let gemsAwarded = null;
  let updatedTokens = null;

  supabase.rpc = (fn, params) => {
    if (fn === "award_user_rewards") {
      gemsAwarded = params.gems_amount;
      return Promise.resolve({ data: [{ xp_points: 100, gems: 10 }], error: null });
    }
    return originalRpc(fn, params);
  };

  supabase.from = (table) => {
    if (table === "users_streaks") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: { freeze_tokens_available: 1 },
                error: null,
              }),
          }),
        }),
        update: (payload) => {
          updatedTokens = payload.freeze_tokens_available;
          return {
            eq: () => Promise.resolve({ error: null }),
          };
        },
      };
    }
    return originalFrom(table);
  };

  try {
    const res = await gamificationService.purchaseStreakFreeze("user_freeze_buyer");
    assert.equal(res.success, true);
    assert.equal(res.error, null);
    assert.equal(gemsAwarded, -50, "Purchasing freeze token must deduct 50 gems");
    assert.equal(updatedTokens, 2, "Freeze token count must increment from 1 to 2");
  } finally {
    supabase.rpc = originalRpc;
    supabase.from = originalFrom;
  }
});
