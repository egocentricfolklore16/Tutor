/**
 * Safely extracts and validates weekly study hours target from profile.
 * Falls back to safe default of 5 hours if missing, null, invalid, or out of range.
 *
 * @param {Object|null|undefined} profile - User profile object
 * @returns {number} Weekly study hours target (integer between 1 and 80)
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

  return Math.round(parsed);
}

/**
 * Derives daily study goal minutes based on explicit preference or onboarding answers
 * (weekly_hours and study_days).
 *
 * @param {Object|null|undefined} profile - User profile object
 * @returns {number} Daily goal in minutes (integer between 15 and 480)
 */
export function getDailyGoalMinutes(profile) {
  const DEFAULT_DAILY_MINUTES = 30;

  if (!profile) return DEFAULT_DAILY_MINUTES;

  const explicit = Number(profile.daily_goal_minutes);
  if (Number.isFinite(explicit) && explicit >= 5 && explicit <= 720) {
    return Math.round(explicit);
  }

  const weeklyHours = getWeeklyHours(profile);
  const studyDays = Array.isArray(profile.study_days) && profile.study_days.length > 0
    ? profile.study_days
    : Array.isArray(profile.studyDays) && profile.studyDays.length > 0
      ? profile.studyDays
      : null;

  const daysCount = studyDays ? studyDays.length : 5;
  const dailyMinutes = Math.round((weeklyHours * 60) / daysCount);

  return Math.max(15, Math.min(480, dailyMinutes));
}
