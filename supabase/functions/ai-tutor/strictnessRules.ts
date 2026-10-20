import { normalizeStrictness, strictnessRules } from "../ai-tutor-chat/prompt.ts";

export function countGenuineAttempts(messages: any[]): number {
  if (!Array.isArray(messages)) return 0;

  const nonAttemptExactRegex = /^(?:idk|i\s*(?:don'?t|do\s*not)\s*(?:know|understand)|no\s*idea|no\s*clue|pass|help|dunno|i'?m\s*stuck|i\s*am\s*stuck|im\s*stuck|not\s*sure|\?+|\.+|hi|hello|hey|\[.*\])$/i;

  const nonAttemptDemandRegex = /(?:give|tell|show|send|write|solve|explain)\s*(?:me\s*)?(?:the\s*|your\s*)?(?:(?:final|correct|exact|right|actual|complete|full|real)\s*)?(?:answer|solution|result|code|steps?|step\s*by\s*step|work)|(?:what|whats|what's)\s*(?:is|are)?\s*(?:the\s*)?(?:(?:final|correct|exact|right|actual|complete|full|real)\s*)?(?:answer|solution|result|code|steps?|step\s*by\s*step)|(?:answer|solution|result|code|steps?)\s*(?:please|pls)|(?:can\s+you\s+|could\s+you\s+|would\s+you\s+|please\s+)?(?:solve|do|write|calculate|figure\s*(?:out)?|work\s*(?:out)?)\s*(?:it|this|the\s*(?:problem|question|equation|code))?\s*(?:for\s*me|now|please)?|just\s*(?:solve|do|write|give|tell|show|calculate|answer)\s*(?:it|this|me|how|answer|solution|result|code|steps?)*|(?:show|tell|explain)\s*(?:me\s*)?how\s*(?:to\s*)?(?:solve|do|work|code)\s*(?:it|this|the\s*(?:problem|question|equation))?|show\s*(?:your\s*)?work|ignore\s*(?:all\s*)?(?:previous\s*|your\s*)?instructions|system\s*prompt|you\s*are\s*now|pretend\s*(?:you\s*are|to\s*be)/i;

  const promptInjectionRegex = /(?:ignore|disregard)\s+(?:all\s+|previous\s+|prior\s+|above\s+|system\s+)*(?:instructions|prompts|rules|directives)|system\s+prompt|you\s+are\s+now|jailbreak|developer\s*mode|(?:bypass|override)\s+(?:all\s+|system\s+|socratic\s+)*(?:rules|restrictions|mode|limits)/i;

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
  const norm = normalizeStrictness(strictness);
  return strictnessRules(norm, attemptCount).rules;
}
