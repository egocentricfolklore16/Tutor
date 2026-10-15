export function countGenuineAttempts(messages: any[]): number {
  if (!Array.isArray(messages)) return 0;

  const nonAttemptExactRegex = /^(?:idk|i\s*(?:don'?t|do\s*not)\s*(?:know|understand)|no\s*idea|no\s*clue|pass|help|dunno|i'?m\s*stuck|i\s*am\s*stuck|im\s*stuck|not\s*sure|\?+|\.+|hi|hello|hey|\[.*\])$/i;

  const nonAttemptDemandRegex = /(?:give|tell|show|send|write|solve)\s*(?:me\s*)?(?:the\s*)?(?:(?:final|correct|exact|right|actual|complete|full|real)\s*)?(?:answer|solution|result)|(?:what|whats|what's)\s*(?:is\s*)?(?:the\s*)?(?:(?:final|correct|exact|right|actual|complete|full|real)\s*)?(?:answer|solution|result)|(?:answer|solution|result)\s*(?:please|pls)|(?:can\s+you\s+|please\s+)?(?:solve|do|write|calculate|figure\s*(?:out)?|work\s*(?:out)?)\s*(?:it|this|the\s*(?:problem|question|equation))?\s*(?:for\s*me|now|please)?|just\s*(?:solve|do|write|give|tell|calculate)\s*(?:it|this|me|answer|solution|result)?|ignore\s*(?:all\s*)?(?:previous\s*|your\s*)?instructions|system\s*prompt|you\s*are\s*now|pretend\s*(?:you\s*are|to\s*be)/i;

  const promptInjectionRegex = /(?:ignore|disregard)\s+(?:all\s+|previous\s+|prior\s+|above\s+|system\s+)*(?:instructions|prompts|rules|directives)|system\s+prompt|you\s+are\s+now|jailbreak|(?:bypass|override)\s+(?:all\s+|system\s+|socratic\s+)*(?:rules|restrictions|mode|limits)/i;

  let attemptCount = 0;
  let hasAssistantResponded = false;

  for (const msg of messages) {
    if (!msg || typeof msg !== "object") continue;
    if (msg.role === "assistant") {
      hasAssistantResponded = true;
    } else if (msg.role === "user" && hasAssistantResponded) {
      if (typeof msg.content !== "string") continue;
      const clean = msg.content.trim();
      if (!clean) continue;
      if (nonAttemptExactRegex.test(clean)) continue;
      if (promptInjectionRegex.test(clean)) continue;
      const cleanLower = clean.toLowerCase();
      if (
        cleanLower.startsWith("i don't know") ||
        cleanLower.startsWith("i dont know") ||
        cleanLower.startsWith("i do not know") ||
        cleanLower.startsWith("i don't understand") ||
        cleanLower.startsWith("i dont understand") ||
        cleanLower.startsWith("i do not understand") ||
        cleanLower.startsWith("idk") ||
        cleanLower.startsWith("i am stuck") ||
        cleanLower.startsWith("i'm stuck")
      ) {
        if (clean.length < 50 && !cleanLower.includes("because") && !cleanLower.includes("think")) continue;
      }
      if (nonAttemptDemandRegex.test(clean) && !cleanLower.includes("because") && !cleanLower.includes("tried") && !cleanLower.includes("think")) continue;

      attemptCount++;
    }
  }

  return attemptCount;
}

export function getStrictnessRules(strictness?: string, attemptCount: number = 0): string {
  const normalized = (strictness || "").trim().toLowerCase();

  if (normalized === "always_guide" || normalized === "always guide first" || normalized === "always_guide_first") {
    return `STRICTNESS: ALWAYS GUIDE FIRST. Never give the final answer or a finished solution on the first response. Respond with one guiding question or the first small step for the student to try. Let the student do the thinking and wait for their attempt. Only after the student has made at least two genuine attempts and is still stuck may you reveal the next step, and even then explain the step rather than the whole solution. If the student asks you to just give the answer, stay kind but hold the line: say you'll make it smaller, then offer an easier sub-step or a similar worked example with different numbers. If the student is frustrated or stuck repeatedly, break the problem into a smaller step instead of repeating yourself. Keep replies short.`;
  }

  if (normalized === "direct_help" || normalized === "direct help") {
    return `STRICTNESS: DIRECT HELP. Answer the question directly and clearly first, with a concise step-by-step explanation. Then add a short check question or a similar practice problem so the student still learns. Do not withhold the answer or answer with only questions. If the student wants to work it out themselves, offer to switch to guided mode for that problem.`;
  }

  // Default: hints_then_answer
  return `STRICTNESS: HINTS THEN ANSWER. Start with a hint that points the student in the right direction without revealing the answer. If the student replies still stuck, give a stronger hint. If they are still stuck after that, or they explicitly ask for the answer, give the full answer with a clear step-by-step explanation, then ask one short check-for-understanding question. Never refuse to answer after hints have been given.`;
}
