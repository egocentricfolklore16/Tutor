/**
 * Pure utility function to sort achievement badges.
 * Earned badges come first (sorted descending by unlock date).
 * Unearned badges follow (sorted descending by progress ratio towards target).
 *
 * @param {Array} badges - Array of badge objects
 * @returns {Array} Sorted array of badges
 */
export function sortBadges(badges) {
  if (!Array.isArray(badges)) return [];

  const validBadges = badges.filter(Boolean);

  const earned = validBadges
    .filter((b) => Boolean(b.earned))
    .sort((a, b) => {
      const timeA = a.unlocked_at ? new Date(a.unlocked_at).getTime() : 0;
      const timeB = b.unlocked_at ? new Date(b.unlocked_at).getTime() : 0;
      return timeB - timeA;
    });

  const unearned = validBadges
    .filter((b) => !b.earned)
    .sort((a, b) => {
      const ratioA = (Number(a.progress) || 0) / (Number(a.target) || 1);
      const ratioB = (Number(b.progress) || 0) / (Number(b.target) || 1);
      return ratioB - ratioA;
    });

  return [...earned, ...unearned];
}
