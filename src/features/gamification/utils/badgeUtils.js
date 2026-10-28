/**
 * Pure utility function to sort achievement badges.
 * Earned badges come first (sorted descending by unlock date).
 * Unearned badges follow (sorted descending by progress ratio towards target).
 *
 * Pre-computes numeric timestamps and completion ratios in a single O(N) pass
 * prior to sorting to eliminate repeated Date object allocations and floating point
 * division during O(N log N) comparator executions.
 *
 * @param {Array} badges - Array of badge objects
 * @returns {Array} Sorted array of badges
 */
export function sortBadges(badges) {
  if (!Array.isArray(badges)) return [];

  const earned = [];
  const unearned = [];

  // Single pass O(N) loop to partition and decorate with numeric sort keys
  for (let i = 0; i < badges.length; i++) {
    const badge = badges[i];
    if (!badge) continue;

    if (badge.earned) {
      const time = badge.unlocked_at ? new Date(badge.unlocked_at).getTime() : 0;
      earned.push({ badge, time });
    } else {
      const ratio = (Number(badge.progress) || 0) / (Number(badge.target) || 1);
      unearned.push({ badge, ratio });
    }
  }

  // Fast O(N log N) primitive number comparisons
  earned.sort((a, b) => b.time - a.time);
  unearned.sort((a, b) => b.ratio - a.ratio);

  const result = new Array(earned.length + unearned.length);
  let idx = 0;
  for (let i = 0; i < earned.length; i++) {
    result[idx++] = earned[i].badge;
  }
  for (let i = 0; i < unearned.length; i++) {
    result[idx++] = unearned[i].badge;
  }

  return result;
}
