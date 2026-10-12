/**
 * Formats XP or metric values for leaderboard UI display.
 * Abbreviates values >= 10,000 to "12.4k" and formats smaller values with locale string.
 *
 * @param {number|string|null|undefined} val
 * @returns {string}
 */
export function formatXpDisplay(val) {
  const num = Number(val) || 0;
  if (num >= 10000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toLocaleString();
}
