/**
 * Helpers for normalizing and applying onboarding accessibility preferences.
 */

/**
 * Checks case-insensitively whether a profile or array of needs includes a target need.
 * @param {object|string[]|null|undefined} profileOrNeeds
 * @param {string} targetNeed
 * @returns {boolean}
 */
export function hasAccessibilityNeed(profileOrNeeds, targetNeed) {
  if (!profileOrNeeds || !targetNeed) return false;
  const needs = Array.isArray(profileOrNeeds)
    ? profileOrNeeds
    : Array.isArray(profileOrNeeds.accessibility_needs)
    ? profileOrNeeds.accessibility_needs
    : Array.isArray(profileOrNeeds.accessibilityNeeds)
    ? profileOrNeeds.accessibilityNeeds
    : [];

  const target = String(targetNeed).trim().toLowerCase();
  return needs.some((item) => typeof item === "string" && item.trim().toLowerCase() === target);
}

/**
 * Returns an array of root CSS class names based on active accessibility preferences.
 * @param {object|string[]|null|undefined} profileOrNeeds
 * @returns {string[]}
 */
export function getAccessibilityClasses(profileOrNeeds) {
  const classes = [];
  if (hasAccessibilityNeed(profileOrNeeds, "High contrast")) {
    classes.push("high-contrast");
  }
  if (hasAccessibilityNeed(profileOrNeeds, "Larger text")) {
    classes.push("accessibility-large-text");
  }
  return classes;
}
