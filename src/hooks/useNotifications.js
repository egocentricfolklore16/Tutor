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
        if (active) setError(err.message || "Failed to load notification settings");
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
      setError(err.message || "Failed to enable notifications");
      throw err;
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
      setError(err.message || "Failed to disable notifications");
      throw err;
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
      setError(err.message || "Failed to send test notification");
      throw err;
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
