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

/**
 * Compute aggregate social statistics for accepted friendships list
 */
export function computeFriendStats(friends = [], _currentUserId = null) {
  if (!Array.isArray(friends) || friends.length === 0) {
    return { totalFriends: 0, avgLevel: 1, activeCount: 0 };
  }

  let totalLevel = 0;
  let validProfiles = 0;

  friends.forEach((f) => {
    const prof = f?.friend_profile;
    if (prof) {
      totalLevel += Number(prof.level) || 1;
      validProfiles++;
    }
  });

  const totalFriends = friends.length;
  const avgLevel = validProfiles > 0 ? Math.round((totalLevel / validProfiles) * 10) / 10 : 1;

  return {
    totalFriends,
    avgLevel,
    activeCount: totalFriends,
  };
}

/**
 * Filter friends list by search query (matching full name or username)
 */
export function filterFriendsList(friends = [], _currentUserId = null, query = "") {
  if (!Array.isArray(friends)) return [];
  const q = (query || "").trim().toLowerCase();
  if (!q) return friends;

  return friends.filter((f) => {
    const prof = f?.friend_profile;
    if (!prof) return false;
    const nameMatch = prof.full_name && prof.full_name.toLowerCase().includes(q);
    const usernameMatch = prof.username && prof.username.toLowerCase().includes(q);
    return Boolean(nameMatch || usernameMatch);
  });
}
