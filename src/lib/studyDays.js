/**
 * Checks if a given date or day name matches the user's preferred study days.
 * @param {Date|string|null|undefined} day - Date object or weekday name (e.g. "Mon", "Monday")
 * @param {Array<string>|null|undefined} preferredDays - List of preferred days from profile (e.g. ["Mon", "Wed"])
 * @returns {boolean}
 */
export function isPreferredStudyDay(day, preferredDays) {
  if (!day || !Array.isArray(preferredDays) || preferredDays.length === 0) {
    return false;
  }

  let shortDay = "";

  if (day instanceof Date) {
    if (isNaN(day.getTime())) return false;
    shortDay = day.toLocaleDateString("en-US", { weekday: "short" });
  } else if (typeof day === "string") {
    const trimmed = day.trim();
    if (!trimmed) return false;
    // Map string if full name or 3-letter abbreviation
    shortDay = trimmed.slice(0, 3);
    shortDay = shortDay.charAt(0).toUpperCase() + shortDay.slice(1).toLowerCase();
  } else {
    return false;
  }

  const normalizedPreferred = preferredDays.map((d) => {
    if (typeof d !== "string") return "";
    const t = d.trim().slice(0, 3);
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  });

  return normalizedPreferred.includes(shortDay);
}
