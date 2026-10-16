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
};
