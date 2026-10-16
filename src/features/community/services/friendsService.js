import supabase from "../../../lib/supabase.js";

/**
 * Fetch current user's friendships with public profile data
 */
export async function fetchUserFriendships(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status, created_at, updated_at")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error) throw error;

  const friendships = data || [];
  const friendUserIds = [
    ...new Set(
      friendships.map((f) => (f.requester_id === userId ? f.addressee_id : f.requester_id))
    ),
  ];

  if (friendUserIds.length === 0) return friendships;

  // Fetch public profile details safely
  const { data: profiles } = await supabase
    .from("community_profiles")
    .select("user_id, username, full_name, user_img, level")
    .in("user_id", friendUserIds);

  const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

  return friendships.map((f) => {
    const targetId = f.requester_id === userId ? f.addressee_id : f.requester_id;
    return {
      ...f,
      friend_profile: profileMap.get(targetId) || {
        user_id: targetId,
        username: "learner",
        full_name: "Learner",
        user_img: null,
        level: 1,
      },
    };
  });
}

/**
 * Search users by username or full name (capped, minimum query length required)
 */
export async function searchUsers(query, currentUserId) {
  const trimmed = (query || "").trim();
  if (trimmed.length < 2) return [];

  const { data, error } = await supabase
    .from("community_profiles")
    .select("user_id, username, full_name, user_img, level")
    .or(`username.ilike.%${trimmed}%,full_name.ilike.%${trimmed}%`)
    .limit(20);

  if (error) throw error;

  return (data || []).filter((p) => p.user_id !== currentUserId);
}

/**
 * Send friend request
 */
export async function sendFriendRequest(currentUserId, targetUserId) {
  if (currentUserId === targetUserId) {
    throw new Error("You cannot send a friend request to yourself");
  }

  const { data, error } = await supabase
    .from("friendships")
    .insert({
      requester_id: currentUserId,
      addressee_id: targetUserId,
      status: "pending",
    })
    .select()
    .single();

  if (error && !error.message?.includes("duplicate")) throw error;
  return data;
}

/**
 * Accept, decline, or block friendship
 */
export async function updateFriendshipStatus(friendshipId, status) {
  const { data, error } = await supabase
    .from("friendships")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", friendshipId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Remove friendship / cancel request
 */
export async function removeFriendship(friendshipId) {
  const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
  if (error) throw error;
  return true;
}
