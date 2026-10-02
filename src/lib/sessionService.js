import supabase from "./supabase.js";
import { getUserTimeZone } from "./streaks.js";

/**
 * Single source of truth for study session lifecycle operations:
 * - pauseSession / pauseSessionBeacon
 * - resumeSession
 * - heartbeatSession
 * - completeSession
 * - deleteSession
 */

export const pauseSession = async ({ id, time_left, elapsed_seconds }) => {
  if (!id) return { error: new Error("Missing session ID") };

  const payload = {
    session_status: "paused",
    time_left: time_left !== undefined && time_left !== null ? Math.max(0, Math.round(Number(time_left))) : null,
    elapsed_seconds: elapsed_seconds !== undefined && elapsed_seconds !== null ? Math.max(0, Math.round(Number(elapsed_seconds))) : 0,
    paused_at: new Date().toISOString(),
  };

  try {
    let { data, error } = await supabase
      .from("Study")
      .update(payload)
      .eq("id", id)
      .neq("session_status", "completed")
      .select();

    if (error) {
      // Retry once on failure
      const retryResult = await supabase
        .from("Study")
        .update(payload)
        .eq("id", id)
        .neq("session_status", "completed")
        .select();

      data = retryResult.data;
      error = retryResult.error;
    }

    return { data, error };
  } catch (err) {
    console.error("Error pausing study session:", err);
    return { error: err };
  }
};

export const pauseSessionBeacon = ({ id, time_left, elapsed_seconds }) => {
  if (!id) return;

  const payload = JSON.stringify({
    session_status: "paused",
    time_left: time_left !== undefined && time_left !== null ? Math.max(0, Math.round(Number(time_left))) : null,
    elapsed_seconds: elapsed_seconds !== undefined && elapsed_seconds !== null ? Math.max(0, Math.round(Number(elapsed_seconds))) : 0,
    paused_at: new Date().toISOString(),
  });

  const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || "";
  const endpoint = `${supabaseUrl}/rest/v1/Study?id=eq.${id}&session_status=neq.completed`;

  try {
    if (typeof fetch === "function") {
      fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: "return=minimal",
        },
        body: payload,
        keepalive: true,
      }).catch((err) => console.error("Error sending pause keepalive fetch:", err));
    } else if (navigator?.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(endpoint, blob);
    }
  } catch (err) {
    console.error("Error in pauseSessionBeacon:", err);
  }
};

export const resumeSession = async ({ id }) => {
  if (!id) return { error: new Error("Missing session ID") };

  try {
    const { data, error } = await supabase
      .from("Study")
      .update({
        session_status: "active",
        last_active_at: new Date().toISOString(),
        paused_at: null,
      })
      .eq("id", id)
      .neq("session_status", "completed")
      .select();

    return { data, error };
  } catch (err) {
    console.error("Error resuming study session:", err);
    return { error: err };
  }
};

export const heartbeatSession = async ({ id }) => {
  if (!id) return;

  try {
    await supabase
      .from("Study")
      .update({
        last_active_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("session_status", "active");
  } catch (err) {
    console.error("Error sending session heartbeat:", err);
  }
};

export const completeSession = async ({ id, userId, durationSeconds = 0, timeline = [], xp = 50, gems = 5 }) => {
  if (!id) return { error: new Error("Missing session ID") };

  try {
    let activeUserId = userId;
    if (!activeUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      activeUserId = user?.id || null;
    }

    if (!activeUserId) return { error: new Error("User not authenticated") };

    const { data, error } = await supabase.rpc("complete_study_session", {
      p_session_id: id,
      p_xp: xp,
      p_gems: gems,
      p_timeline: timeline,
      p_user_timezone: getUserTimeZone(),
      p_cutoff_hour: 3,
    });

    if (error) {
      console.error("Session completion RPC error:", error);
      return { error };
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("hyper-tutor-session-completed", {
          detail: {
            id: result?.history_id,
            session_id: id,
            duration_minutes: Math.round(durationSeconds / 60),
            completed_at: new Date().toISOString(),
            status: "completed",
            xp_earned: xp,
            timeline,
          },
        })
      );
    }

    return { data: result, error: null };
  } catch (err) {
    console.error("Unexpected error completing session:", err);
    return { error: err };
  }
};

export const deleteSession = async ({ id }) => {
  if (!id) return { error: new Error("Missing session ID") };

  try {
    // Delete session from Study; DB FK constraints (ON DELETE SET NULL)
    // automatically preserve child materials in the Library by clearing session_id.
    const { error } = await supabase.from("Study").delete().eq("id", id);
    if (error) return { error };

    return { error: null };
  } catch (err) {
    console.error("Error deleting session:", err);
    return { error: err };
  }
};
