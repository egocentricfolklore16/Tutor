import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import supabase from "../lib/supabase.js";
import { getUserTimeZone } from "../lib/streaks";
import { getAccessibilityClasses } from "../lib/accessibility.js";
import { gamificationService } from "../features/gamification/services/gamificationService.js";

const ProfileContext = createContext(null);
const THEME_STORAGE_KEY = "hyper-tutor-dark-mode";

function getInitialDarkMode() {
  try {
    const preference = localStorage.getItem(THEME_STORAGE_KEY);
    if (preference === "dark" || preference === "true") return true;
    if (preference === "light" || preference === "false") return false;
  } catch (error) {
    console.error("Error reading theme preference from localStorage:", error);
  }

  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ProfileProvider({ user, children }) {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(getInitialDarkMode);
  const lastTouchTimeRef = useRef(0);
  const themeTransitionTimeoutRef = useRef(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", darkMode);
    root.style.colorScheme = darkMode ? "dark" : "light";
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = darkMode ? "#121a18" : "#059669";
  }, [darkMode]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const applySystemTheme = () => {
      try {
        if (localStorage.getItem(THEME_STORAGE_KEY) === "system") {
          setDarkMode(mediaQuery.matches);
        }
      } catch (error) {
        console.error("Error reading theme preference from localStorage:", error);
      }
    };
    mediaQuery.addEventListener("change", applySystemTheme);
    return () => mediaQuery.removeEventListener("change", applySystemTheme);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const classes = getAccessibilityClasses(profile);
    root.classList.toggle("high-contrast", classes.includes("high-contrast"));
    root.classList.toggle("accessibility-large-text", classes.includes("accessibility-large-text"));
  }, [profile]);

  const touchLastSeenThrottled = useCallback(async () => {
    if (!user?.id) return;
    const now = Date.now();
    if (now - lastTouchTimeRef.current < 5 * 60 * 1000) return;
    lastTouchTimeRef.current = now;
    try {
      await supabase.rpc("touch_last_seen");
    } catch {
      // Fail silently
    }
  }, [user?.id]);

  const loadProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
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
    
    if (typeof nextProfile?.dark_mode === "boolean") {
      setDarkMode(nextProfile.dark_mode);
    }
    setIsLoading(false);
  }, [user?.id, touchLastSeenThrottled]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    loadProfile().then(() => { if (!active) setProfile(null); });

    return () => {
      active = false;
    };
  }, [user?.id, loadProfile]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        touchLastSeenThrottled();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

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
    const channelName = `profile-updates-${user.id}:${crypto.randomUUID()}`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.new) {
            setProfile((prev) => ({ ...prev, ...payload.new }));
          }
        }
      );

    channel.subscribe();

    const handleSessionCompleted = () => {
      gamificationService.checkAndClaimQuests(loadProfile);
    };

    window.addEventListener("hyper-tutor-rewards-updated", handleRewardsUpdated);
    window.addEventListener("hyper-tutor-session-completed", handleSessionCompleted);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      supabase.removeChannel(channel);
      window.removeEventListener("hyper-tutor-rewards-updated", handleRewardsUpdated);
      window.removeEventListener("hyper-tutor-session-completed", handleSessionCompleted);
    };
  }, [user?.id, loadProfile, touchLastSeenThrottled]);

  const toggleDarkMode = async (enabled) => {
    const nextValue = Boolean(enabled);
    const root = document.documentElement;
    root.classList.add("theme-transition");
    if (themeTransitionTimeoutRef.current) {
      window.clearTimeout(themeTransitionTimeoutRef.current);
    }
    themeTransitionTimeoutRef.current = window.setTimeout(() => {
      root.classList.remove("theme-transition");
      themeTransitionTimeoutRef.current = null;
    }, 200);

    setDarkMode(nextValue);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextValue ? "dark" : "light");
    } catch (error) {
      console.error("Error saving theme preference to localStorage:", error);
    }
    if (!user?.id) return;
    const { error } = await supabase.from("profiles").update({ dark_mode: nextValue }).eq("user_id", user.id);
    if (error) console.error("Unable to save dark mode preference:", error);
  };

  return <ProfileContext.Provider value={{ profile, isLoading, refreshProfile: loadProfile, darkMode, toggleDarkMode }}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  return useContext(ProfileContext) || { profile: null, isLoading: true };
}
