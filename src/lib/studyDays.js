/**
 * Checks if a given day name is among the user's preferred study days.
 *
 * @param {string} dayName - Name of the day (e.g., "Mon", "Monday")
 * @param {Array<string>} preferredDays - Array of preferred study days (e.g., ["Mon", "Wed", "Fri"])
 * @returns {boolean}
 */
export function isPreferredStudyDay(dayName, preferredDays = []) {
  if (!dayName || !Array.isArray(preferredDays) || preferredDays.length === 0) {
    return false;
  }
  const normalizedDay = String(dayName).trim().toLowerCase().slice(0, 3);
  return preferredDays.some((d) => String(d).trim().toLowerCase().slice(0, 3) === normalizedDay);
}
