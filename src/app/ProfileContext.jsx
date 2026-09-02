import { createContext, useContext, useEffect, useState } from "react";
import supabase from "../lib/supabase.js";
import { getDisplayStreak, getUserStreak, getUserTimeZone } from "../lib/streaks";

const ProfileContext = createContext(null);

export function ProfileProvider({ user, children }) {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("hyper-tutor-dark-mode") === "true");
  const [streak, setStreak] = useState(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("hyper-tutor-dark-mode", String(darkMode));
  }, [darkMode]);

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
    const { data: streakData } = await getUserStreak(user.id);
    setStreak(streakData ? { ...streakData, display_current_streak: getDisplayStreak(streakData, new Date(), getUserTimeZone()) } : null);
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
    const refreshStreak = async () => {
      const { data } = await getUserStreak(user.id);
      if (data) setStreak({ ...data, display_current_streak: getDisplayStreak(data, new Date(), getUserTimeZone()) });
    };
    window.addEventListener("hyper-tutor-streak-updated", refreshStreak);
    return () => window.removeEventListener("hyper-tutor-streak-updated", refreshStreak);
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
