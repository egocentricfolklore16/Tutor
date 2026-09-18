import supabase from "./supabase";
import { getActivityDate, getDisplayStreak } from "./streaksCore";

export { getActivityDate, getDisplayStreak };

export function getUserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export async function updateStreakForActivity(userId, options = {}) {
  if (!userId) return { data: null, error: new Error("Missing user id") };
  const timeZone = options.timeZone || getUserTimeZone();
  const cutoffHour = options.cutoffHour ?? 3;

  let result = null;
  try {
    result = await supabase.rpc("update_user_streak", {
      activity_user_id: userId,
      user_timezone: timeZone,
      cutoff_hour: cutoffHour,
    });
  } catch (err) {
    result = { data: null, error: err };
  }

  // Fallback: if RPC failed or returned error, query users_streaks and update directly
  if (result?.error || !result?.data) {
    try {
      const activityDate = getActivityDate(new Date(), timeZone, cutoffHour);
      const { data: existingStreak } = await getUserStreak(userId);

      const prev = existingStreak
        ? {
            currentStreak: existingStreak.current_streak,
            longestStreak: existingStreak.longest_streak,
            lastActiveDate: existingStreak.last_active_date,
            freezeTokensAvailable: existingStreak.freeze_tokens_available,
          }
        : null;

      const { calculateStreakUpdate } = await import("./streaksCore");
      const next = calculateStreakUpdate(prev, activityDate);

      const { data: updatedStreak, error: upsertError } = await supabase
        .from("users_streaks")
        .upsert({
          user_id: userId,
          current_streak: next.currentStreak,
          longest_streak: next.longestStreak,
          last_active_date: next.lastActiveDate,
          freeze_tokens_available: next.freezeTokensAvailable,
        })
        .select()
        .maybeSingle();

      if (!upsertError) {
        result = { data: updatedStreak, error: null };
      }
    } catch (fallbackErr) {
      console.error("Fallback updateStreakForActivity error:", fallbackErr);
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("hyper-tutor-streak-updated"));
  }

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
    const slipReason =
      daysSinceActivity === 2 && streakData.freeze_tokens_available === 0
        ? "streak_broken"
        : "missed_day";

    const { error: slipError } = await supabase.from("streak_slipping").upsert(
      {
        user_id: userId,
        reason: slipReason,
        slip_date: lastActiveDate,
      },
      {
        onConflict: "user_id,slip_date,reason",
        ignoreDuplicates: true,
      }
    );
    
    if (slipError) {
      console.error("Error logging streak slip:", {
        message: slipError.message,
        details: slipError.details,
        hint: slipError.hint,
        code: slipError.code,
        error: slipError,
      });
    }
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
 * Calculates a 7-element boolean array for current Sunday-Saturday week completion.
 *
 * @param {string} userId - User ID
 * @param {object} streakData - Streak record containing display_current_streak / current_streak
 * @returns {Promise<boolean[]>} Array of 7 booleans for [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
 */
export async function getWeekActivity(userId, streakData) {
  const defaultWeek = [false, false, false, false, false, false, false];
  if (!userId) return defaultWeek;

  const currentStreak = streakData?.display_current_streak ?? streakData?.current_streak ?? 0;
  if (currentStreak <= 0) {
    return defaultWeek;
  }

  const now = new Date();
  const currentDayIndex = now.getDay(); // 0 = Sun, 6 = Sat

  // Calculate start of current week (Sunday)
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - currentDayIndex);

  const sundayStr = sunday.toISOString().split("T")[0];
  const todayStr = now.toISOString().split("T")[0];

  const { data: records } = await supabase
    .from("daily_session_tracking")
    .select("activity_date, met_daily_goal")
    .eq("user_id", userId)
    .gte("activity_date", sundayStr)
    .lte("activity_date", todayStr);

  const activeDates = new Set(
    (records || [])
      .filter((r) => r.met_daily_goal !== false)
      .map((r) => r.activity_date)
  );

  // If user has a streak but no daily_session_tracking entry for today (e.g. updated via RPC), fallback last_active_date
  if (streakData?.last_active_date) {
    activeDates.add(streakData.last_active_date);
  }

  const result = [false, false, false, false, false, false, false];
  for (let i = 0; i <= currentDayIndex; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    if (activeDates.has(dateStr)) {
      result[i] = true;
    }
  }

  return result;
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
