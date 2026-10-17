import supabase from "../../../lib/supabase.js";

/**
 * Fetch activity feed with cursor-based pagination
 */
export async function fetchActivityFeed({
  filter = "all",
  cursor = null,
  limit = 20,
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

  const items = events.map((event) => ({
    ...event,
    actor_profile: profileMap.get(event.actor_id) || {
      user_id: event.actor_id,
      username: "learner",
      full_name: "Learner",
      user_img: null,
      level: 1,
    },
  }));

  const nextCursor = hasMore && events.length > 0 ? events[events.length - 1].created_at : null;

  return { items, nextCursor, hasMore };
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
