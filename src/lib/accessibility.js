/**
 * Evaluates profile accessibility_needs and returns active feature flags.
 *
 * @param {string[]|null|undefined} needs - Array of accessibility preferences from profile
 * @returns {{ hasLargerText: boolean, hasHighContrast: boolean }}
 */
export function getAccessibilityFlags(needs) {
  if (!Array.isArray(needs)) {
    return { hasLargerText: false, hasHighContrast: false };
  }

  const normalized = needs.map((item) => String(item || "").trim().toLowerCase());

  return {
    hasLargerText: normalized.includes("larger text"),
    hasHighContrast: normalized.includes("high contrast"),
  };
}
