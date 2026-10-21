import supabase from "../../../lib/supabase.js";

/**
 * Fetch activity feed with cursor-based pagination
 */
export async function fetchActivityFeed({
  filter = "all",
  cursor = null,
  limit = 20,
  currentUserId = null,
}) {
  let query = supabase
    .from("activity_events")
    .select("id, actor_id, type, payload, visibility, group_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  if (filter === "milestones") {
    query = query.in("type", ["streak_milestone", "level_up", "achievement_unlocked"]);
  } else if (filter === "friends") {
    query = query.eq("visibility", "friends");
  } else if (filter === "groups") {
    query = query.eq("visibility", "group");
  }

  const { data, error } = await query;
  if (error) throw error;

  const rawEvents = data || [];
  const hasMore = rawEvents.length > limit;
  const events = hasMore ? rawEvents.slice(0, limit) : rawEvents;

  const actorIds = [...new Set(events.map((e) => e.actor_id))];
  let profileMap = new Map();

  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("community_profiles")
      .select("user_id, username, full_name, user_img, level")
      .in("user_id", actorIds);

    profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
  }

  // Batch fetch activity cheers in $O(1)$ query
  const eventIds = events.map((e) => e.id);
  const cheerCountsMap = new Map();
  const userCheeredSet = new Set();

  if (eventIds.length > 0) {
    try {
      const { data: cheersData } = await supabase
        .from("activity_cheers")
        .select("activity_id, user_id")
        .in("activity_id", eventIds);

      (cheersData || []).forEach((c) => {
        const prev = cheerCountsMap.get(c.activity_id) || 0;
        cheerCountsMap.set(c.activity_id, prev + 1);
        if (currentUserId && c.user_id === currentUserId) {
          userCheeredSet.add(c.activity_id);
        }
      });
    } catch {
      // Graceful fallback if cheers table is missing or query fails
    }
  }

  const items = events.map((event) => {
    const backendCount = cheerCountsMap.get(event.id);
    const initialCount = backendCount !== undefined ? backendCount : (event.payload?.cheers || 0);

    return {
      ...event,
      cheer_count: initialCount,
      is_cheered: userCheeredSet.has(event.id),
      actor_profile: profileMap.get(event.actor_id) || {
        user_id: event.actor_id,
        username: "learner",
        full_name: "Learner",
        user_img: null,
        level: 1,
      },
    };
  });

  const nextCursor = hasMore && events.length > 0 ? events[events.length - 1].created_at : null;

  return { items, nextCursor, hasMore };
}

/**
 * Toggle persistent cheer on an activity event
 */
export async function toggleActivityCheer(activityId, currentUserId) {
  if (!activityId || !currentUserId) return { cheered: false };

  const { data: existing } = await supabase
    .from("activity_cheers")
    .select("id")
    .eq("activity_id", activityId)
    .eq("user_id", currentUserId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("activity_cheers")
      .delete()
      .eq("id", existing.id);

    if (error) throw error;
    return { cheered: false };
  } else {
    const { error } = await supabase
      .from("activity_cheers")
      .insert({
        activity_id: activityId,
        user_id: currentUserId,
      });

    if (error) throw error;
    return { cheered: true };
  }
}

/**
 * Publish manual activity event
 */
export async function publishActivityEvent(actorId, type, payload = {}, visibility = "friends", groupId = null) {
  if (!actorId) return null;

  const { data, error } = await supabase
    .from("activity_events")
    .insert({
      actor_id: actorId,
      type,
      payload,
      visibility,
      group_id: groupId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Subscribe to Realtime activity events
 */
export function subscribeToActivityEvents(onEventReceived) {
  const channelTopic = `public:activity_events:${crypto.randomUUID()}`;
  const channel = supabase
    .channel(channelTopic)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "activity_events" },
      (payload) => {
        if (payload?.new && typeof onEventReceived === "function") {
          onEventReceived(payload.new);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
