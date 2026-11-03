import { useState, useEffect, useCallback, useMemo } from "react";
import useGamification from "./useGamification.js";
import useLeaderboard from "../../../hooks/useLeaderboard.js";
import supabase from "../../../lib/supabase.js";
import { calculateXpLevel } from "../utils/levelCurve.js";

/**
 * Custom hook providing data for LevelRoadmap v2:
 * - Real user level & XP info
 * - Friends / Community avatars per level node
 * - Smart stats ("XP this week", estimated "days to next level")
 * - Live refresh handler
 */
export function useLevelProgress() {
  const { xp, refreshAll, toast, awardRewards } = useGamification();
  const { entries: leaderboardEntries, loading: leaderboardLoading } = useLeaderboard({
    scope: "global",
    period: "all_time",
    metric: "xp",
    limit: 50,
  });

  const [recentXpHistory, setRecentXpHistory] = useState([]);
  const [weeklyXp, setWeeklyXp] = useState(0);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  // Fetch recent study sessions to calculate weekly study volume / estimated XP pace
  const fetchRecentActivity = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsHistoryLoading(false);
        return;
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const isoDate = sevenDaysAgo.toISOString();

      const [{ data: historyData }, { data: sessionTracking }] = await Promise.all([
        supabase
          .from("study_history")
          .select("id, completed_at, duration_minutes")
          .eq("user_id", user.id)
          .gte("completed_at", isoDate),
        supabase
          .from("daily_session_tracking")
          .select("id, tracking_date, session_count")
          .eq("user_id", user.id)
          .gte("tracking_date", isoDate.slice(0, 10)),
      ]);

      const historyCount = historyData?.length || 0;
      const trackingCount = sessionTracking?.length || 0;

      // Estimate weekly XP: Each completed session or tracking day earns roughly 20-50 XP
      // We also check total XP progress
      const estimatedWeeklyXp = Math.min(xp.total, Math.max(0, (historyCount + trackingCount) * 25));
      setWeeklyXp(estimatedWeeklyXp);
      setRecentXpHistory(historyData || []);
    } catch (err) {
      console.warn("useLevelProgress recent activity error:", err);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [xp.total]);

  useEffect(() => {
    fetchRecentActivity();
  }, [fetchRecentActivity]);

  // Map social avatars to level numbers based on leaderboard entries
  const avatarsByLevel = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(leaderboardEntries)) return map;

    leaderboardEntries.forEach((entry) => {
      const userXp = Number(entry.xp || entry.score || entry.xp_points) || 0;
      const userLevel = calculateXpLevel(userXp).level;

      const avatarObj = {
        id: entry.user_id || entry.id || entry.username,
        name: entry.username || entry.full_name || entry.name || "Learner",
        avatarUrl: entry.avatar_url || entry.user_img || entry.avatar,
        level: userLevel,
      };

      if (!map.has(userLevel)) {
        map.set(userLevel, []);
      }
      const list = map.get(userLevel);
      if (list.length < 10) {
        list.push(avatarObj);
      }
    });

    return map;
  }, [leaderboardEntries]);

  // Estimate days to next level based on recent activity (7 day pace)
  const daysToNextLevel = useMemo(() => {
    if (xp.xpToNextLevel <= 0) return 0;
    const dailyAvgXp = weeklyXp / 7;
    if (dailyAvgXp <= 0) return null;
    return Math.ceil(xp.xpToNextLevel / dailyAvgXp);
  }, [xp.xpToNextLevel, weeklyXp]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refreshAll(), fetchRecentActivity()]);
  }, [refreshAll, fetchRecentActivity]);

  return {
    level: xp.level,
    totalXp: xp.total,
    xpInLevel: xp.xpInCurrentLevel,
    xpForLevel: xp.xpForNextLevel,
    xpToNextLevel: xp.xpToNextLevel,
    xpProgressPercent: xp.xpProgressPercent,
    avatarsByLevel,
    smartStats: {
      weeklyXp,
      daysToNextLevel,
      hasHistory: recentXpHistory.length > 0 || weeklyXp > 0,
    },
    toast,
    refreshAll: handleRefresh,
    awardRewards,
    isLoading: isHistoryLoading && leaderboardLoading,
  };
}

export default useLevelProgress;
