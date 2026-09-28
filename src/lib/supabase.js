import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (typeof window !== "undefined") {
  const sanitizeStorage = (storage, name) => {
    try {
      const keysToClean = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;
        const value = storage.getItem(key);
        if (!value) continue;

        const isSupabaseToken = key.includes("sb-") && key.includes("-auth-token");
        const looksLikeJson = value.startsWith("{") || value.startsWith("[");

        if (isSupabaseToken || looksLikeJson) {
          try {
            const parsed = JSON.parse(value);
            if (isSupabaseToken && (!parsed || typeof parsed !== "object")) {
              console.error(`Invalid structure in ${name} key "${key}":`, parsed);
              keysToClean.push(key);
            }
          } catch (err) {
            console.error(`Corrupted JSON in ${name} key "${key}":`, err);
            keysToClean.push(key);
          }
        }
      }
      keysToClean.forEach((k) => {
        try {
          storage.removeItem(k);
        } catch (e) {
          console.error(`Failed to remove key "${k}" from ${name}:`, e);
        }
      });
    } catch (err) {
      console.error(`Error scanning ${name}:`, err);
    }
  };

  sanitizeStorage(localStorage, "localStorage");
  sanitizeStorage(sessionStorage, "sessionStorage");
}

const supabase = createClient(supabaseUrl, supabaseKey);

if (typeof window !== "undefined" && window.__E2E_SESSION__) {
  const mockUser = window.__E2E_SESSION__.user;
  const mockSession = window.__E2E_SESSION__;
  supabase.auth.getSession = async () => ({ data: { session: mockSession }, error: null });
  supabase.auth.getUser = async () => ({ data: { user: mockUser }, error: null });
}

export default supabase;
