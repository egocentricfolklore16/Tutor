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
        supabase.from("users_streaks").select("current_streak, longest_streak, freeze_tokens_available").eq("user_id", userId).maybeSingle(),
      ]);

      if (profileErr) throw profileErr;
      if (streakErr && streakErr.code !== "PGRST116") throw streakErr;

      return {
        data: {
          xp: profile?.xp_points ?? 0,
          gems: profile?.gems ?? 0,
          streak: streak?.current_streak ?? 0,
          longestStreak: streak?.longest_streak ?? 0,
          freezeTokens: streak?.freeze_tokens_available ?? 0,
        },
        error: null,
      };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  /**
   * Triggers claimCompletedQuests, emits toasts for awarded quests,
   * triggers profile refetch from server, and notifies components to update quest list.
   */
  async checkAndClaimQuests(refreshProfileFn) {
    try {
      const { data, error } = await this.claimCompletedQuests();
      if (error) {
        console.error("Error in checkAndClaimQuests:", error);
        return { data: null, error };
      }

      if (data?.awarded && Array.isArray(data.awarded) && data.awarded.length > 0) {
        let totalXp = 0;
        let totalGems = 0;

        for (const item of data.awarded) {
          totalXp += item.xp || 0;
          totalGems += item.gems || 0;
          const msg = `Quest complete: ${item.title} +${item.xp} XP +${item.gems} gems`;

          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("hyper-tutor-quest-completed-toast", {
                detail: { message: msg, quest: item },
              })
            );
          }
        }

        // Refetch profile from server
        if (typeof refreshProfileFn === "function") {
          await refreshProfileFn();
        } else if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("hyper-tutor-rewards-updated", {
              detail: { xp: totalXp, gems: totalGems },
            })
          );
        }
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("hyper-tutor-quests-updated"));
      }

      return { data, error: null };
    } catch (err) {
      console.error("Unexpected error in checkAndClaimQuests:", err);
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
   * Fetches active user daily and weekly quests from RPC get_my_quests().
   */
  async getMyQuests() {
    try {
      const { data, error } = await supabase.rpc("get_my_quests");
      if (error) {
        console.error("Error fetching my quests:", error);
        return { data: null, error };
      }
      return { data, error: null };
    } catch (err) {
      console.error("Unexpected error in getMyQuests:", err);
      return { data: null, error: err };
    }
  },

  /**
   * Backward-compatible alias for getMyQuests.
   */
  async getQuests() {
    return this.getMyQuests();
  },

  /**
   * Claims all eligible completed quests via RPC claim_completed_quests().
   */
  async claimCompletedQuests() {
    try {
      const { data, error } = await supabase.rpc("claim_completed_quests");
      if (error) {
        console.error("Error claiming completed quests:", error);
        return { data: null, error };
      }
      return { data, error: null };
    } catch (err) {
      console.error("Unexpected error in claimCompletedQuests:", err);
      return { data: null, error: err };
    }
  },

  /**
   * Claims a specific quest by key via RPC claim_quest(p_key).
   */
  async claimQuest(key) {
    if (!key) return { data: null, error: new Error("Quest key is required") };
    try {
      const { data, error } = await supabase.rpc("claim_quest", { p_key: key });
      if (error) {
        console.error(`Error claiming quest ${key}:`, error);
        return { data: null, error };
      }
      return { data, error: null };
    } catch (err) {
      console.error(`Unexpected error in claimQuest(${key}):`, err);
      return { data: null, error: err };
    }
  },

  /**
   * Records a flashcard review by inserting into flashcard_reviews table.
   */
  async recordFlashcardReview(flashcardId) {
    if (!flashcardId) return { error: new Error("Flashcard ID is required") };
    try {
      const { data, error } = await supabase
        .from("flashcard_reviews")
        .insert({ flashcard_id: flashcardId })
        .select();

      if (error) {
        console.error("Error recording flashcard review:", error);
        return { error };
      }
      return { data, error: null };
    } catch (err) {
      console.error("Unexpected error recording flashcard review:", err);
      return { error: err };
    }
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
      // Also update freeze_tokens_available on users_streaks
      const { data: currentStreak, error: selectErr } = await supabase.from("users_streaks").select("freeze_tokens_available").eq("user_id", userId).maybeSingle();
      if (selectErr && selectErr.code !== "PGRST116") throw selectErr;
      const newTokens = (currentStreak?.freeze_tokens_available ?? 0) + 1;
      const { error: updateErr } = await supabase.from("users_streaks").update({ freeze_tokens_available: newTokens }).eq("user_id", userId);
      if (updateErr) throw updateErr;
      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: err.message || "Failed to purchase Streak Freeze." };
    }
  },

  /**
   * Fetches achievement badges via Supabase RPC get_achievements.
   */
  async getBadges(userId) {
    try {
      let targetId = userId;
      if (!targetId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: [], error: new Error("Unauthenticated") };
        targetId = user.id;
      }

      const { data, error } = await supabase.rpc("get_achievements", { p_user: targetId });
      if (error) {
        console.error("Error fetching badges in gamificationService:", error);
        return { data: null, error };
      }
      return { data: data || [], error: null };
    } catch (err) {
      console.error("Unexpected error in getBadges:", err);
      return { data: null, error: err };
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
