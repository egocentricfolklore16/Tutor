/**
 * Evaluate the friendship relationship state between current user and target user
 */
export function getFriendshipState(friendships = [], currentUserId, targetUserId) {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    return { state: "self", friendshipId: null };
  }

  const existing = friendships.find(
    (f) =>
      (f.requester_id === targetUserId || f.addressee_id === targetUserId) &&
      (f.requester_id === currentUserId || f.addressee_id === currentUserId)
  );

  if (!existing) {
    return { state: "none", friendshipId: null };
  }

  if (existing.status === "accepted") {
    return { state: "accepted", friendshipId: existing.id };
  }

  if (existing.status === "blocked") {
    return { state: "blocked", friendshipId: existing.id };
  }

  if (existing.status === "pending") {
    if (existing.requester_id === currentUserId) {
      return { state: "pending_sent", friendshipId: existing.id };
    }
    if (existing.addressee_id === currentUserId) {
      return { state: "pending_received", friendshipId: existing.id };
    }
  }

  return { state: "none", friendshipId: null };
}
