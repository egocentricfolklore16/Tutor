import { createContext, useContext, useEffect, useState, useRef } from "react";
import supabase from "../lib/supabase.js";
import { getDisplayStreak, getUserStreak, getUserTimeZone, checkAndLogStreakSlip, getWeekActivity } from "../lib/streaks";

const ProfileContext = createContext(null);

export function ProfileProvider({ user, children }) {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("hyper-tutor-dark-mode") === "true");
  const [streak, setStreak] = useState(null);
  const lastTouchTimeRef = useRef(0);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("hyper-tutor-dark-mode", String(darkMode));
  }, [darkMode]);

  const touchLastSeenThrottled = async () => {
    if (!user?.id) return;
    const now = Date.now();
    if (now - lastTouchTimeRef.current < 5 * 60 * 1000) return;
    lastTouchTimeRef.current = now;
    try {
      await supabase.rpc("touch_last_seen");
    } catch (err) {
      // Fail silently
    }
  };

  const loadProfile = async () => {
    if (!user?.id) {
      setProfile(null);
      setStreak(null);
      setIsLoading(false);
      return;
    }
    const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    if (error) console.error("Unable to load learning profile:", error);
    let nextProfile = data || null;
    if (nextProfile?.user_img) {
      const { data: signedImage } = await supabase.storage.from("user-images").createSignedUrl(nextProfile.user_img, 3600);
      nextProfile = { ...nextProfile, avatar_url: signedImage?.signedUrl || "" };
    }
    setProfile(nextProfile);

    // Sync timezone if different
    const browserTz = getUserTimeZone();
    if (nextProfile && nextProfile.timezone !== browserTz) {
      supabase.from("profiles").update({ timezone: browserTz }).eq("user_id", user.id).then(({ error: tzErr }) => {
        if (tzErr) console.warn("Unable to sync timezone:", tzErr);
      });
    }

    // Touch last seen throttled
    touchLastSeenThrottled();

    const { data: streakData } = await getUserStreak(user.id);
    if (streakData) {
      const displayStreak = getDisplayStreak(streakData, new Date(), getUserTimeZone());
      const weekActivity = await getWeekActivity(user.id, { ...streakData, display_current_streak: displayStreak });
      setStreak({ ...streakData, display_current_streak: displayStreak, week_activity: weekActivity });
    } else {
      setStreak(null);
    }
    
    // Check for streak slips
    if (streakData) {
      await checkAndLogStreakSlip(user.id, { timeZone: getUserTimeZone() });
    }
    
    setDarkMode(Boolean(nextProfile?.dark_mode));
    setIsLoading(false);
  };

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    loadProfile().then(() => { if (!active) setProfile(null); });

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        touchLastSeenThrottled();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const refreshStreak = async () => {
      const { data } = await getUserStreak(user.id);
      if (data) {
        const displayStreak = getDisplayStreak(data, new Date(), getUserTimeZone());
        const weekActivity = await getWeekActivity(user.id, { ...data, display_current_streak: displayStreak });
        setStreak({ ...data, display_current_streak: displayStreak, week_activity: weekActivity });
        // Check for slip when streak is refreshed
        await checkAndLogStreakSlip(user.id, { timeZone: getUserTimeZone() });
      }
    };

    const handleRewardsUpdated = (event) => {
      const { xp = 0, gems = 0 } = event.detail || {};
      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          xp_points: (prev.xp_points || 0) + xp,
          gems: (prev.gems || 0) + gems,
        };
      });
      loadProfile();
    };

    // Realtime channel for profile changes
    const channel = supabase
      .channel(`profile-updates-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.new) {
            setProfile((prev) => ({ ...prev, ...payload.new }));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users_streaks", filter: `user_id=eq.${user.id}` },
        () => {
          refreshStreak();
        }
      )
      .subscribe();

    window.addEventListener("hyper-tutor-streak-updated", refreshStreak);
    window.addEventListener("hyper-tutor-rewards-updated", handleRewardsUpdated);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      supabase.removeChannel(channel);
      window.removeEventListener("hyper-tutor-streak-updated", refreshStreak);
      window.removeEventListener("hyper-tutor-rewards-updated", handleRewardsUpdated);
    };
  }, [user?.id]);

  const toggleDarkMode = async (enabled) => {
    const nextValue = Boolean(enabled);
    setDarkMode(nextValue);
    if (!user?.id) return;
    const { error } = await supabase.from("profiles").update({ dark_mode: nextValue }).eq("user_id", user.id);
    if (error) console.error("Unable to save dark mode preference:", error);
  };

  return <ProfileContext.Provider value={{ profile, isLoading, refreshProfile: loadProfile, darkMode, toggleDarkMode, streak }}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  return useContext(ProfileContext) || { profile: null, isLoading: true };
}
