import { createContext, useContext, useEffect, useState } from "react";
import supabase from "../lib/supabase.js";

const ProfileContext = createContext(null);

export function ProfileProvider({ user, children }) {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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

  return <ProfileContext.Provider value={{ profile, isLoading, refreshProfile: loadProfile }}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  return useContext(ProfileContext) || { profile: null, isLoading: true };
}
