import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import supabase from "../lib/supabase";
import { getNotificationDetails } from "../lib/inAppNotifications";

export { getNotificationDetails };

const InAppNotificationContext = createContext(null);

export function InAppNotificationProvider({ user, children }) {
  const userId = user?.id || null;
  const [notifications, setNotifications] = useState([]);
  const [actorProfiles, setActorProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tracks active open chat thread to suppress notifications/toasts for it
  const [activeConversationId, setActiveConversationId] = useState(null);

  // In-app Toast state & burst rate limiting queue
  const [activeToast, setActiveToast] = useState(null);
  const toastTimeoutRef = useRef(null);
  const toastBurstCountRef = useRef(0);
  const toastBurstTimerRef = useRef(null);

  // Fetch actor profiles from public view community_profiles (.in('user_id', ids))
  const fetchActorProfiles = useCallback(async (actorIds) => {
    if (!actorIds || actorIds.length === 0) return;
    const uniqueIds = Array.from(new Set(actorIds.filter(Boolean)));
    if (uniqueIds.length === 0) return;

    try {
      const { data, error: profError } = await supabase
        .from("community_profiles")
        .select("*")
        .in("user_id", uniqueIds);

      if (profError) {
        console.error("Error fetching notification actor profiles:", profError);
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

  // Fetch initial in_app_notifications
  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: notifError } = await supabase
        .from("in_app_notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (notifError) throw notifError;

      const items = data || [];
      setNotifications(items);

      const actorIds = Array.from(new Set(items.map((n) => n.actor_id).filter(Boolean)));
      if (actorIds.length > 0) {
        await fetchActorProfiles(actorIds);
      }
    } catch (err) {
      console.error("Error fetching in_app_notifications:", err);
      setError(err.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [userId, fetchActorProfiles]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Trigger compact toast with burst rate limiting
  const triggerToast = useCallback((notif, actorObj) => {
    if (!notif) return;

    toastBurstCountRef.current += 1;
    const currentBurst = toastBurstCountRef.current;

    if (toastBurstTimerRef.current) clearTimeout(toastBurstTimerRef.current);
    toastBurstTimerRef.current = setTimeout(() => {
      toastBurstCountRef.current = 0;
    }, 1500);

    const actorName = actorObj?.full_name || actorObj?.username || "Someone";
    const details = getNotificationDetails(notif, actorName);

    if (currentBurst > 1) {
      setActiveToast({
        id: notif.id,
        title: "New Notifications",
        text: `${currentBurst} new notifications`,
        avatar: null,
        route: "/notifications",
        notification: notif,
      });
    } else {
      setActiveToast({
        id: notif.id,
        title: actorName,
        text: details.text,
        avatar: actorObj?.user_img || null,
        route: details.route,
        notification: notif,
      });
    }

    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setActiveToast(null);
    }, 4500);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setActiveToast(null);
  }, []);

  // Realtime subscription ONCE per signed-in user
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`in_app_notifications:${userId}`)
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
          if (!newNotif) return;

          let actorObj = actorProfiles[newNotif.actor_id];
          if (newNotif.actor_id && !actorObj) {
            const { data } = await supabase
              .from("community_profiles")
              .select("*")
              .eq("user_id", newNotif.actor_id)
              .maybeSingle();

            if (data) {
              actorObj = data;
              setActorProfiles((prev) => ({ ...prev, [data.user_id]: data }));
            }
          }

          const isForActiveThread =
            newNotif.type === "new_message" &&
            activeConversationId &&
            newNotif.payload?.conversation_id === activeConversationId;

          if (isForActiveThread) {
            if (newNotif.payload?.conversation_id) {
              supabase
                .from("conversation_participants")
                .update({ last_read_at: new Date().toISOString() })
                .eq("conversation_id", newNotif.payload.conversation_id)
                .eq("user_id", userId)
                .then(() => {});

              supabase
                .from("in_app_notifications")
                .update({ is_read: true })
                .eq("id", newNotif.id)
                .then(() => {});
            }

            setNotifications((prev) => [
              { ...newNotif, is_read: true },
              ...prev.filter((n) => n.id !== newNotif.id),
            ]);
          } else {
            setNotifications((prev) => [
              newNotif,
              ...prev.filter((n) => n.id !== newNotif.id),
            ]);
            triggerToast(newNotif, actorObj);
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
        async (payload) => {
          const updatedNotif = payload.new;
          if (!updatedNotif) return;

          let actorObj = actorProfiles[updatedNotif.actor_id];
          if (updatedNotif.actor_id && !actorObj) {
            const { data } = await supabase
              .from("community_profiles")
              .select("*")
              .eq("user_id", updatedNotif.actor_id)
              .maybeSingle();

            if (data) {
              actorObj = data;
              setActorProfiles((prev) => ({ ...prev, [data.user_id]: data }));
            }
          }

          const isForActiveThread =
            updatedNotif.type === "new_message" &&
            activeConversationId &&
            updatedNotif.payload?.conversation_id === activeConversationId;

          if (isForActiveThread) {
            if (updatedNotif.payload?.conversation_id) {
              supabase
                .from("conversation_participants")
                .update({ last_read_at: new Date().toISOString() })
                .eq("conversation_id", updatedNotif.payload.conversation_id)
                .eq("user_id", userId)
                .then(() => {});

              supabase
                .from("in_app_notifications")
                .update({ is_read: true })
                .eq("id", updatedNotif.id)
                .then(() => {});
            }

            setNotifications((prev) => [
              { ...updatedNotif, is_read: true },
              ...prev.filter((n) => n.id !== updatedNotif.id),
            ]);
          } else {
            setNotifications((prev) => [
              updatedNotif,
              ...prev.filter((n) => n.id !== updatedNotif.id),
            ]);

            if (updatedNotif.type === "new_message") {
              triggerToast(updatedNotif, actorObj);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "in_app_notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const oldNotif = payload.old;
          if (oldNotif?.id) {
            setNotifications((prev) => prev.filter((n) => n.id !== oldNotif.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, activeConversationId, actorProfiles, triggerToast]);

  // Actions
  const markAsRead = async (notificationId) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      const { error: err } = await supabase
        .from("in_app_notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (err) console.error("Error marking notification read:", err);
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      const { error: err } = await supabase
        .from("in_app_notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (err) console.error("Error marking all read:", err);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      const { error: err } = await supabase
        .from("in_app_notifications")
        .delete()
        .eq("id", notificationId);

      if (err) console.error("Error deleting notification:", err);
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const deleteAllNotifications = async () => {
    if (!userId) return;
    try {
      setNotifications([]);
      const { error: err } = await supabase
        .from("in_app_notifications")
        .delete()
        .eq("user_id", userId);

      if (err) console.error("Error deleting all notifications:", err);
    } catch (err) {
      console.error("Failed to delete all notifications:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const value = {
    userId,
    notifications,
    actorProfiles,
    loading,
    error,
    unreadCount,
    activeConversationId,
    setActiveConversationId,
    activeToast,
    dismissToast,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refreshNotifications: fetchNotifications,
  };

  return (
    <InAppNotificationContext.Provider value={value}>
      {children}
    </InAppNotificationContext.Provider>
  );
}

export function useInAppNotifications() {
  const context = useContext(InAppNotificationContext);
  if (!context) {
    return {
      userId: null,
      notifications: [],
      actorProfiles: {},
      loading: false,
      error: null,
      unreadCount: 0,
      activeConversationId: null,
      setActiveConversationId: () => {},
      activeToast: null,
      dismissToast: () => {},
      markAsRead: async () => {},
      markAllAsRead: async () => {},
      deleteNotification: async () => {},
      deleteAllNotifications: async () => {},
      refreshNotifications: async () => {},
    };
  }
  return context;
}

export default useInAppNotifications;
