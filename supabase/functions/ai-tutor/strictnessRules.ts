import { normalizeStrictness, strictnessRules } from "../ai-tutor-chat/prompt.ts";

export function countGenuineAttempts(messages: any[]): number {
  if (!Array.isArray(messages)) return 0;

  const nonAttemptExactRegex = /^(?:idk|i\s*(?:don'?t|do\s*not)\s*(?:know|understand)|no\s*idea|no\s*clue|pass|help|help\s*me|skip|n\/?a|nothing|dunno|i'?m\s*stuck|i\s*am\s*stuck|im\s*stuck|not\s*sure|\?+|\.+|hi|hello|hey|\[.*\])$/i;

  const targetNoun = `(?:(?:final|correct|exact|right|actual|complete|full|real)\\s*)?(?:answer|solution|result|steps?|step\\s*by\\s*step|work|code|explanation|summary|formula|formulas|definition|definitions|proof|proofs|equation|equations|derivation|derivations|key|answer\\s*key|solution\\s*key|rubric|grading\\s*scheme)`;
  const compoundTargetNouns = `${targetNoun}(?:\\s*(?:and|&|\\+|,)\\s*(?:the\\s*|a\\s*|an\\s*|your\\s*)?${targetNoun})*`;
  const deliverableNoun = `(?:homework|assignment|assignments|task|tasks|paper|papers|essay|essays|worksheet|worksheets|project|projects)`;

  const problemSolvingVerbs = `(?:solve|calculate|compute|evaluate|resolve|answer|generate|output|finish|complete)`;
  const problemSolvingBranch =
    `(?:can\\s+you\\s+|could\\s+you\\s+|would\\s+you\\s+|please\\s+)?(?:` +
    `${problemSolvingVerbs}\\s+(?:(?:for\\s+me|now|please)|(?:it|this|that|all\\s+of\\s+(?:this|these)|the\\s+(?:problem|question|equation|formula|integral|expression|${deliverableNoun})|my\\s+${deliverableNoun})(?:\\s+(?:for\\s+me|now|please))?)|` +
    `(?:do|write)\\s+(?:(?:it|this|that)\\s+(?:for\\s+me|now)|the\\s+${deliverableNoun}|my\\s+${deliverableNoun}|(?:for\\s+me))|` +
    `(?:figure|work)\\s*(?:out\\s*(?:it|this|that|the\\s+problem)?|(?:it|this|that)\\s*out)(?:\\s+(?:for\\s+me|now|please))?)`;

  const nonAttemptDemandRegex = new RegExp(
    `(?:i\\s*(?:need|want|would\\s+like)|give|tell|show|send|write|solve|explain|provide|output|generate|return|display|print|share|reveal)\\s*(?:me\\s*)?(?:with\\s*)?(?:the\\s*|a\\s*|an\\s*|your\\s*)?${compoundTargetNouns}|` +
      `(?:what|whats|what's)\\s*(?:is|are)?\\s*(?:the\\s*|a\\s*|an\\s*)?${compoundTargetNouns}|` +
      `(?:answer|solution|result|steps?|formula|definition)\\s*(?:please|pls)|` +
      `${problemSolvingBranch}|` +
      `just\\s*(?:solve|do|write|give|tell|show|calculate|answer|output|generate|return|display|print|share|reveal|provide|finish|complete)\\s*(?:it|this|that|me|how|answer|solution|result|steps?)*|` +
      `(?:show|tell|explain)\\s*(?:me\\s*)?how\\s*(?:to\\s*)?(?:solve|do|work)\\s*(?:it|this|that|the\\s*(?:problem|question|equation))?|` +
      `show\\s*(?:your\\s*)?work|` +
      `ignore\\s*(?:all\\s*)?(?:previous\\s*|your\\s*)?instructions|system\\s*prompt|you\\s*are\\s*now|pretend\\s*(?:you\\s*are|to\\s*be)`,
    "i"
  );

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
  const norm = normalizeStrictness(strictness);
  return strictnessRules(norm, attemptCount).rules;
}
