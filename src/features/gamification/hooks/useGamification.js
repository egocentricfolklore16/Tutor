import { useCallback, useEffect, useState } from "react";
import useStreak from "../../../hooks/useStreak.js";
import { useProfile } from "../../../app/ProfileContext.jsx";
import { calculateXpLevel } from "../utils/levelCurve.js";
import { gamificationService } from "../services/gamificationService.js";

/**
 * Single source of truth React hook for all gamification state:
 * - Streaks (current, longest, freezeTokens, weekDays, todayCompleted)
 * - XP & Level info (xpPoints, level, xpToNextLevel, xpProgressPercent)
 * - Gems balance
 */
export function useGamification() {
  const { profile, refreshProfile } = useProfile();
  const streakState = useStreak();

  const [toast, setToast] = useState(null);

  const xpPoints = profile?.xp_points ?? 0;
  const xpLevelInfo = calculateXpLevel(xpPoints);
  const gems = profile?.gems ?? 0;

  const { refreshStreak } = streakState;

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshProfile?.(),
      refreshStreak?.(),
    ]);
  }, [refreshProfile, refreshStreak]);

  // Toast listener for reward events
  useEffect(() => {
    const handleRewardsUpdated = (event) => {
      const { xp = 0, gems: addedGems = 0 } = event.detail || {};
      if (xp > 0 || addedGems > 0) {
        setToast({
          xp,
          gems: addedGems,
          id: Date.now(),
        });
        setTimeout(() => setToast(null), 3500);
      }
    };

    window.addEventListener("hyper-tutor-rewards-updated", handleRewardsUpdated);
    return () => {
      window.removeEventListener("hyper-tutor-rewards-updated", handleRewardsUpdated);
    };
  }, []);

  return {
    streak: {
      currentStreak: streakState.currentStreak,
      longestStreak: streakState.longestStreak,
      freezeTokens: streakState.freezeTokens,
      weekDays: streakState.weekDays,
      todayCompleted: streakState.todayCompleted,
      loading: streakState.loading,
      error: streakState.error,
      refreshStreak: streakState.refreshStreak,
      recordActivity: streakState.recordActivity,
    },
    xp: {
      total: xpPoints,
      level: xpLevelInfo.level,
      xpInCurrentLevel: xpLevelInfo.xpInCurrentLevel,
      xpForNextLevel: xpLevelInfo.xpForNextLevel,
      xpToNextLevel: xpLevelInfo.xpToNextLevel,
      xpProgressPercent: xpLevelInfo.xpProgressPercent,
    },
    gems: {
      balance: gems,
    },
    toast,
    refreshAll,
    awardRewards: gamificationService.awardRewards,
  };
}

export default useGamification;
