import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Message, RequestBody } from "./types.ts";
import { validateRequestBody } from "./validators.ts";
import { checkRateLimit } from "./rateLimit.ts";
import { buildSystemPrompt } from "./promptBuilder.ts";
import { callGroq } from "./groq.ts";
import { executeTool } from "./tools.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Missing Authorization header" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    const groqModel = Deno.env.get("GROQ_MODEL");

    if (!groqApiKey || !groqModel) {
      console.error("GROQ_API_KEY or GROQ_MODEL secret missing");
      return new Response(
        JSON.stringify({ error: { code: "CONFIG_ERROR", message: "AI service misconfigured" } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Please sign in again" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: { code: "BAD_REQUEST", message: "Invalid JSON body" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validation = validateRequestBody(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: { code: "BAD_REQUEST", message: validation.error } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting
    const rateCheck = await checkRateLimit(supabaseUserClient, user.id);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: {
            code: "RATE_LIMITED",
            message: "You have reached the limit of 30 AI tutor requests in 10 minutes. Please take a short break and try again in a few minutes.",
          },
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load user data in parallel
    const [profileRes, studyRes, resourcesRes, notesRes] = await Promise.all([
      supabaseUserClient.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabaseUserClient.from("Study").select("*").eq("id", body.session_id).eq("user_id", user.id).maybeSingle(),
      supabaseUserClient.from("resources").select("*").eq("session_id", body.session_id).eq("user_id", user.id),
      supabaseUserClient.from("notes").select("*").eq("session_id", body.session_id).eq("user_id", user.id),
    ]);

    if (studyRes.error || !studyRes.data) {
      return new Response(
        JSON.stringify({ error: { code: "NOT_FOUND", message: "This study session no longer exists" } }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const profile = profileRes.data || {};
    const studySession = studyRes.data;
    const rawResources = resourcesRes.data || [];
    const notes = notesRes.data || [];

    // Process resources text availability (.txt and .md)
    const resources = await Promise.all(
      rawResources.map(async (res: any) => {
        const fileName = res.file_name || "";
        const ext = fileName.split(".").pop()?.toLowerCase();
        let text_available = false;
        let excerpt = "";

        if ((ext === "txt" || ext === "md") && res.file_path) {
          try {
            const { data: fileBlob, error: downloadError } = await supabaseUserClient.storage
              .from("resources")
              .download(res.file_path);

            if (!downloadError && fileBlob) {
              const fileText = await fileBlob.text();
              if (fileText && fileText.trim()) {
                text_available = true;
                excerpt = fileText;
              }
            }
          } catch (err) {
            console.error(`Error downloading resource ${res.file_path}:`, err);
          }
        }

        return {
          name: fileName,
          type: res.file_type || ext || "file",
          text_available,
          excerpt,
        };
      })
    );

    const systemPrompt = buildSystemPrompt({
      profile,
      studySession,
      resources,
      notes,
      clientState: body.client_state,
    });

    const messagesToSend: Message[] = [{ role: "system", content: systemPrompt }];

    if (body.messages.length === 0) {
      messagesToSend.push({
        role: "user",
        content: "[The student just opened the tutor drawer. Give the initial greeting.]",
      });
    } else {
      messagesToSend.push(...body.messages);
    }

    // Call Groq (Turn 1)
    let groqData: any;
    try {
      groqData = await callGroq({
        apiKey: groqApiKey,
        model: groqModel,
        messages: messagesToSend,
        toolChoice: "auto",
      });
    } catch (groqErr: any) {
      return new Response(
        JSON.stringify({
          error: {
            code: groqErr.status === 503 ? "SERVICE_BUSY" : "SERVICE_ERROR",
            message: groqErr.message || "Error reaching AI tutor service",
          },
        }),
        { status: groqErr.status || 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const choice = groqData?.choices?.[0];
    const assistantMessage = choice?.message;
    const toolCalls = assistantMessage?.tool_calls || [];

    let finalReply = "";
    const actionsTaken: any[] = [];

    if (toolCalls.length > 0) {
      // Execute at most ONE tool call
      const firstToolCall = toolCalls[0];
      const fnName = firstToolCall.function?.name;
      let fnArgs: any = {};
      let isJsonValid = true;

      try {
        fnArgs = JSON.parse(firstToolCall.function?.arguments || "{}");
      } catch {
        isJsonValid = false;
      }

      let executionResult: { toolResultText: string; action: any };

      if (!isJsonValid) {
        executionResult = {
          toolResultText: "Tool argument error: Invalid JSON parameters supplied.",
          action: {
            type: "quiz",
            status: "error",
            summary: "Failed to parse tool parameters.",
            data: { error: "Invalid JSON parameters" },
          },
        };
      } else {
        executionResult = await executeTool(fnName, fnArgs, {
          supabaseUserClient,
          userId: user.id,
          currentSession: studySession,
          userTimezone: profile?.timezone || "UTC",
        });
      }

      actionsTaken.push(executionResult.action);

      // Follow-up Groq call (Turn 2)
      const followUpMessages: Message[] = [
        ...messagesToSend,
        assistantMessage,
        {
          role: "tool",
          tool_call_id: firstToolCall.id,
          content: executionResult.toolResultText,
        },
      ];

      try {
        const followUpData = await callGroq({
          apiKey: groqApiKey,
          model: groqModel,
          messages: followUpMessages,
          toolChoice: "none",
        });

        finalReply = followUpData?.choices?.[0]?.message?.content || "";
      } catch (fErr) {
        finalReply = executionResult.toolResultText;
      }
    } else {
      finalReply = assistantMessage?.content || "";
    }

    return new Response(
      JSON.stringify({
        reply: finalReply,
        actions: actionsTaken,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Unhandled error in ai-tutor Edge Function:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "An internal server error occurred while processing your request.",
        },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
