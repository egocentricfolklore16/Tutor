/**
 * Pure helper utilities for badge sorting and progress calculation.
 */

export function sortBadges(badges) {
  if (!Array.isArray(badges)) return [];

  const earnedBadges = badges
    .filter((a) => a.earned)
    .sort((a, b) => new Date(b.unlocked_at || 0) - new Date(a.unlocked_at || 0));

  const unearnedBadges = badges
    .filter((a) => !a.earned)
    .sort((a, b) => {
      const ratioA = (a.progress || 0) / (a.target || 1);
      const ratioB = (b.progress || 0) / (b.target || 1);
      return ratioB - ratioA;
    });

  return [...earnedBadges, ...unearnedBadges];
}
