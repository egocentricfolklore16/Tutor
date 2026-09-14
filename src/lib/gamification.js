import supabase from "./supabase";

/**
 * Calculates XP level info given total XP points.
 * Level 1: 0 - 99 XP
 * Level 2: 100 - 249 XP (+150)
 * Level 3: 250 - 449 XP (+200), etc.
 */
export function calculateXpLevel(xpPoints = 0) {
  let level = 1;
  let currentLevelBaseXp = 0;
  let xpForNextLevel = 100;

  while (xpPoints >= currentLevelBaseXp + xpForNextLevel) {
    currentLevelBaseXp += xpForNextLevel;
    level += 1;
    xpForNextLevel += 50;
  }

  const xpInCurrentLevel = xpPoints - currentLevelBaseXp;
  const xpToNextLevel = xpForNextLevel - xpInCurrentLevel;
  const xpProgressPercent = Math.min(100, Math.max(0, Math.floor((xpInCurrentLevel / xpForNextLevel) * 100)));

  return {
    level,
    xpPoints,
    xpInCurrentLevel,
    xpForNextLevel,
    xpToNextLevel,
    xpProgressPercent,
  };
}

/**
 * Award XP and/or Gems to a user via Supabase RPC, with fallback to direct table update.
 */
export async function awardUserRewards(userId, { xp = 0, gems = 0 } = {}) {
  if (!userId) return { data: null, error: new Error("Missing user id") };

  let resultData = null;
  let resultError = null;

  try {
    const { data, error } = await supabase.rpc("award_user_rewards", {
      activity_user_id: userId,
      xp_amount: xp,
      gems_amount: gems,
    });
    if (error) {
      resultError = error;
    } else {
      resultData = data;
    }
  } catch (err) {
    resultError = err;
  }

  // Fallback: if RPC error or null returned, query profiles and update directly
  if (resultError || !resultData) {
    try {
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("xp_points, gems")
        .eq("user_id", userId)
        .maybeSingle();

      const newXp = Math.max(0, (currentProfile?.xp_points || 0) + xp);
      const newGems = Math.max(0, (currentProfile?.gems || 0) + gems);

      const { data: updatedProfile, error: updateError } = await supabase
        .from("profiles")
        .update({ xp_points: newXp, gems: newGems })
        .eq("user_id", userId)
        .select("xp_points, gems")
        .maybeSingle();

      if (!updateError) {
        resultData = updatedProfile;
        resultError = null;
      }
    } catch (fallbackErr) {
      console.error("Fallback awardUserRewards error:", fallbackErr);
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hyper-tutor-rewards-updated", { detail: { xp, gems } }));
  }

  return { data: resultData, error: resultError };
}
