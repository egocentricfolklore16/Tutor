import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (typeof window !== "undefined" && window.localStorage) {
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const val = localStorage.getItem(key);
        if (val) {
          try {
            const parsed = JSON.parse(val);
            if (!parsed || typeof parsed !== "object") {
              console.error(`Invalid Supabase auth token structure in localStorage for key "${key}", clearing key.`);
              localStorage.removeItem(key);
            }
          } catch (parseErr) {
            console.error(`Corrupted JSON for Supabase auth token in localStorage for key "${key}", clearing key:`, parseErr);
            localStorage.removeItem(key);
          }
        }
      }
    }
  } catch (err) {
    console.error("Error auditing Supabase auth token keys in localStorage:", err);
  }
}

const supabase = createClient(supabaseUrl, supabaseKey);

if (typeof window !== "undefined" && window.__E2E_SESSION__) {
  const mockUser = window.__E2E_SESSION__.user;
  const mockSession = window.__E2E_SESSION__;
  supabase.auth.getSession = async () => ({ data: { session: mockSession }, error: null });
  supabase.auth.getUser = async () => ({ data: { user: mockUser }, error: null });
}

export default supabase;
