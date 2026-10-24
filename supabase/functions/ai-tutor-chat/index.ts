import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildSystemPrompt, normalizeStrictness, Strictness } from "./prompt.ts";
import { countGenuineAttempts } from "../ai-tutor/strictnessRules.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Primary + fallback model. If the primary model/provider is down or rate-limited,
// we try the fallback before ever giving up.
const PRIMARY_MODEL = "llama-3.3-70b-versatile";
const FALLBACK_MODEL = "llama-3.1-8b-instant";

// Shown to the user only if BOTH the primary and fallback model calls fail outright
// (e.g. total network/provider outage). Keeps the app feeling alive instead of broken.
const GRACEFUL_FALLBACK_REPLY =
  "I'm having a little trouble thinking that through right now — give me a moment and try asking again. " +
  "In the meantime, try breaking your question into a smaller piece, or rephrasing it, and I'll do my best.";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  let userId: string | null = null;

  try {
    const { message, conversationHistory = [], sessionId } = await req.json();

    if (!message || typeof message !== "string") {
      // Even a bad request doesn't get a hard error — respond conversationally.
      return jsonResponse({
        reply: "I didn't catch a question there — could you type what you'd like help with?",
      });
    }

    // Security: Require authorization header and authenticate calling user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return jsonResponse({ error: "Unauthorized: Invalid or expired session token" }, 401);
    }

    userId = userData.user.id;

    // Security: Strictness mode is always enforced server-side from DB user_preferences, client overrides are ignored
    const strictness = await resolveStrictness(supabase, userId);
    const fullHistory = [...conversationHistory, { role: "user", content: message }];
    const attemptCount = countGenuineAttempts(fullHistory);
    const systemPrompt = buildSystemPrompt(strictness, attemptCount);

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-12), // keep context bounded
      { role: "user", content: message },
    ];

    const reply = await getAiReplyWithFallback(messages, supabase, { userId, sessionId });

    return jsonResponse({ reply, strictness });
  } catch (err) {
    // Absolute last resort — malformed request body, etc. Still never a raw error to the client.
    await logError(supabase, userId, "top_level", err);
    return jsonResponse({ reply: GRACEFUL_FALLBACK_REPLY });
  }
});

async function resolveStrictness(
  supabase: ReturnType<typeof createClient>,
  userId: string | null,
): Promise<Strictness> {
  if (!userId) return "hints_then_answer"; // sensible default for logged-out/demo use

  try {
    const { data } = await supabase
      .from("user_preferences")
      .select("socratic_strictness")
      .eq("user_id", userId)
      .maybeSingle();

    return normalizeStrictness(data?.socratic_strictness);
  } catch {
    return "hints_then_answer";
  }
}

async function getAiReplyWithFallback(
  messages: unknown[],
  supabase: ReturnType<typeof createClient>,
  ctx: { userId: string | null; sessionId?: string },
): Promise<string> {
  // 1. Primary model, with 2 quick retries for transient errors/timeouts.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await callGroq(PRIMARY_MODEL, messages);
    } catch (err) {
      await logError(supabase, ctx.userId, `primary_attempt_${attempt}`, err);
    }
  }

  // 2. Fallback model.
  try {
    return await callGroq(FALLBACK_MODEL, messages);
  } catch (err) {
    await logError(supabase, ctx.userId, "fallback_model", err);
  }

  // 3. Static graceful reply — the one case where nothing reached the AI at all.
  return GRACEFUL_FALLBACK_REPLY;
}

async function callGroq(model: string, messages: unknown[]): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s hard timeout

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, temperature: 0.6, max_tokens: 800 }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Groq responded ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error("Groq returned an empty/malformed completion");
    }
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

async function logError(
  supabase: ReturnType<typeof createClient>,
  userId: string | null,
  stage: string,
  err: unknown,
) {
  try {
    await supabase.from("ai_error_log").insert({
      user_id: userId,
      stage,
      message: err instanceof Error ? err.message : String(err),
      created_at: new Date().toISOString(),
    });
  } catch {
    // If even logging fails, swallow it — logging must never be able to crash the request.
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
