import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

if (typeof window !== "undefined" && window.__E2E_SESSION__) {
  const mockUser = window.__E2E_SESSION__.user;
  const mockSession = window.__E2E_SESSION__;
  supabase.auth.getSession = async () => ({ data: { session: mockSession }, error: null });
  supabase.auth.getUser = async () => ({ data: { user: mockUser }, error: null });
}

export default supabase;
