import { useState, useEffect, useCallback } from "react";
import supabase from "../lib/supabase";

export function useInAppNotifications() {
  const [userId, setUserId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [actorProfiles, setActorProfiles] = useState({});
  const [loading, setLoading] = useState(true);

  // 1. Get current auth user
  useEffect(() => {
    let isMounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (isMounted && user) {
        setUserId(user.id);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch actor profiles for notifications
  const fetchActorProfiles = useCallback(async (actorIds) => {
    if (!actorIds || actorIds.length === 0) return;
    try {
      const { data, error } = await supabase
        .from("community_profiles")
        .select("*")
        .in("user_id", actorIds);

      if (error) {
        console.error("Error fetching notification actor profiles:", error);
        return;
      }

      setActorProfiles((prev) => {
        const next = { ...prev };
        (data || []).forEach((prof) => {
          next[prof.user_id] = prof;
        });
        return next;
      });
    } catch (err) {
      console.error("Failed to fetch actor profiles:", err);
    }
  }, []);

  // 3. Fetch initial in_app_notifications
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("in_app_notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(40);

      if (error) throw error;

      const items = data || [];
      setNotifications(items);

      const actorIds = Array.from(
        new Set(items.map((n) => n.actor_id).filter(Boolean))
      );
      if (actorIds.length > 0) {
        await fetchActorProfiles(actorIds);
      }
    } catch (err) {
      console.error("Error fetching in_app_notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, fetchActorProfiles]);

  useEffect(() => {
    if (userId) {
      fetchNotifications();
    }
  }, [userId, fetchNotifications]);

  // 4. Realtime subscription to in_app_notifications
  useEffect(() => {
    if (!userId) return;

    const channelName = `in_app_notifications:${userId}:${crypto.randomUUID()}`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "in_app_notifications",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const newNotif = payload.new;
          setNotifications((prev) => [newNotif, ...prev]);

          if (newNotif.actor_id) {
            await fetchActorProfiles([newNotif.actor_id]);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "in_app_notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new;
          setNotifications((prev) =>
            prev.map((item) => (item.id === updated.id ? updated : item))
          );
        }
      );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchActorProfiles]);

  // Actions
  const markAsRead = async (notificationId) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      const { error } = await supabase
        .from("in_app_notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) console.error("Error marking notification read:", error);
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      const { error } = await supabase
        .from("in_app_notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) console.error("Error marking all read:", error);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    userId,
    notifications,
    actorProfiles,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refreshNotifications: fetchNotifications,
  };
}
