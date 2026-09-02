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
