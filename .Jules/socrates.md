## 2026-09-30 - Server-Side Socratic Answer Unlock Enforcement

**Learning:** Prompt instructions alone ("do not give the answer until the student tries") are vulnerable to student bypass and prompt injection (e.g. "just give me the answer"). Server-side state evaluation must compute the genuine attempt count from conversation history and explicitly inject the authoritative `LOCKED` vs `UNLOCKED` state mandate into the system prompt.

**Action:** Whenever enforcing pedagogical gates or unlock conditions (such as answer unlocks or milestone progression), compute the state in server code first and explicitly instruct the model with `SERVER-ENFORCED STATE: LOCKED/UNLOCKED` and strict boundaries.

## 2026-10-01 - Normalizing Preference Enums and Filtering Non-Attempt Answer Demands

**Learning:** Database RPCs and UI controls may store user preferences as snake_case enums (`hints_then_answer`, `direct_help`), while system prompts use display labels ("Hints Then Answer"). Normalization functions must lower-case and strip string representations to match both formats, or user settings fall back to default strictness. Additionally, `countGenuineAttempts` must filter multi-word answer demands ("tell me the solution", "solve it for me") and non-substantive text so students cannot bypass answer locking by repeating demands.

**Action:** Always test both UI label strings and database enum values against preference resolvers, and test non-attempt demand phrases against `countGenuineAttempts`.
