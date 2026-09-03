import supabase from "./supabase";
import { getActivityDate, getDisplayStreak } from "./streaksCore";

export { getActivityDate, getDisplayStreak };

export function getUserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export async function updateStreakForActivity(userId, options = {}) {
  if (!userId) return { data: null, error: new Error("Missing user id") };
  const result = await supabase.rpc("update_user_streak", {
    activity_user_id: userId,
    user_timezone: options.timeZone || getUserTimeZone(),
    cutoff_hour: options.cutoffHour ?? 3,
  });
  if (!result.error && typeof window !== "undefined") window.dispatchEvent(new Event("hyper-tutor-streak-updated"));
  return result;
}

export async function getUserStreak(userId) {
  if (!userId) return { data: null, error: new Error("Missing user id") };
  const { data, error } = await supabase.from("users_streaks").select("current_streak,longest_streak,last_active_date,freeze_tokens_available").eq("user_id", userId).maybeSingle();
  return { data, error };
}

/**
 * Check if user missed a day and log the slip
 * @param {string} userId - User ID
 * @param {object} options - Options including timeZone and cutoffHour
 * @returns {object} Result with slip information
 */
export async function checkAndLogStreakSlip(userId, options = {}) {
  if (!userId) return { data: null, error: new Error("Missing user id") };
  
  const timeZone = options.timeZone || getUserTimeZone();
  const cutoffHour = options.cutoffHour ?? 3;
  const activityDate = getActivityDate(new Date(), timeZone, cutoffHour);
  
  // Get current streak
  const { data: streakData, error: streakError } = await getUserStreak(userId);
  if (streakError || !streakData) return { data: null, error: streakError || new Error("No streak data found") };
  
  // Calculate if streak was just broken
  const lastActiveDate = streakData.last_active_date;
  if (!lastActiveDate) return { data: null, wasSlipping: false };
  
  const lastDate = new Date(`${lastActiveDate}T00:00:00Z`);
  const currentDate = new Date(`${activityDate}T00:00:00Z`);
  const daysSinceActivity = Math.round((currentDate - lastDate) / 86400000);
  
  // If more than 1 day since last activity, user is slipping
  if (daysSinceActivity > 1) {
    const { error: slipError } = await supabase.from("streak_slipping").insert({
      user_id: userId,
      reason: daysSinceActivity === 2 && streakData.freeze_tokens_available === 0 ? "streak_broken" : "missed_day",
      slip_date: lastActiveDate,
    });
    
    if (slipError) console.error("Error logging streak slip:", slipError);
    return { data: { reason: "streak_broken", daysMissed: daysSinceActivity }, wasSlipping: true };
  }
  
  return { data: null, wasSlipping: false };
}

/**
 * Get current slipping sessions for a user
 * @param {string} userId - User ID
 * @param {number} limit - Number of records to fetch
 * @returns {object} Slipping data
 */
export async function getUserSlippingData(userId, limit = 10) {
  if (!userId) return { data: null, error: new Error("Missing user id") };
  
  const { data, error } = await supabase
    .from("streak_slipping")
    .select("*")
    .eq("user_id", userId)
    .order("slip_date", { ascending: false })
    .limit(limit);
  
  return { data, error };
}

/**
 * Get daily session tracking for analysis
 * @param {string} userId - User ID
 * @param {number} days - Number of days to analyze
 * @returns {object} Daily tracking data
 */
export async function getDailySessionTracking(userId, days = 30) {
  if (!userId) return { data: null, error: new Error("Missing user id") };
  
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  
  const { data, error } = await supabase
    .from("daily_session_tracking")
    .select("*")
    .eq("user_id", userId)
    .gte("activity_date", fromDate.toISOString().split("T")[0])
    .order("activity_date", { ascending: false });
  
  return { data, error };
}

/**
 * Mark a slip as recovered
 * @param {string} userId - User ID
 * @param {string} slipId - Slip record ID
 * @returns {object} Update result
 */
export async function markSlipAsRecovered(userId, slipId) {
  if (!userId || !slipId) return { error: new Error("Missing user id or slip id") };
  
  const { error } = await supabase
    .from("streak_slipping")
    .update({ recovered_at: new Date().toISOString() })
    .eq("id", slipId)
    .eq("user_id", userId);
  
  return { error };
}
