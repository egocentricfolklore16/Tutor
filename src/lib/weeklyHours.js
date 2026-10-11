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
