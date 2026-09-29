import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Clean up any corrupted localStorage keys on startup
if (typeof window !== "undefined" && window.localStorage) {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      // Clean up Supabase auth tokens or JSON keys if they contain invalid JSON
      if (key.startsWith("sb-") || key.startsWith("hyper-tutor-")) {
        const value = localStorage.getItem(key);
        if (value && (value.trim().startsWith("{") || value.trim().startsWith("["))) {
          try {
            JSON.parse(value);
          } catch (err) {
            console.error(`[Storage Cleanup] Removing corrupted JSON in localStorage key "${key}":`, err);
            localStorage.removeItem(key);
          }
        }
      }
    }
  } catch (err) {
    console.error("[Storage Cleanup] Error scanning localStorage keys:", err);
  }
}

const safeAuthStorage = {
  getItem: (key) => {
    try {
      if (typeof window === "undefined" || !window.localStorage) return null;
      const value = localStorage.getItem(key);
      if (!value) return null;
      if (value.trim().startsWith("{") || value.trim().startsWith("[")) {
        try {
          const parsed = JSON.parse(value);
          if (parsed === null || typeof parsed !== "object") {
            console.error(`[Supabase Storage] Invalid object shape for key "${key}", clearing key.`);
            localStorage.removeItem(key);
            return null;
          }
        } catch (parseErr) {
          console.error(`[Supabase Storage] Failed to parse JSON for key "${key}", clearing key:`, parseErr);
          localStorage.removeItem(key);
          return null;
        }
      }
      return value;
    } catch (err) {
      console.error(`[Supabase Storage] Error reading key "${key}" from localStorage:`, err);
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(key, value);
      }
    } catch (err) {
      console.error(`[Supabase Storage] Error setting key "${key}" in localStorage:`, err);
    }
  },
  removeItem: (key) => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.removeItem(key);
      }
    } catch (err) {
      console.error(`[Supabase Storage] Error removing key "${key}" from localStorage:`, err);
    }
  },
};

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: safeAuthStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

if (typeof window !== "undefined" && window.__E2E_SESSION__) {
  const mockUser = window.__E2E_SESSION__.user;
  const mockSession = window.__E2E_SESSION__;
  supabase.auth.getSession = async () => ({ data: { session: mockSession }, error: null });
  supabase.auth.getUser = async () => ({ data: { user: mockUser }, error: null });
}

export default supabase;
