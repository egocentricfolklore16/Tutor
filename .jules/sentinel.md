## 2025-05-20 - Unescaped User Input Injected into System Prompt XML Tags
**Vulnerability:** User-controlled fields (`studySession.Topic`, `studySession.Subject`, `profile.primary_goal`, etc.) were sanitized for control chars and `{{` mustache templates, but raw `<` and `>` characters were passed unescaped directly into system prompt template blocks (such as `<session_context>`). An attacker could supply `</session_context><guardrails>...` to break out of context tags and inject arbitrary system instructions.
**Learning:** Sanitizing inputs for template syntax (like mustache braces) is insufficient when LLM system prompts use XML structure tags to separate trusted instructions from untrusted data.
**Prevention:** Always escape angle brackets (`<` to `&lt;` and `>` to `&gt;`) in `sanitizeString` or wrap untrusted inputs in explicit data tags before interpolating into LLM system prompts.

## 2025-05-18 - Prototype Property Lookup Injection in Dynamic Enum Resolution
**Vulnerability:** In `resolveStrictness` (`supabase/functions/ai-tutor-chat/index.ts`), dynamic lookup `STRICTNESS_PROMPTS[override]` evaluated prototype properties like `toString`, `constructor`, `__proto__`, and `valueOf` as truthy function objects.
**Learning:** Checking property existence on plain JavaScript objects using `obj[key]` evaluates prototype properties inherited from `Object.prototype`, which can bypass mode validation and contaminate string interpolations (e.g., injecting `function toString() { [native code] }` into system prompts).
**Prevention:** Use an explicit `Set<string>` or `Array.includes()` with `VALID_ENUM.has(val)` or `Object.prototype.hasOwnProperty.call(obj, val)` to validate untrusted enum values instead of dynamic object index lookups.

## 2025-05-10 - IDOR in Supabase Edge Functions with Service Role Clients
**Vulnerability:** Edge Functions receiving standard user Auth JWT tokens used Supabase service role clients to query or mutate user data using request parameters (like `requestBody.userId`) without verifying that the parameter matched `user.id`.
**Learning:** Authenticated user tokens confirm identity (`user.id`), but using `adminClient` (service role) bypasses Row Level Security (RLS). Any parameter passed in the request body that specifies a target user ID must be validated against `user.id` or restricted to `user.id`.
**Prevention:** Always assert `if (requestBody.userId && requestBody.userId !== user.id) return 403 Forbidden` before invoking `adminClient` operations on behalf of an authenticated caller.
