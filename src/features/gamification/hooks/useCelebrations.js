import { useCallback, useEffect, useState } from "react";

const LEVEL_SEEN_KEY = "hyper_tutor_last_seen_level";

export function useCelebrations(currentLevel) {
  const [activeCelebration, setActiveCelebration] = useState(null);

  useEffect(() => {
    if (typeof currentLevel !== "number" || currentLevel <= 1) return;

    const storedSeenLevel = localStorage.getItem(LEVEL_SEEN_KEY);
    const lastSeen = storedSeenLevel ? parseInt(storedSeenLevel, 10) : 1;

    if (currentLevel > lastSeen) {
      setActiveCelebration({
        type: "level-up",
        level: currentLevel,
        title: `Level Up! Level ${currentLevel}`,
        message: "You've reached a new study tier!",
      });
      localStorage.setItem(LEVEL_SEEN_KEY, currentLevel.toString());
    }
  }, [currentLevel]);

  const triggerCelebration = useCallback((celebration) => {
    setActiveCelebration(celebration);
  }, []);

  const dismissCelebration = useCallback(() => {
    setActiveCelebration(null);
  }, []);

  return {
    activeCelebration,
    triggerCelebration,
    dismissCelebration,
  };
}

export default useCelebrations;
