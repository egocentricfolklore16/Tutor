/**
 * Safely extracts and validates weekly study hours target from profile.
 * Falls back to safe default of 5 hours if missing, null, invalid, or out of range.
 *
 * @param {Object|null|undefined} profile - User profile object
 * @returns {number} Weekly study hours target (number between 1 and 80)
 */
export function getWeeklyHours(profile) {
  const DEFAULT_HOURS = 5;

  if (!profile) return DEFAULT_HOURS;

  const rawHours = profile.weekly_hours ?? profile.weeklyHours;

  if (rawHours === null || rawHours === undefined || rawHours === "") {
    return DEFAULT_HOURS;
  }

  const parsed = Number(rawHours);

  if (isNaN(parsed) || !isFinite(parsed) || parsed < 1 || parsed > 80) {
    return DEFAULT_HOURS;
  }

  return parsed;
}

/**
 * Safely derives daily study goal target in minutes from profile.
 * Prioritizes explicit `daily_goal_minutes`, then derives from onboarding preferences
 * (`weekly_hours` divided across active `study_days`), falling back to a default of 30 minutes.
 * Clamps result between 15 and 480 minutes (8 hours).
 *
 * @param {Object|null|undefined} profile - User profile object
 * @returns {number} Daily goal target in minutes (integer between 15 and 480)
 */
export function getDailyGoalMinutes(profile) {
  const DEFAULT_MINUTES = 30;

  if (!profile) return DEFAULT_MINUTES;

  // 1. Explicit daily_goal_minutes preference
  const rawDaily = profile.daily_goal_minutes ?? profile.dailyGoalMinutes;
  if (rawDaily !== null && rawDaily !== undefined && rawDaily !== "") {
    const parsedDaily = Number(rawDaily);
    if (!isNaN(parsedDaily) && isFinite(parsedDaily) && parsedDaily > 0) {
      return Math.min(Math.max(Math.round(parsedDaily), 15), 480);
    }
  }

  // 2. Derive from weekly_hours & study_days
  const weeklyHours = getWeeklyHours(profile); // 1-80 hrs
  const studyDays = Array.isArray(profile.study_days) && profile.study_days.length > 0
    ? profile.study_days.length
    : 7;

  const derivedMinutes = Math.round((weeklyHours * 60) / studyDays);

  return Math.min(Math.max(derivedMinutes, 15), 480);
}
