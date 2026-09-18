import supabase from "./supabase";

/**
 * Sends a student message to the Groq-backed ai-tutor-chat Edge Function.
 *
 * @param {Object} params
 * @param {string} params.message - Current user message text
 * @param {Array} [params.history=[]] - Conversation history
 * @param {string} [params.studentLevel='High School'] - Student education level
 * @param {string} [params.curriculumStandard='None/General'] - Curriculum standard
 * @param {Array} [params.knowledgeGaps=[]] - Array of known knowledge gap strings
 * @param {string} [params.studentId] - Explicit student ID if known
 * @returns {Promise<{ reply: string, actions_taken: Array }>}
 */
export async function sendAiTutorMessage({
  message,
  history = [],
  studentLevel = "High School",
  curriculumStandard = "None/General",
  knowledgeGaps = [],
  studentId = null,
}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = studentId || session?.user?.id;

  // Format history array into standard OpenAI role/content objects
  const formattedHistory = (history || []).map((msg) => {
    if (msg.role && msg.content) {
      return { role: msg.role, content: msg.content };
    }
    return {
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.text || msg.content || "",
    };
  });

  const { data, error } = await supabase.functions.invoke("ai-tutor-chat", {
    body: {
      student_id: userId,
      student_message: message,
      student_level: studentLevel,
      curriculum_standard: curriculumStandard,
      knowledge_gaps: knowledgeGaps,
      conversation_history: formattedHistory,
    },
  });

  if (error) {
    let errorMessage = error.message || "Failed to communicate with AI Tutor.";
    if (error.status === 401) {
      errorMessage = "Authentication failed. Please log in to continue using AI Tutor.";
    }
    throw new Error(errorMessage);
  }

  if (data && data.error) {
    throw new Error(data.error);
  }

  if (!data || typeof data.reply !== "string") {
    throw new Error("Invalid response received from AI Tutor Edge Function.");
  }

  return {
    reply: data.reply,
    actions_taken: Array.isArray(data.actions_taken) ? data.actions_taken : [],
  };
}

export default sendAiTutorMessage;
