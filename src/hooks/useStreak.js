import { useCallback, useEffect, useState } from "react";
import supabase from "../lib/supabase.js";
import { getUserTimeZone } from "../lib/streaks.js";

const WEEK_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Calculates local YYYY-MM-DD string for a given date taking into account timezone and 3am cutoff.
 */
export function getLocalCutoffDate(date = new Date(), timeZone = getUserTimeZone(), cutoffHour = 3) {
  try {
    const tzDateStr = date.toLocaleString("en-US", { timeZone });
    const localDate = new Date(tzDateStr);
    if (localDate.getHours() < cutoffHour) {
      localDate.setDate(localDate.getDate() - 1);
    }
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, "0");
    const day = String(localDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch (err) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

/**
 * Computes the 7 Sunday-through-Saturday dates for the current week containing today (under cutoff).
 */
export function getCurrentWeekDays(todayCutoffStr, timeZone = getUserTimeZone()) {
  const todayParts = todayCutoffStr.split("-").map(Number);
  // Construct UTC date object representing local midnight
  const todayObj = new Date(Date.UTC(todayParts[0], todayParts[1] - 1, todayParts[2]));
  const dayOfWeek = todayObj.getUTCDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat

  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const diff = i - dayOfWeek;
    const dayObj = new Date(todayObj);
    dayObj.setUTCDate(todayObj.getUTCDate() + diff);

    const year = dayObj.getUTCFullYear();
    const month = String(dayObj.getUTCMonth() + 1).padStart(2, "0");
    const day = String(dayObj.getUTCDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    weekDays.push({
      dateStr,
      label: WEEK_LABELS[i],
      dayIndex: i,
      isToday: dateStr === todayCutoffStr,
      isPast: dateStr < todayCutoffStr,
      isFuture: dateStr > todayCutoffStr,
    });
  }
  return weekDays;
}

export function useStreak() {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [freezeTokens, setFreezeTokens] = useState(0);
  const [lastCompletedDate, setLastCompletedDate] = useState(null);
  const [weekDays, setWeekDays] = useState([]);
  const [todayCompleted, setTodayCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStreakData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      const userId = session.user.id;
      const userTz = getUserTimeZone();
      const todayCutoffStr = getLocalCutoffDate(new Date(), userTz, 3);

      // Check stale streak on mount/fetch
      await supabase.rpc("check_stale_streak", {
        p_user_timezone: userTz,
        p_cutoff_hour: 3,
      }).catch(() => null);

      // Fetch user_streaks record
      const { data: streakRow, error: streakErr } = await supabase
        .from("users_streaks")
        .select("current_streak, longest_streak, freeze_tokens, freeze_tokens_available, last_completed_date, last_active_date")
        .eq("user_id", userId)
        .maybeSingle();

      if (streakErr && streakErr.code !== "PGRST116") {
        throw streakErr;
      }

      const curStreak = streakRow?.current_streak ?? 0;
      const longStreak = streakRow?.longest_streak ?? 0;
      const freezes = streakRow?.freeze_tokens ?? streakRow?.freeze_tokens_available ?? 0;
      const lastCompleted = streakRow?.last_completed_date || streakRow?.last_active_date || null;

      setCurrentStreak(curStreak);
      setLongestStreak(longStreak);
      setFreezeTokens(freezes);
      setLastCompletedDate(lastCompleted);

      // Fetch week activity from streak_days and daily_session_tracking
      const baseWeek = getCurrentWeekDays(todayCutoffStr, userTz);
      const startDate = baseWeek[0].dateStr;
      const endDate = baseWeek[6].dateStr;

      const [{ data: streakDaysRows }, { data: trackingRows }] = await Promise.all([
        supabase
          .from("streak_days")
          .select("local_date, status")
          .eq("user_id", userId)
          .gte("local_date", startDate)
          .lte("local_date", endDate),
        supabase
          .from("daily_session_tracking")
          .select("activity_date, sessions_completed")
          .eq("user_id", userId)
          .gte("activity_date", startDate)
          .lte("activity_date", endDate),
      ]);

      const statusByDate = {};
      (streakDaysRows || []).forEach((row) => {
        statusByDate[row.local_date] = row.status;
      });

      // Daily tracking fallback for completed status if sessions > 0
      (trackingRows || []).forEach((row) => {
        if (row.sessions_completed > 0 && !statusByDate[row.activity_date]) {
          statusByDate[row.activity_date] = "completed";
        }
      });

      // If last_completed_date is in range, mark it completed as well
      if (lastCompleted && statusByDate[lastCompleted] !== "frozen") {
        statusByDate[lastCompleted] = "completed";
      }

      const isTodayCompleted = statusByDate[todayCutoffStr] === "completed" || lastCompleted === todayCutoffStr;
      setTodayCompleted(Boolean(isTodayCompleted));

      const computedWeekDays = baseWeek.map((day) => {
        let state = "missed";
        const dayStatus = statusByDate[day.dateStr];

        if (dayStatus === "completed") {
          state = "completed";
        } else if (dayStatus === "frozen") {
          state = "frozen";
        } else if (day.isToday) {
          state = isTodayCompleted ? "completed" : "today-pending";
        } else if (day.isFuture) {
          state = "future";
        } else {
          state = "missed";
        }

        return {
          ...day,
          state,
          status: dayStatus || (state === "completed" ? "completed" : null),
        };
      });

      setWeekDays(computedWeekDays);
      setError(null);
    } catch (err) {
      console.error("Error fetching streak data:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStreakData();

    const handleUpdateEvent = () => {
      fetchStreakData();
    };

    window.addEventListener("hyper-tutor-streak-updated", handleUpdateEvent);

    // Supabase Realtime subscription on users_streaks
    let channel;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        channel = supabase
          .channel(`streak_changes_${session.user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "users_streaks",
              filter: `user_id=eq.${session.user.id}`,
            },
            () => {
              fetchStreakData();
            }
          )
          .subscribe();
      }
    });

    return () => {
      window.removeEventListener("hyper-tutor-streak-updated", handleUpdateEvent);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchStreakData]);

  const recordActivity = async () => {
    try {
      const userTz = getUserTimeZone();
      const { data, error: rpcErr } = await supabase.rpc("record_study_activity", {
        p_user_timezone: userTz,
        p_cutoff_hour: 3,
      });

      if (rpcErr) throw rpcErr;

      window.dispatchEvent(new Event("hyper-tutor-streak-updated"));
      await fetchStreakData();
      return data;
    } catch (err) {
      console.error("Error recording study activity:", err);
      throw err;
    }
  };

  return {
    currentStreak,
    longestStreak,
    freezeTokens,
    lastCompletedDate,
    weekDays,
    todayCompleted,
    loading,
    error,
    refreshStreak: fetchStreakData,
    recordActivity,
  };
}

export default useStreak;
