import supabase from "../../../lib/supabase.js";
import { awardUserRewards } from "../../../lib/gamification.js";

/**
 * Service abstraction for gamification API requests.
 */
export const gamificationService = {
  /**
   * Fetches profile and streak state in one call or structured response.
   */
  async getGamificationState(userId) {
    if (!userId) return { data: null, error: new Error("User ID required") };

    try {
      const [{ data: profile, error: profileErr }, { data: streak, error: streakErr }] = await Promise.all([
        supabase.from("profiles").select("xp_points, gems, timezone").eq("user_id", userId).maybeSingle(),
        supabase.from("users_streaks").select("current_streak, longest_streak, freeze_tokens, freeze_tokens_available").eq("user_id", userId).maybeSingle(),
      ]);

      if (profileErr) throw profileErr;
      if (streakErr && streakErr.code !== "PGRST116") throw streakErr;

      return {
        data: {
          xp: profile?.xp_points ?? 0,
          gems: profile?.gems ?? 0,
          streak: streak?.current_streak ?? 0,
          longestStreak: streak?.longest_streak ?? 0,
          freezeTokens: streak?.freeze_tokens ?? streak?.freeze_tokens_available ?? 0,
        },
        error: null,
      };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  /**
   * Awards rewards to user.
   */
  async awardRewards(userId, { xp = 0, gems = 0 }) {
    return awardUserRewards(userId, { xp, gems });
  },

  /**
   * Quests service stub showing honest 'unavailable' state until backend exists.
   */
  async getQuests() {
    return {
      data: [],
      available: false,
      message: "Daily quests backend service pending.",
    };
  },

  /**
   * Purchases a streak freeze token via RPC/service or returns honest status.
   */
  async purchaseStreakFreeze(userId) {
    if (!userId) return { success: false, error: "User ID required" };
    try {
      // Direct spend via awardUserRewards negative delta or RPC spend_gems
      const res = await awardUserRewards(userId, { gems: -50 });
      if (res.error) throw res.error;
      // Also update freeze_tokens on users_streaks
      const { data: currentStreak } = await supabase.from("users_streaks").select("freeze_tokens").eq("user_id", userId).maybeSingle();
      const newTokens = (currentStreak?.freeze_tokens ?? 0) + 1;
      await supabase.from("users_streaks").update({ freeze_tokens: newTokens }).eq("user_id", userId);
      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: err.message || "Failed to purchase Streak Freeze." };
    }
  },

  /**
   * Fetches transaction ledger or returns honest unavailable state.
   */
  async getTransactions(_userId) {
    return {
      data: [],
      available: false,
      message: "Gem transaction ledger pending backend implementation (Item G-02).",
    };
  },
};
