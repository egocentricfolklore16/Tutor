import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GROQ_MODEL = "llama-3.3-70b-versatile";

interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

interface ActionTaken {
  tool: string;
  summary: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) {
      return new Response(
        JSON.stringify({ error: "Missing GROQ_API_KEY environment variable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || supabaseServiceRoleKey;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase configuration environment variables" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase Admin (Service Role) client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Validate authenticated user session token
    const authHeader = req.headers.get("Authorization");
    let authenticatedUserId: string | null = null;

    if (authHeader) {
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabaseAuth.auth.getUser();
      if (user) {
        authenticatedUserId = user.id;
      }
    }

    const body = await req.json().catch(() => ({}));
    const {
      student_id: bodyStudentId,
      student_message,
      student_level = "High School",
      curriculum_standard = "None/General",
      knowledge_gaps = [],
      conversation_history = [],
    } = body || {};

    // Validate student_id against authenticated session - never trust model or body generated ID
    if (!authenticatedUserId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing or invalid authorization token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const effectiveUserId = authenticatedUserId;

    if (!student_message || typeof student_message !== "string" || !student_message.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing student_message in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Construct System Prompt
    const formattedGaps = Array.isArray(knowledge_gaps)
      ? knowledge_gaps.join(", ")
      : String(knowledge_gaps);

    const systemPrompt = `You are Hyper Tutor, an elite AI tutor for ed-tech learning.
Student Context:
- Student Level: ${student_level}
- Curriculum Standard: ${curriculum_standard}
- Active Knowledge Gaps: ${formattedGaps || "None identified yet"}

Core Pedagogical Rules:
1. Socratic-first: Always ask a guiding question before giving a direct answer, unless the student explicitly asks for the direct solution or has attempted the problem twice already.
2. Name Misconceptions: If the student makes a mistake, explicitly name the specific misconception before correcting it.
3. Match Depth: Tailor explanation depth and technical rigor precisely to student level (${student_level}).
4. Close with Check: Always close every response with a brief check-for-understanding question or a follow-up practice problem.
5. Decompose Stuckness: If the student seems frustrated or stuck, break the concept into smaller, simpler sub-steps rather than repeating explanations louder.
6. Scope Boundaries: Stay strictly scoped to the curriculum standard (${curriculum_standard}). If a topic falls outside it, explicitly flag it as "bonus content."
7. Integrity Guardrail: NEVER produce full essays, complete homework, or full exam answers. Guide the student step-by-step to complete their own work.
8. Minor + Crisis Disclosure: NEVER attempt therapy, psychological counseling, or mental health intervention. If self-harm or crisis is disclosed, immediately refer to real-world resources (like national helplines) and encourage reaching out to a trusted adult.
9. Output Formatting:
   - Default output length: 3 to 6 concise sentences.
   - Use numbered steps for mathematics, proofs, or code explanations.
   - Use LaTeX for mathematical formatting and clean code blocks where relevant.

Tool Use Guidelines:
- Call "log_knowledge_gap" when repeated mistakes or conceptual misunderstandings appear.
- Call "search_ai_library" to search for saved resources instead of hallucinating links or citations.
- Call "create_study_session" when the student asks to schedule or create a study session.
- Call "create_note" only once the student confirms understanding or explicitly asks to save a note.
- Call "update_study_plan" when the student requests changes to their study roadmap.
- NEVER let tool usage bypass the integrity, crisis, or pedagogical rules above.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "create_study_session",
          description: "Creates or schedules a study session for the student.",
          parameters: {
            type: "object",
            properties: {
              student_id: { type: "string", description: "Student ID" },
              topic: { type: "string", description: "Topic to study" },
              curriculum_standard: { type: "string", description: "Curriculum standard" },
              duration_minutes: { type: "number", description: "Duration in minutes" },
              scheduled_for: { type: "string", description: "Optional ISO timestamp or date string" },
            },
            required: ["topic", "curriculum_standard", "duration_minutes"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "search_ai_library",
          description: "Searches the student's saved library resources and returns summaries.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" },
              curriculum_standard: { type: "string", description: "Curriculum standard filter" },
              topic: { type: "string", description: "Topic filter" },
            },
            required: ["query"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "log_knowledge_gap",
          description: "Logs or updates a conceptual knowledge gap for the student.",
          parameters: {
            type: "object",
            properties: {
              student_id: { type: "string", description: "Student ID" },
              concept: { type: "string", description: "Concept name" },
              curriculum_standard: { type: "string", description: "Curriculum standard" },
              severity: { type: "string", enum: ["low", "moderate", "high"], description: "Severity level" },
              evidence: { type: "string", description: "Evidence or sample mistake" },
            },
            required: ["concept", "curriculum_standard", "severity", "evidence"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "create_note",
          description: "Saves a study note for a topic after understanding is confirmed.",
          parameters: {
            type: "object",
            properties: {
              student_id: { type: "string", description: "Student ID" },
              topic: { type: "string", description: "Topic of the note" },
              content: { type: "string", description: "Note content" },
              session_id: { type: "string", description: "Optional study session ID" },
            },
            required: ["topic", "content"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "update_study_plan",
          description: "Updates the student's study plan.",
          parameters: {
            type: "object",
            properties: {
              student_id: { type: "string", description: "Student ID" },
              plan_changes: {
                type: "object",
                description: "Map or structure of plan changes and roadmap adjustments",
              },
            },
            required: ["plan_changes"],
          },
        },
      },
    ];

    // Format conversation history
    const formattedHistory = Array.isArray(conversation_history)
      ? conversation_history.map((msg: any) => ({
          role: msg.sender === "user" || msg.role === "user" ? "user" : "assistant",
          content: msg.text || msg.content || "",
        }))
      : [];

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...formattedHistory,
      { role: "user", content: student_message },
    ];

    const actionsTaken: ActionTaken[] = [];
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalTokens = 0;
    let finalReply = "";

    const maxRounds = 3;
    let round = 0;

    while (round < maxRounds) {
      round++;

      const groqResponse = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages,
            tools,
            temperature: 0.6,
            max_tokens: 1024,
          }),
        }
      );

      if (!groqResponse.ok) {
        const errorText = await groqResponse.text();
        console.error("Groq API error response:", groqResponse.status, errorText);
        if (groqResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: "Groq AI service rate limit reached. Please try again shortly." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: `Groq AI service error: ${groqResponse.statusText}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const groqData = await groqResponse.json();

      if (groqData?.usage) {
        totalPromptTokens += groqData.usage.prompt_tokens || 0;
        totalCompletionTokens += groqData.usage.completion_tokens || 0;
        totalTokens += groqData.usage.total_tokens || 0;
      }

      const choice = groqData?.choices?.[0];
      if (!choice) {
        throw new Error("Invalid response format received from Groq API");
      }

      const message = choice.message;
      const toolCalls: ToolCall[] = message?.tool_calls || [];

      if (toolCalls.length > 0) {
        messages.push(message);

        for (const toolCall of toolCalls) {
          const fnName = toolCall.function?.name;
          let fnArgs: any = {};
          try {
            fnArgs = JSON.parse(toolCall.function?.arguments || "{}");
          } catch {
            fnArgs = {};
          }

          let toolResult: any = null;

          try {
            if (fnName === "create_study_session") {
              const topic = fnArgs.topic || "Study Session";
              const currStd = fnArgs.curriculum_standard || curriculum_standard;
              const duration = fnArgs.duration_minutes || 30;
              const scheduledFor = fnArgs.scheduled_for || new Date().toISOString();

              const { data, error } = await supabaseAdmin
                .from("study_sessions")
                .insert({
                  user_id: effectiveUserId,
                  topic,
                  curriculum_standard: currStd,
                  duration_minutes: duration,
                  scheduled_for: scheduledFor,
                  status: "scheduled",
                })
                .select()
                .single();

              if (error) throw error;

              // Synchronize with Study table for frontend UI compatibility
              await supabaseAdmin.from("Study").insert({
                user_id: effectiveUserId,
                Subject: currStd,
                Topic: topic,
                Duration: duration,
                Date: scheduledFor.slice(0, 10),
                session_status: "active",
              });

              toolResult = { success: true, session_id: data?.id, topic, duration_minutes: duration };
              actionsTaken.push({
                tool: "create_study_session",
                summary: `📅 Study session created for "${topic}" (${duration} min)`,
              });
            } else if (fnName === "search_ai_library") {
              const query = (fnArgs.query || "").toLowerCase();
              const { data: libData, error: libErr } = await supabaseAdmin
                .from("library_resources")
                .select("id, title, type, short_description")
                .eq("user_id", effectiveUserId)
                .limit(10);

              const { data: resData } = await supabaseAdmin
                .from("resources")
                .select("id, file_name, file_type")
                .eq("user_id", effectiveUserId)
                .limit(10);

              if (libErr) throw libErr;

              const summaries = [
                ...(libData || []).map((item) => ({
                  id: item.id,
                  title: item.title,
                  type: item.type,
                  short_description: item.short_description,
                })),
                ...(resData || []).map((item) => ({
                  id: item.id,
                  title: item.file_name,
                  type: item.file_type,
                  short_description: `Uploaded resource: ${item.file_name}`,
                })),
              ].filter((item) =>
                query
                  ? item.title.toLowerCase().includes(query) ||
                    item.short_description.toLowerCase().includes(query)
                  : true
              );

              toolResult = { success: true, results_count: summaries.length, summaries };
              actionsTaken.push({
                tool: "search_ai_library",
                summary: `🔍 Searched library for "${fnArgs.query}" (${summaries.length} items found)`,
              });
            } else if (fnName === "log_knowledge_gap") {
              const concept = fnArgs.concept || "Unspecified Concept";
              const currStd = fnArgs.curriculum_standard || curriculum_standard;
              const severity = fnArgs.severity || "moderate";
              const evidence = fnArgs.evidence || "";

              const { data, error } = await supabaseAdmin
                .from("knowledge_gaps")
                .insert({
                  user_id: effectiveUserId,
                  concept,
                  curriculum_standard: currStd,
                  severity,
                  evidence,
                })
                .select()
                .single();

              if (error) throw error;

              // Append to profile knowledge_gaps array
              const { data: profile } = await supabaseAdmin
                .from("profiles")
                .select("knowledge_gaps")
                .eq("user_id", effectiveUserId)
                .maybeSingle();

              const currentGaps: string[] = Array.isArray(profile?.knowledge_gaps)
                ? profile.knowledge_gaps
                : [];
              if (!currentGaps.includes(concept)) {
                await supabaseAdmin
                  .from("profiles")
                  .update({ knowledge_gaps: [...currentGaps, concept] })
                  .eq("user_id", effectiveUserId);
              }

              toolResult = { success: true, gap_id: data?.id, concept, severity };
              actionsTaken.push({
                tool: "log_knowledge_gap",
                summary: `🚩 Logged knowledge gap: "${concept}" (${severity} severity)`,
              });
            } else if (fnName === "create_note") {
              const topic = fnArgs.topic || "General Note";
              const content = fnArgs.content || "";
              const sessionId = fnArgs.session_id || null;

              const { data, error } = await supabaseAdmin
                .from("ai_notes")
                .insert({
                  user_id: effectiveUserId,
                  topic,
                  content,
                  session_id: sessionId,
                })
                .select()
                .single();

              if (error) throw error;

              if (sessionId) {
                await supabaseAdmin.from("study_notes").insert({
                  study_id: sessionId,
                  user_id: effectiveUserId,
                  content: `${topic}: ${content}`,
                });
              }

              toolResult = { success: true, note_id: data?.id, topic };
              actionsTaken.push({
                tool: "create_note",
                summary: `📝 Saved note for "${topic}"`,
              });
            } else if (fnName === "update_study_plan") {
              const planChanges = fnArgs.plan_changes || {};

              const { data, error } = await supabaseAdmin
                .from("study_plan")
                .upsert({
                  user_id: effectiveUserId,
                  plan_changes: planChanges,
                  updated_at: new Date().toISOString(),
                })
                .select()
                .single();

              if (error) throw error;

              toolResult = { success: true, plan_id: data?.id, plan_changes: planChanges };
              actionsTaken.push({
                tool: "update_study_plan",
                summary: `🎯 Updated study plan`,
              });
            } else {
              toolResult = { success: false, error: `Unknown tool name: ${fnName}` };
            }
          } catch (toolError: any) {
            console.error(`Error executing tool ${fnName}:`, toolError);
            toolResult = { success: false, error: toolError.message || "Execution error" };
          }

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          });
        }
      } else {
        finalReply = message?.content || "";
        break;
      }
    }

    if (!finalReply) {
      finalReply = "I've completed those actions for you. How else can I assist with your studies today?";
    }

    // Log token usage for cost tracking
    if (totalTokens > 0) {
      await supabaseAdmin
        .from("ai_token_usage")
        .insert({
          user_id: effectiveUserId,
          prompt_tokens: totalPromptTokens,
          completion_tokens: totalCompletionTokens,
          total_tokens: totalTokens,
          model: GROQ_MODEL,
        })
        .catch((err) => console.error("Failed to log token usage:", err));
    }

    return new Response(
      JSON.stringify({
        success: true,
        reply: finalReply,
        actions_taken: actionsTaken,
        usage: {
          prompt_tokens: totalPromptTokens,
          completion_tokens: totalCompletionTokens,
          total_tokens: totalTokens,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in ai-tutor-chat Edge Function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
