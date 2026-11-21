import supabase from "./supabase";

export async function invokeAiTutor({
  studentMessage,
  conversationId = null,
  sessionId = null,
  clientState = {},
}) {
  const body = {
    student_message: String(studentMessage || "").slice(0, 4000),
  };
  if (conversationId) body.conversation_id = conversationId;
  if (sessionId) body.current_study_session_id = Number(sessionId);
  if (clientState && typeof clientState === "object") body.client_state = clientState;

  const { data, error } = await supabase.functions.invoke("ai-chat", { body });

  if (error) {
    const status = error.status;
    let message = "Lumo couldn't answer right now. Please try again.";
    if (status === 401) message = "Please sign in again.";
    else if (status === 429) message = "You've reached the request limit. Please take a short break.";
    else if (status === 503) message = "Lumo is busy. Please try again shortly.";
    else if (status === 404) message = "Conversation not found";
    return { error: { status, message } };
  }

  if (data?.error) {
    return { error: { status: 400, message: "Lumo couldn't answer right now. Please try again." } };
  }

  return {
    reply: data?.reply || "",
    actions: Array.isArray(data?.actions_taken) ? data.actions_taken : [],
    conversationId: data?.conversation_id || null,
    title: data?.title || null,
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
  void history;
  return invokeAiTutor({ studentMessage: message, sessionId });
}

export default invokeAiTutor;
