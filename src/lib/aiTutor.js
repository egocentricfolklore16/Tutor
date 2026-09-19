import supabase from "./supabase";

/**
 * Invokes the secure server-side Groq 'ai-tutor' Edge Function.
 *
 * @param {Object} params
 * @param {number} params.sessionId - Current session ID from "Study" table
 * @param {Array} params.messages - Array of { role: 'user'|'assistant', content: string } (max 20)
 * @param {Object} params.clientState - { focus_mode, pomodoro_state, minutes_remaining }
 * @returns {Promise<{ reply: string, actions: Array, error?: Object }>}
 */
export async function invokeAiTutor({ sessionId, messages = [], clientState = {} }) {
  // Format messages: max 20, content capped at 4000
  const formattedMessages = (messages || [])
    .slice(-20)
    .map((msg) => ({
      role: msg.role || (msg.sender === "user" ? "user" : "assistant"),
      content: (msg.content || msg.text || "").slice(0, 4000),
    }));

  const { data, error } = await supabase.functions.invoke("ai-tutor", {
    body: {
      session_id: Number(sessionId),
      messages: formattedMessages,
      client_state: clientState,
    },
  });

  if (error) {
    let message = "An error occurred while connecting to the AI Tutor.";
    if (error.status === 401) message = "Please sign in again.";
    else if (error.status === 404) message = "This session no longer exists.";
    else if (error.status === 429) message = "You've reached the request limit. Please take a short break.";
    else if (error.status === 502 || error.status === 503) message = "The tutor is busy, try again shortly.";
    return { error: { code: "HTTP_ERROR", message } };
  }

  if (data?.error) {
    return { error: data.error };
  }

  return {
    reply: data?.reply || "",
    actions: Array.isArray(data?.actions) ? data.actions : [],
  };
}

/**
 * Refetches all session-scoped materials (notes, flashcards, resources, quizzes).
 * @param {number|string} sessionId
 */
export async function refreshSessionMaterials(sessionId) {
  if (!sessionId) return { notes: [], flashcards: [], resources: [], quizzes: [] };
  const [
    { data: notes },
    { data: flashcards },
    { data: resources },
    { data: quizzes },
  ] = await Promise.all([
    supabase.from("session_notes").select("*").eq("session_id", sessionId),
    supabase.from("session_flashcards").select("*").eq("session_id", sessionId),
    supabase.from("session_resources").select("*").eq("session_id", sessionId),
    supabase.from("session_quizzes").select("*, questions:session_quiz_questions(*)").eq("session_id", sessionId),
  ]);

  return {
    notes: notes || [],
    flashcards: flashcards || [],
    resources: resources || [],
    quizzes: quizzes || [],
  };
}

/**
 * Backward compatibility wrapper for existing components.
 */
export async function sendAiTutorMessage({
  message,
  history = [],
  sessionId = null,
}) {
  const formattedMessages = [
    ...history.map((m) => ({
      role: m.role || (m.sender === "user" ? "user" : "assistant"),
      content: m.text || m.content || "",
    })),
    { role: "user", content: message },
  ];

  const res = await invokeAiTutor({
    sessionId: sessionId || 1,
    messages: formattedMessages,
    clientState: {},
  });

  if (res.error) {
    throw new Error(res.error.message || "Failed to communicate with AI Tutor.");
  }

  return {
    reply: res.reply,
    actions_taken: res.actions || [],
  };
}

export default invokeAiTutor;
