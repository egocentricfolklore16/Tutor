## 2026-09-30 - Server-Side Socratic Answer Unlock Enforcement

**Learning:** Prompt instructions alone ("do not give the answer until the student tries") are vulnerable to student bypass and prompt injection (e.g. "just give me the answer"). Server-side state evaluation must compute the genuine attempt count from conversation history and explicitly inject the authoritative `LOCKED` vs `UNLOCKED` state mandate into the system prompt.

**Action:** Whenever enforcing pedagogical gates or unlock conditions (such as answer unlocks or milestone progression), compute the state in server code first and explicitly instruct the model with `SERVER-ENFORCED STATE: LOCKED/UNLOCKED` and strict boundaries.

## 2026-10-01 - Normalizing Preference Enums and Filtering Non-Attempt Answer Demands

**Learning:** Database RPCs and UI controls may store user preferences as snake_case enums (`hints_then_answer`, `direct_help`), while system prompts use display labels ("Hints Then Answer"). Normalization functions must lower-case and strip string representations to match both formats, or user settings fall back to default strictness. Additionally, `countGenuineAttempts` must filter multi-word answer demands ("tell me the solution", "solve it for me") and non-substantive text so students cannot bypass answer locking by repeating demands.

**Action:** Always test both UI label strings and database enum values against preference resolvers, and test non-attempt demand phrases against `countGenuineAttempts`.

## 2026-10-03 - Guarding Genuine Attempt Counters Against Prompt Injections

**Learning:** Prompt injection attempts ("ignore previous instructions", "system prompt", "you are now") in student messages can spoof genuine attempts and prematurely unlock answers if not filtered server-side by `countGenuineAttempts`. However, demand filters must be specifically bounded to injection/bypass phrases rather than generic verb-object patterns like `(?:give|tell|show)\s*me` to avoid misclassifying valid questions ("Can you tell me if x = 5?") as non-attempts.

**Action:** Ensure demand/injection filters in server-side turn counters target explicit bypass phrases and answer demands without matching standard conversational student queries.

## 2026-10-10 - Bounding Word Boundaries and Imperative Verb Sequences for Answer Demands

**Learning:** Unanchored regexes in server-side attempt counters (`countGenuineAttempts`) without word boundaries (`\b`) can accidentally flag past-tense descriptions of work ("I just solved it", "I wrote the equation") as non-attempts, or fail to match demand variants like "provide the final answer", "output the correct solution", or "share the exact answer" if whitespace or modifier rules are too loose.

**Action:** Wrap demand verbs (`provide`, `share`, `output`, `print`, `display`, `reveal`, `get`) and target nouns (`answer`, `solution`, `steps`, `result`) in explicit word boundaries (`\b`) and require explicit whitespace before target nouns so imperative demands are caught without misclassifying past-tense student explanations.
