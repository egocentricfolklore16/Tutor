export const PRIMARY_GOAL_NOTES = {
  "Improve my grades": "Targeting steady grade improvements through consistent subject mastery.",
  "Prepare for an exam": "Focusing on exam readiness with high-yield practice and revision sessions.",
  "Learn a new skill": "Building new practical capabilities step-by-step at your own rhythm.",
  "Advance my career": "Accelerating your professional growth through targeted skill acquisition.",
};

/**
 * Returns a personalized note based on the user's primary goal preference.
 *
 * @param {string|null|undefined} primaryGoal
 * @returns {string}
 */
export function getPrimaryGoalNote(primaryGoal) {
  if (!primaryGoal || typeof primaryGoal !== "string") {
    return "Focusing on building consistent study habits and overall academic success.";
  }

  const cleanGoal = primaryGoal.trim();
  if (PRIMARY_GOAL_NOTES[cleanGoal]) {
    return PRIMARY_GOAL_NOTES[cleanGoal];
  }

  const lower = cleanGoal.toLowerCase();
  if (lower.includes("grade")) {
    return PRIMARY_GOAL_NOTES["Improve my grades"];
  }
  if (lower.includes("exam") || lower.includes("test")) {
    return PRIMARY_GOAL_NOTES["Prepare for an exam"];
  }
  if (lower.includes("skill")) {
    return PRIMARY_GOAL_NOTES["Learn a new skill"];
  }
  if (lower.includes("career") || lower.includes("job") || lower.includes("work")) {
    return PRIMARY_GOAL_NOTES["Advance my career"];
  }

  return "Focusing on building consistent study habits and overall academic success.";
}
