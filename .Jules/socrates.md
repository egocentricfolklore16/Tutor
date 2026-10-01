## 2026-09-30 - Server-Side Socratic Answer Unlock Enforcement

**Learning:** Prompt instructions alone ("do not give the answer until the student tries") are vulnerable to student bypass and prompt injection (e.g. "just give me the answer"). Server-side state evaluation must compute the genuine attempt count from conversation history and explicitly inject the authoritative `LOCKED` vs `UNLOCKED` state mandate into the system prompt.

**Action:** Whenever enforcing pedagogical gates or unlock conditions (such as answer unlocks or milestone progression), compute the state in server code first and explicitly instruct the model with `SERVER-ENFORCED STATE: LOCKED/UNLOCKED` and strict boundaries.
