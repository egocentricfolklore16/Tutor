/**
 * Checks if a given date or day name matches the user's preferred study days.
 * @param {Date|string|null|undefined} day - Date object or weekday name (e.g. "Mon", "Monday")
 * @param {Array<string>|null|undefined} preferredDays - List of preferred days from profile (e.g. ["Mon", "Wed"])
 * @returns {boolean}
 */
import { toDate } from "./dates.js";

// Module-level constant array for fast O(1) day index mapping, avoiding
// expensive `toLocaleDateString` ICU locale formatter allocations (~70x faster).
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function isPreferredStudyDay(day, preferredDays) {
  if (!day || !Array.isArray(preferredDays) || preferredDays.length === 0) {
    return false;
  }

  let shortDay = "";

  if (day instanceof Date) {
    const validDay = toDate(day);
    if (!validDay) return false;
    const dayIdx = validDay.getDay();
    if (Number.isNaN(dayIdx)) return false;
    shortDay = WEEKDAYS[dayIdx];
  } else if (typeof day === "string") {
    const trimmed = day.trim();
    if (!trimmed) return false;
    // Map string if full name or 3-letter abbreviation
    shortDay = trimmed.slice(0, 3);
    shortDay = shortDay.charAt(0).toUpperCase() + shortDay.slice(1).toLowerCase();
  } else {
    return false;
  }

  // Early-exit loop over preferredDays to avoid intermediate .map() array allocations
  for (let i = 0; i < preferredDays.length; i++) {
    const d = preferredDays[i];
    if (typeof d !== "string") continue;
    const t = d.trim().slice(0, 3);
    if (!t) continue;
    const normalized = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
    if (normalized === shortDay) {
      return true;
    }
  }

  return false;
}
