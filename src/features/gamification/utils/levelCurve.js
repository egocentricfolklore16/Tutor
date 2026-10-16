/**
 * Pure function to calculate XP level, progress into level, and XP needed for next level.
 * Level 1: 0 - 99 XP
 * Level 2: 100 - 249 XP (+150)
 * Level 3: 250 - 449 XP (+200), etc.
 */
export function calculateXpLevel(xpPoints = 0) {
  const safeXp = Math.max(0, Number.isFinite(Number(xpPoints)) ? Number(xpPoints) : 0);
  let level = 1;
  let currentLevelBaseXp = 0;
  let xpForNextLevel = 100;

  while (safeXp >= currentLevelBaseXp + xpForNextLevel) {
    currentLevelBaseXp += xpForNextLevel;
    level += 1;
    xpForNextLevel += 50;
  }

  const xpInCurrentLevel = safeXp - currentLevelBaseXp;
  const xpToNextLevel = xpForNextLevel - xpInCurrentLevel;
  const xpProgressPercent = Math.min(100, Math.max(0, Math.floor((xpInCurrentLevel / xpForNextLevel) * 100)));

  return {
    level,
    xpPoints: safeXp,
    xpInCurrentLevel,
    xpForNextLevel,
    xpToNextLevel,
    xpProgressPercent,
  };
}
