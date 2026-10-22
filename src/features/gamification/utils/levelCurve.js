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

export const LEVEL_MILESTONES = [
  {
    level: 1,
    title: "Curious Learner",
    desc: "Access to standard study sessions & Lumo AI Assistant",
    perk: "Access to standard study sessions & Lumo AI Assistant",
    icon: "zap",
    xpRequired: 0,
  },
  {
    level: 3,
    title: "Focus Apprentice",
    desc: "Unlock custom Pomodoro timer themes & streak freeze purchases",
    perk: "Unlock custom Pomodoro timer themes & streak freeze purchases",
    icon: "shield",
    xpRequired: 250,
  },
  {
    level: 5,
    title: "Knowledge Builder",
    desc: "Unlock AI Quiz generation & advanced flashcard review modes",
    perk: "Unlock AI Quiz generation & advanced flashcard review modes",
    icon: "book",
    xpRequired: 600,
  },
  {
    level: 10,
    title: "Scholar Master",
    desc: "Unlock 2x Gem Multiplier & Streak Society membership perk",
    perk: "Unlock 2x Gem Multiplier & Streak Society membership perk",
    icon: "award",
    xpRequired: 2250,
  },
  {
    level: 20,
    title: "Hyper Tutor Legend",
    desc: "Unlock exclusive profile frames & legendary avatar badges",
    perk: "Unlock exclusive profile frames & legendary avatar badges",
    icon: "crown",
    xpRequired: 9250,
  },
];

export function getNextLevelMilestone(currentLevel) {
  const safeLevel = Math.max(1, Number.isFinite(Number(currentLevel)) ? Number(currentLevel) : 1);
  return LEVEL_MILESTONES.find((m) => m.level > safeLevel) || LEVEL_MILESTONES[LEVEL_MILESTONES.length - 1];
}
