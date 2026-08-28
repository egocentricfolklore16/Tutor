import { createContext, useContext, useEffect, useState } from "react";
import supabase from "../lib/supabase.js";

const ProfileContext = createContext(null);

export function ProfileProvider({ user, children }) {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("hyper-tutor-dark-mode") === "true");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("hyper-tutor-dark-mode", String(darkMode));
  }, [darkMode]);

  const loadProfile = async () => {
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

  const toggleDarkMode = async (enabled) => {
    const nextValue = Boolean(enabled);
    setDarkMode(nextValue);
    if (!user?.id) return;
    const { error } = await supabase.from("profiles").update({ dark_mode: nextValue }).eq("user_id", user.id);
    if (error) console.error("Unable to save dark mode preference:", error);
  };

  return <ProfileContext.Provider value={{ profile, isLoading, refreshProfile: loadProfile, darkMode, toggleDarkMode }}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  return useContext(ProfileContext) || { profile: null, isLoading: true };
}
