import { useCallback, useEffect, useState } from "react";
import supabase from "../lib/supabase";
import {
  disablePush,
  enablePush,
  getPermissionState,
  syncSubscription,
} from "../lib/push";

const defaultPreferences = {
  push_enabled: true,
  session_reminders: true,
  streak_alerts: true,
  inactivity_nudges: true,
};

export function formatPushError(err) {
  const msg = typeof err === "string" ? err : err?.message || "";

  if (msg === "UNSUPPORTED") {
    return "This browser doesn't support push notifications.";
  }
  if (msg === "PERMISSION_DENIED") {
    return "Notifications are blocked. Click the padlock in the address bar and set Notifications to Allow.";
  }
  if (msg.startsWith("PERMISSION_")) {
    return "Notification permission was not granted.";
  }
  if (msg === "SW_NOT_ACTIVE") {
    return "The notification service didn't start. Refresh the page and try again.";
  }
  if (msg === "VAPID_KEY_MISSING" || msg === "VAPID_KEY_INVALID") {
    return "Notifications are misconfigured. Please contact support.";
  }
  if (msg === "PUSH_AbortError" || msg.startsWith("PUSH_AbortError")) {
    return "Your browser couldn't reach its push service. Check your network, VPN or ad-blocker; in Brave, enable Google services for push messaging.";
  }

  console.error("Push notification error:", err);

  const isDev = Boolean(
    typeof import.meta !== "undefined" &&
      import.meta.env &&
      (import.meta.env.DEV || import.meta.env.MODE === "development")
  );

  if (isDev) {
    return msg || "An error occurred enabling push notifications.";
  }

  return "Could not enable notifications. Please try again.";
}

export function useNotifications(userId) {
  const [permissionState, setPermissionState] = useState(() => getPermissionState());
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshPermission = useCallback(() => {
    setPermissionState(getPermissionState());
  }, []);

  // Fetch preferences and sync subscription when userId is available
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadPreferences() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchErr } = await supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (fetchErr) {
          console.warn("Could not load notification preferences:", fetchErr);
        }

        if (active) {
          if (data) {
            setPreferences({
              push_enabled: Boolean(data.push_enabled),
              session_reminders: Boolean(data.session_reminders),
              streak_alerts: Boolean(data.streak_alerts),
              inactivity_nudges: Boolean(data.inactivity_nudges),
            });
          } else {
            setPreferences(defaultPreferences);
          }
        }

        if (getPermissionState() === "granted") {
          await syncSubscription(userId);
        }
      } catch (err) {
        if (active) setError(formatPushError(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPreferences();

    return () => {
      active = false;
    };
  }, [userId]);

  const enable = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError(null);
      await enablePush(userId);
      refreshPermission();
      setPreferences((prev) => ({ ...prev, push_enabled: true }));
    } catch (err) {
      const formatted = formatPushError(err);
      setError(formatted);
      throw new Error(formatted);
    } finally {
      setLoading(false);
    }
  };

  const disable = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError(null);
      await disablePush(userId);
      refreshPermission();
      setPreferences((prev) => ({ ...prev, push_enabled: false }));
    } catch (err) {
      const formatted = formatPushError(err);
      setError(formatted);
      throw new Error(formatted);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key, value) => {
    if (!userId) return;
    const nextPrefs = { ...preferences, [key]: value };
    setPreferences(nextPrefs);

    try {
      const { error: upsertErr } = await supabase
        .from("notification_preferences")
        .upsert(
          {
            user_id: userId,
            ...nextPrefs,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (upsertErr) {
        console.error("Failed to update notification preference:", upsertErr);
      }
    } catch (err) {
      console.error("Failed to save preference:", err);
    }
  };

  const sendTest = async () => {
    try {
      setError(null);
      const { data, error: fnErr } = await supabase.functions.invoke("send-test-notification");
      if (fnErr) throw new Error(fnErr.message);
      return data;
    } catch (err) {
      const formatted = formatPushError(err);
      setError(formatted);
      throw new Error(formatted);
    }
  };

  const enabled = permissionState === "granted" && preferences.push_enabled;

  return {
    permissionState,
    refreshPermission,
    enabled,
    preferences,
    updatePreference,
    enable,
    disable,
    sendTest,
    loading,
    error,
  };
}
