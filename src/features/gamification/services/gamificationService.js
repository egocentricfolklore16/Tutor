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

  /**
   * Fetches achievement badges for a user or returns structured defaults.
   */
  async getBadges(userId) {
    const fallbackBadges = [
      {
        id: "first_focus",
        title: "First Focus",
        description: "Complete your first study session",
        icon: "⏱️",
        earned: true,
        category: "study",
        progress: 1,
        target: 1,
        xp_reward: 20,
        unlocked_at: new Date().toISOString(),
      },
      {
        id: "streak_7d",
        title: "7-Day Spark",
        description: "Maintain a 7-day study streak",
        icon: "🔥",
        earned: false,
        category: "streak",
        progress: 1,
        target: 7,
        xp_reward: 50,
      },
      {
        id: "note_maker",
        title: "Note Maker",
        description: "Save your first study note",
        icon: "📝",
        earned: true,
        category: "study",
        progress: 1,
        target: 1,
        xp_reward: 15,
        unlocked_at: new Date().toISOString(),
      },
    ];

    if (!userId) {
      return { data: fallbackBadges, available: true, isFallback: true };
    }

    try {
      const { data, error } = await supabase.rpc("get_achievements", { p_user_id: userId });
      if (error || !data || !Array.isArray(data) || data.length === 0) {
        return { data: fallbackBadges, available: true, isFallback: true };
      }
      return { data, available: true, isFallback: false };
    } catch {
      return { data: fallbackBadges, available: true, isFallback: true };
    }
  },
};
