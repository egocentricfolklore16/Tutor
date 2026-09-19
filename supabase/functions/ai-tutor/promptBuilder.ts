import { SYSTEM_PROMPT_TEMPLATE } from "./systemPrompt.ts";
import { getStrictnessRules } from "./strictnessRules.ts";
import { sanitizeString, wrapStudentData } from "./validators.ts";

export interface PromptParams {
  profile: any;
  studySession: any;
  resources: any[];
  notes: any[];
  clientState?: any;
}

export function buildSystemPrompt(params: PromptParams): string {
  const { profile, studySession, resources, notes, clientState } = params;

  const student_level = sanitizeString(
    profile?.education_level
      ? `${profile.education_level}${profile.learner_type ? ` (${profile.learner_type})` : ""}`
      : "unknown",
    120
  );

  const curriculum_standard = sanitizeString(profile?.curriculum_standard || "None/General", 120);
  const learning_style = sanitizeString(profile?.learning_style || "unknown", 120);
  const knowledge_gaps = Array.isArray(profile?.knowledge_gaps)
    ? profile.knowledge_gaps.map((g: string) => sanitizeString(g, 100)).filter(Boolean).join(", ")
    : "unknown";

  const subject = sanitizeString(studySession?.Subject || "unknown", 120);
  const topic = sanitizeString(studySession?.Topic || "unknown", 120);
  const difficulty = "medium";
  const focus_mode = sanitizeString(clientState?.focus_mode || "Deep work", 40);

  const session_date = sanitizeString(studySession?.Date || "unknown", 20);
  const session_start = sanitizeString(studySession?.Start || "unknown", 20);
  const session_duration_minutes = studySession?.Duration ? String(Number(studySession.Duration) * 60) : "unknown";

  let minutes_remaining = "unknown";
  if (typeof clientState?.minutes_remaining === "number") {
    minutes_remaining = String(clientState.minutes_remaining);
  }

  const pomodoro_state = sanitizeString(clientState?.pomodoro_state || "unknown", 20);
  const timezone = sanitizeString(profile?.timezone || "UTC", 50);

  // Formatted ISO 8601 current time in user's timezone
  let current_datetime = "unknown";
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZoneName: "short",
    });
    current_datetime = `${formatter.format(now)} (${now.toISOString()})`;
  } catch {
    current_datetime = new Date().toISOString();
  }

  const language = sanitizeString(profile?.language || "English", 50);
  const accessibility_needs = Array.isArray(profile?.accessibility_needs)
    ? profile.accessibility_needs.map((a: string) => sanitizeString(a, 100)).filter(Boolean).join(", ")
    : "none";

  // Build resources string
  let resources_str = "none";
  if (Array.isArray(resources) && resources.length > 0) {
    const items = resources.map((res: any) => {
      const fileName = sanitizeString(res.file_name || res.title || "unnamed file", 120);
      const fileType = sanitizeString(res.file_type || res.type || "unknown", 50);
      const isTextAvail = Boolean(res.text_available);
      let resStr = `[file_name: "${fileName}", file_type: "${fileType}", text_available: ${isTextAvail}`;
      if (isTextAvail && res.excerpt) {
        const cleanExcerpt = wrapStudentData(sanitizeString(res.excerpt, 4000));
        resStr += `, excerpt: ${cleanExcerpt}`;
      }
      resStr += `]`;
      return resStr;
    });
    resources_str = items.join("; ");
  }

  // Build notes string
  let notes_excerpt = "none";
  if (Array.isArray(notes) && notes.length > 0) {
    let combinedNotes = "";
    for (const note of notes) {
      const noteTitle = sanitizeString(note.title || "Untitled Note", 120);
      const noteContent = sanitizeString(note.content || "", 1500);
      combinedNotes += `Title: ${noteTitle}\nContent: ${noteContent}\n---\n`;
      if (combinedNotes.length >= 6000) break;
    }
    notes_excerpt = wrapStudentData(sanitizeString(combinedNotes, 6000));
  }

  const strictness_rules = getStrictnessRules(profile?.socratic_strictness);

  // Replace placeholders
  let prompt = SYSTEM_PROMPT_TEMPLATE;
  prompt = prompt.replaceAll("{{student_level}}", student_level || "unknown");
  prompt = prompt.replaceAll("{{curriculum_standard}}", curriculum_standard || "unknown");
  prompt = prompt.replaceAll("{{learning_style}}", learning_style || "unknown");
  prompt = prompt.replaceAll("{{knowledge_gaps}}", knowledge_gaps || "unknown");
  prompt = prompt.replaceAll("{{subject}}", subject || "unknown");
  prompt = prompt.replaceAll("{{topic}}", topic || "unknown");
  prompt = prompt.replaceAll("{{difficulty}}", difficulty || "unknown");
  prompt = prompt.replaceAll("{{focus_mode}}", focus_mode || "unknown");
  prompt = prompt.replaceAll("{{session_date}}", session_date || "unknown");
  prompt = prompt.replaceAll("{{session_start}}", session_start || "unknown");
  prompt = prompt.replaceAll("{{session_duration_minutes}}", session_duration_minutes || "unknown");
  prompt = prompt.replaceAll("{{minutes_remaining}}", minutes_remaining || "unknown");
  prompt = prompt.replaceAll("{{pomodoro_state}}", pomodoro_state || "unknown");
  prompt = prompt.replaceAll("{{timezone}}", timezone || "unknown");
  prompt = prompt.replaceAll("{{current_datetime}}", current_datetime || "unknown");
  prompt = prompt.replaceAll("{{language}}", language || "unknown");
  prompt = prompt.replaceAll("{{accessibility_needs}}", accessibility_needs || "unknown");
  prompt = prompt.replaceAll("{{resources}}", resources_str || "none");
  prompt = prompt.replaceAll("{{notes_excerpt}}", notes_excerpt || "none");
  prompt = prompt.replaceAll("{{strictness_rules}}", strictness_rules);

  return prompt;
}
