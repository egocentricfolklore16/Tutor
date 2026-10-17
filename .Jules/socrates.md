## 2026-09-30 - Server-Side Socratic Answer Unlock Enforcement

**Learning:** Prompt instructions alone ("do not give the answer until the student tries") are vulnerable to student bypass and prompt injection (e.g. "just give me the answer"). Server-side state evaluation must compute the genuine attempt count from conversation history and explicitly inject the authoritative `LOCKED` vs `UNLOCKED` state mandate into the system prompt.

**Action:** Whenever enforcing pedagogical gates or unlock conditions (such as answer unlocks or milestone progression), compute the state in server code first and explicitly instruct the model with `SERVER-ENFORCED STATE: LOCKED/UNLOCKED` and strict boundaries.

## 2026-10-01 - Normalizing Preference Enums and Filtering Non-Attempt Answer Demands

**Learning:** Database RPCs and UI controls may store user preferences as snake_case enums (`hints_then_answer`, `direct_help`), while system prompts use display labels ("Hints Then Answer"). Normalization functions must lower-case and strip string representations to match both formats, or user settings fall back to default strictness. Additionally, `countGenuineAttempts` must filter multi-word answer demands ("tell me the solution", "solve it for me") and non-substantive text so students cannot bypass answer locking by repeating demands.

**Action:** Always test both UI label strings and database enum values against preference resolvers, and test non-attempt demand phrases against `countGenuineAttempts`.

## 2026-10-03 - Guarding Genuine Attempt Counters Against Prompt Injections

**Learning:** Prompt injection attempts ("ignore previous instructions", "system prompt", "you are now") in student messages can spoof genuine attempts and prematurely unlock answers if not filtered server-side by `countGenuineAttempts`. However, demand filters must be specifically bounded to injection/bypass phrases rather than generic verb-object patterns like `(?:give|tell|show)\s*me` to avoid misclassifying valid questions ("Can you tell me if x = 5?") as non-attempts.

**Action:** Ensure demand/injection filters in server-side turn counters target explicit bypass phrases and answer demands without matching standard conversational student queries.

## 2026-10-05 - Auditing Auxiliary Chat Endpoints for Server-Side State Injection

**Learning:** When multiple Edge Functions serve AI chat features (e.g., `ai-tutor` vs `ai-tutor-chat`), prompt-only strictness rules in lightweight endpoints (such as `STRICTNESS_PROMPTS` instructing "or explicitly ask you to just tell them") create bypass holes where answer locking is skipped on attempt 0. Sharing server-side attempt counting (`countGenuineAttempts`) and state formatting (`getStrictnessRules`) across all AI endpoints ensures uniform lock enforcement.

**Action:** Whenever introducing or updating AI prompt edge functions, ensure every chat endpoint computes turn history attempts server-side and injects `SERVER-ENFORCED STATE: LOCKED/UNLOCKED` rules rather than relying on static inline text.

## 2026-10-06 - Closing Answer-Unlock Demand Phrase Bypass Holes in Turn Counting

**Learning:** Students can bypass answer-locking logic by introducing mild modifier adjectives (e.g., "tell me the final answer", "give me the correct answer", "what is the right answer") or phrasing variations ("solve this for me", "i do not know", "i do not understand") that match neither exact string matches nor rigid demand regexes. Expanding regexes to handle optional descriptive adjectives and alternate pronouns ensures students cannot trick the turn counter into unlocking answers without genuine effort.

**Action:** Maintain regex patterns in `countGenuineAttempts` that accommodate optional adjectives (`(?:final|correct|exact|right|actual|complete|full|real)\s*`) and verb target variations (`this` vs `it`) while maintaining strict boundaries so valid student queries remain recognized as genuine attempts.

## 2026-10-07 - Filtering Bare Problem-Solving Demands in Turn Counting

**Learning:** Bare problem-solving demands (e.g., "solve this", "can you solve this", "work it out", "calculate this", "figure it out") previously bypassed `countGenuineAttempts` because the demand regex required specific tail pronouns/modifiers ("for me") or "answer/solution" keywords. Expanding `nonAttemptDemandRegex` to capture verbs (`solve`, `calculate`, `figure out`, `work out`) with target nouns (`this`, `it`, `the problem`, `the question`) ensures zero-effort problem submissions do not unlock answers prematurely while allowing genuine reasoning statements containing keywords like `because`, `tried`, or `think`.

**Action:** Test bare problem-solving command phrasing against `countGenuineAttempts` and ensure non-attempt regexes match problem submission verbs with target objects (`this`, `it`, `problem`) while preserving genuine reasoning statements.

## 2026-10-08 - Explicit Non-Academic Boundary Instructions for Crisis Guardrails

**Learning:** When system prompts instruct tutors to pause tutoring mode for student distress, models may still attempt to ask check questions or pivot back to academic subjects unless explicitly forbidden from asking follow-up check questions, providing medical/diagnostic advice, or re-routing back to study topics.

**Action:** In wellbeing guardrails across all AI endpoints, explicitly append instructions to pause tutoring mode immediately, express care and warmth, provide crisis helpline resources (988 / trusted adult), omit check questions, avoid medical advice, and refrain from re-routing to academic topics.

## 2026-10-09 - Propagating Genuine Attempt Counts to Prompt Builder Rules

**Learning:** Unused attempt count parameters (`_attemptCount: number = 0`) in prompt builder functions cause strictness modes to render static prompt text without explicit `[SERVER-ENFORCED STATE: LOCKED/UNLOCKED]` markers. Ensuring all chat edge functions (`ai-tutor`, `ai-tutor-chat`) pass full conversation history to `countGenuineAttempts` and propagate `attemptCount` into `strictnessRules` guarantees explicit state injection on every turn.

**Action:** Whenever updating prompt strictness or state handlers, verify that attempt counts flow from request turn history all the way into `strictnessRules` and generated system prompt strings.
