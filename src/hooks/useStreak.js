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
  } catch {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

/**
 * Computes the 7 Sunday-through-Saturday dates for the current week containing today (under cutoff).
 */
export function getCurrentWeekDays(todayCutoffStr) {
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

/**
 * Resolves whether a streak is stale given last active/completed date, today's cutoff date, and freeze tokens.
 */
export function resolveStaleDisplayStreak(curStreak, activeOrCompleted, todayCutoffStr, freezes) {
  let displayStreak = curStreak;
  if (activeOrCompleted) {
    const anchorParts = activeOrCompleted.split("-").map(Number);
    const anchorUtc = new Date(Date.UTC(anchorParts[0], anchorParts[1] - 1, anchorParts[2]));
    const todayParts = todayCutoffStr.split("-").map(Number);
    const todayUtc = new Date(Date.UTC(todayParts[0], todayParts[1] - 1, todayParts[2]));
    const diffDays = Math.round((todayUtc - anchorUtc) / 86400000);
    if (diffDays > 2 || (diffDays === 2 && freezes === 0)) {
      displayStreak = 0;
    }
  }
  return displayStreak;
}

/**
 * Computes status and visual state for each day in baseWeek.
 */
export function computeWeekDays(baseWeek, statusByDate = {}, todayCutoffStr, activeOrCompleted) {
  const isTodayCompleted = statusByDate[todayCutoffStr] === "completed" || activeOrCompleted === todayCutoffStr;

  return baseWeek.map((day) => {
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
}

export function useStreak() {
  const [currentStreak, setCurrentStreak] = useState(null);
  const [longestStreak, setLongestStreak] = useState(null);
  const [freezeTokens, setFreezeTokens] = useState(0);
  const [lastCompletedDate, setLastCompletedDate] = useState(null);
  const [lastActiveDate, setLastActiveDate] = useState(null);
  const [weekDays, setWeekDays] = useState([]);
  const [todayCompleted, setTodayCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStreakData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setCurrentStreak(null);
        setLongestStreak(null);
        setLoading(false);
        return;
      }

      const userId = session.user.id;
      const userTz = getUserTimeZone();
      const todayCutoffStr = getLocalCutoffDate(new Date(), userTz, 3);

      // Check stale streak on mount/fetch
      try {
        await supabase.rpc("check_stale_streak", {
          p_user_timezone: userTz,
          p_cutoff_hour: 3,
        });
      } catch (err) {
        console.warn("check_stale_streak warning:", err);
      }

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
      const lastCompleted = streakRow?.last_completed_date || null;
      const lastActive = streakRow?.last_active_date || null;
      const activeOrCompleted = lastCompleted || lastActive;

      // Stale streak resolution check
      const displayStreak = resolveStaleDisplayStreak(curStreak, activeOrCompleted, todayCutoffStr, freezes);

      setCurrentStreak(displayStreak);
      setLongestStreak(longStreak);
      setFreezeTokens(freezes);
      setLastCompletedDate(lastCompleted || lastActive);
      setLastActiveDate(lastActive || lastCompleted);

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

      // If last_completed_date/last_active_date is in range, mark it completed as well
      if (activeOrCompleted && statusByDate[activeOrCompleted] !== "frozen") {
        statusByDate[activeOrCompleted] = "completed";
      }

      // Backfill active streak dates contiguous from activeOrCompleted backwards for displayStreak days
      if (displayStreak > 0 && activeOrCompleted) {
        const anchorParts = activeOrCompleted.split("-").map(Number);
        const anchorDate = new Date(Date.UTC(anchorParts[0], anchorParts[1] - 1, anchorParts[2]));
        for (let i = 0; i < displayStreak; i++) {
          const d = new Date(anchorDate);
          d.setUTCDate(anchorDate.getUTCDate() - i);
          const year = d.getUTCFullYear();
          const month = String(d.getUTCMonth() + 1).padStart(2, "0");
          const day = String(d.getUTCDate()).padStart(2, "0");
          const streakDateStr = `${year}-${month}-${day}`;
          if (statusByDate[streakDateStr] !== "frozen") {
            statusByDate[streakDateStr] = "completed";
          }
        }
      }

      const isTodayCompleted = statusByDate[todayCutoffStr] === "completed" || activeOrCompleted === todayCutoffStr;
      setTodayCompleted(Boolean(isTodayCompleted));

      const computedWeekDays = computeWeekDays(baseWeek, statusByDate, todayCutoffStr, activeOrCompleted);

      setWeekDays(computedWeekDays);
      setError(null);
    } catch (err) {
      console.error("Error fetching streak data:", err);
      setCurrentStreak(null);
      setLongestStreak(null);
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

    const handleFocusOrVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchStreakData();
      }
    };

    window.addEventListener("hyper-tutor-streak-updated", handleUpdateEvent);
    window.addEventListener("focus", handleFocusOrVisibility);
    document.addEventListener("visibilitychange", handleFocusOrVisibility);

    // Supabase Realtime subscription on users_streaks
    let channel;
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && isMounted) {
        const channelName = `streak_changes_${session.user.id}:${crypto.randomUUID()}`;
        channel = supabase.channel(channelName);

        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "users_streaks",
            filter: `user_id=eq.${session.user.id}`,
          },
          () => {
            if (isMounted) fetchStreakData();
          }
        );

        channel.subscribe();
      }
    });

    return () => {
      isMounted = false;
      window.removeEventListener("hyper-tutor-streak-updated", handleUpdateEvent);
      window.removeEventListener("focus", handleFocusOrVisibility);
      document.removeEventListener("visibilitychange", handleFocusOrVisibility);
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
    lastActiveDate,
    weekDays,
    todayCompleted,
    loading,
    error,
    refreshStreak: fetchStreakData,
    recordActivity,
  };
}

export default useStreak;
