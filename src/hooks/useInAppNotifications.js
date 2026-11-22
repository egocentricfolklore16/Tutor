import { useState, useEffect, useCallback } from "react";
import supabase from "../lib/supabase";
import { useRealtimeTable } from "../lib/realtime/index.js";

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

  // 2. Fetch actor profiles for notifications via get_public_profile
  const fetchActorProfiles = useCallback(async (actorIds) => {
    if (!actorIds || actorIds.length === 0) return;
    try {
      const profsList = await Promise.all(
        actorIds.map(async (uid) => {
          const { data, error } = await supabase.rpc("get_public_profile", {
            p_user_id: uid,
          });
          if (error) return null;
          return { user_id: uid, ...data };
        })
      );

      setActorProfiles((prev) => {
        const next = { ...prev };
        profsList.forEach((prof) => {
          if (prof) next[prof.user_id] = prof;
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

  const handleNotificationChange = useCallback(
    async (payload) => {
      const { eventType, new: next, old } = payload;
      if (eventType === "DELETE") {
        setNotifications((prev) => prev.filter((item) => item.id !== old.id));
        return;
      }

      setNotifications((prev) => {
        const index = prev.findIndex((item) => item.id === next.id);
        if (eventType === "UPDATE") {
          if (index < 0) return prev;
          return prev.map((item) => (item.id === next.id ? { ...item, ...next } : item));
        }
        return index < 0 ? [next, ...prev].slice(0, 40) : prev;
      });

      if (eventType === "INSERT" && next.actor_id) {
        await fetchActorProfiles([next.actor_id]);
      }
    },
    [fetchActorProfiles]
  );

  useRealtimeTable({
    table: "in_app_notifications",
    filter: userId ? `user_id=eq.${userId}` : undefined,
    enabled: Boolean(userId),
    onChange: handleNotificationChange,
    onReconnect: fetchNotifications,
    onRecover: fetchNotifications,
  });

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
