import { LEVEL_MILESTONES, getNextLevelMilestone, calculateXpLevel } from "./levelCurve.js";

export { LEVEL_MILESTONES, getNextLevelMilestone, calculateXpLevel };

export const MAP_ZONES = [
  {
    id: "zone-1",
    name: "Starter Valley",
    startLevel: 1,
    endLevel: 2,
    gradientLight: "from-emerald-400/20 via-teal-300/15 to-emerald-50/10",
    gradientDark: "from-emerald-950/40 via-teal-950/20 to-transparent",
    bannerBgLight: "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/20",
    bannerBgDark: "dark:from-emerald-700 dark:to-teal-800",
    badgeBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
    nodeColor: "emerald",
    icon: "sprout",
    description: "Begin your learning adventure and build daily habits",
  },
  {
    id: "zone-2",
    name: "Focus Grove",
    startLevel: 3,
    endLevel: 4,
    gradientLight: "from-cyan-400/20 via-sky-300/15 to-cyan-50/10",
    gradientDark: "from-cyan-950/40 via-sky-950/20 to-transparent",
    bannerBgLight: "bg-gradient-to-r from-cyan-500 to-sky-600 text-white shadow-cyan-500/20",
    bannerBgDark: "dark:from-cyan-700 dark:to-sky-800",
    badgeBg: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300",
    nodeColor: "cyan",
    icon: "target",
    description: "Unlock focus tools, Pomodoro timer themes & streak freezes",
  },
  {
    id: "zone-3",
    name: "Knowledge Citadel",
    startLevel: 5,
    endLevel: 9,
    gradientLight: "from-amber-400/20 via-orange-300/15 to-amber-50/10",
    gradientDark: "from-amber-950/40 via-orange-950/20 to-transparent",
    bannerBgLight: "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-amber-500/20",
    bannerBgDark: "dark:from-amber-700 dark:to-orange-800",
    badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
    nodeColor: "amber",
    icon: "book",
    description: "Master AI Quiz generation & advanced study modes",
  },
  {
    id: "zone-4",
    name: "Scholar's Realm",
    startLevel: 10,
    endLevel: 19,
    gradientLight: "from-purple-400/20 via-indigo-300/15 to-purple-50/10",
    gradientDark: "from-purple-950/40 via-indigo-950/20 to-transparent",
    bannerBgLight: "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-purple-500/20",
    bannerBgDark: "dark:from-purple-700 dark:to-indigo-800",
    badgeBg: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
    nodeColor: "purple",
    icon: "award",
    description: "Harness 2x Gem Multiplier & Streak Society membership",
  },
  {
    id: "zone-5",
    name: "Legend Peak",
    startLevel: 20,
    endLevel: Infinity,
    gradientLight: "from-rose-400/20 via-amber-300/15 to-yellow-50/10",
    gradientDark: "from-rose-950/40 via-amber-950/20 to-transparent",
    bannerBgLight: "bg-gradient-to-r from-rose-500 via-amber-500 to-yellow-500 text-white shadow-rose-500/20",
    bannerBgDark: "dark:from-rose-700 dark:via-amber-700 dark:to-yellow-700",
    badgeBg: "bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200",
    nodeColor: "yellow",
    icon: "crown",
    description: "Exclusive profile frames & legendary avatar badges",
  },
];

/**
 * Find the zone configuration for a specific level number.
 */
export function getZoneForLevel(levelNumber) {
  const safeLvl = Math.max(1, Number(levelNumber) || 1);
  return (
    MAP_ZONES.find((z) => safeLvl >= z.startLevel && safeLvl <= z.endLevel) ||
    MAP_ZONES[MAP_ZONES.length - 1]
  );
}

/**
 * Calculates cumulative total XP required to reach the start of a level.
 */
export function getXpRequiredForLevel(targetLevel) {
  const safeTarget = Math.max(1, Number(targetLevel) || 1);
  let totalXp = 0;
  let xpForNext = 100;

  for (let lvl = 1; lvl < safeTarget; lvl++) {
    totalXp += xpForNext;
    xpForNext += 50;
  }
  return totalXp;
}

/**
 * Generates the array of map nodes to display based on the user's current level.
 * Rule: Show EVERY level as a node from Level 1 up to the next two milestones beyond user's level.
 * Beyond that, if Level 20 is not reached/rendered, show a single "Keep climbing" teaser node pointing to Level 20.
 */
export function generateMapNodes(userLevel = 1) {
  const safeUserLevel = Math.max(1, Number.isFinite(Number(userLevel)) ? Number(userLevel) : 1);

  // Find milestones beyond user's level
  const futureMilestones = LEVEL_MILESTONES.filter((m) => m.level > safeUserLevel);

  let maxRenderLevel = safeUserLevel;

  if (futureMilestones.length === 0) {
    // User is at or beyond max milestone (L20+)
    maxRenderLevel = Math.max(20, safeUserLevel);
  } else if (futureMilestones.length === 1) {
    // e.g. L10 < userLevel < L20, only L20 is remaining
    maxRenderLevel = futureMilestones[0].level;
  } else {
    // Take the 2nd future milestone
    maxRenderLevel = futureMilestones[1].level;
  }

  const nodes = [];
  for (let lvl = 1; lvl <= maxRenderLevel; lvl++) {
    const milestone = LEVEL_MILESTONES.find((m) => m.level === lvl) || null;
    const zone = getZoneForLevel(lvl);
    const xpRequired = getXpRequiredForLevel(lvl);

    nodes.push({
      level: lvl,
      isMilestone: Boolean(milestone),
      milestoneTitle: milestone?.title || null,
      milestoneDesc: milestone?.desc || milestone?.perk || null,
      milestoneIcon: milestone?.icon || null,
      xpRequired,
      zone,
      isTeaser: false,
    });
  }

  // If final milestone (Level 20) is not rendered, add a single teaser node
  if (maxRenderLevel < 20) {
    const finalMilestone = LEVEL_MILESTONES.find((m) => m.level === 20);
    const finalZone = getZoneForLevel(20);
    nodes.push({
      level: 20,
      isMilestone: true,
      milestoneTitle: finalMilestone?.title || "Hyper Tutor Legend",
      milestoneDesc: finalMilestone?.desc || "Unlock exclusive profile frames & legendary avatar badges",
      milestoneIcon: finalMilestone?.icon || "crown",
      xpRequired: getXpRequiredForLevel(20),
      zone: finalZone,
      isTeaser: true,
      teaserText: "Keep climbing to reach Level 20!",
    });
  }

  return nodes;
}
