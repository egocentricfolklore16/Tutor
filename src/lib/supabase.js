import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";

// Sanitize Supabase auth tokens stored in localStorage before client init
if (typeof window !== "undefined" && window.localStorage) {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            // Basic shape check for Supabase session auth token object
            if (!parsed || typeof parsed !== "object" || (!parsed.access_token && !parsed.currentSession && !Array.isArray(parsed))) {
              console.error(`Invalid Supabase auth token shape in localStorage for key '${key}'. Clearing key.`);
              localStorage.removeItem(key);
            }
          } catch (parseErr) {
            console.error(`Failed to parse Supabase auth token JSON from localStorage key '${key}':`, parseErr);
            localStorage.removeItem(key);
          }
        }
      }
    }
  } catch (storageErr) {
    console.error("Error inspecting localStorage during Supabase client initialization:", storageErr);
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
