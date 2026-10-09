## 2025-05-25 - PostgREST Query Filter Injection in Client Keepalive Beacons
**Vulnerability:** Direct string interpolation of `id` in REST endpoints (`/rest/v1/Study?id=eq.${id}&...`) permitted PostgREST query parameter injection, while passing `Authorization: Bearer ${anonKey}` caused RLS policies checking `auth.uid()` to reject unauthenticated session pause beacons.
**Learning:** Raw string interpolation in REST API endpoint strings permits URL parameter injection (e.g. `123&session_status=eq.active`), and client beacons sending direct PostgREST requests fail under RLS if they fall back blindly to anonymous tokens instead of reading the active user session JWT from storage.
**Prevention:** Always wrap URL query parameters with `encodeURIComponent()` and extract stored user session JWT tokens for keepalive REST fetch calls.

## 2025-05-18 - Prototype Property Lookup Injection in Dynamic Enum Resolution
**Vulnerability:** In `resolveStrictness` (`supabase/functions/ai-tutor-chat/index.ts`), dynamic lookup `STRICTNESS_PROMPTS[override]` evaluated prototype properties like `toString`, `constructor`, `__proto__`, and `valueOf` as truthy function objects.
**Learning:** Checking property existence on plain JavaScript objects using `obj[key]` evaluates prototype properties inherited from `Object.prototype`, which can bypass mode validation and contaminate string interpolations (e.g., injecting `function toString() { [native code] }` into system prompts).
**Prevention:** Use an explicit `Set<string>` or `Array.includes()` with `VALID_ENUM.has(val)` or `Object.prototype.hasOwnProperty.call(obj, val)` to validate untrusted enum values instead of dynamic object index lookups.

## 2025-05-10 - IDOR in Supabase Edge Functions with Service Role Clients
**Vulnerability:** Edge Functions receiving standard user Auth JWT tokens used Supabase service role clients to query or mutate user data using request parameters (like `requestBody.userId`) without verifying that the parameter matched `user.id`.
**Learning:** Authenticated user tokens confirm identity (`user.id`), but using `adminClient` (service role) bypasses Row Level Security (RLS). Any parameter passed in the request body that specifies a target user ID must be validated against `user.id` or restricted to `user.id`.
**Prevention:** Always assert `if (requestBody.userId && requestBody.userId !== user.id) return 403 Forbidden` before invoking `adminClient` operations on behalf of an authenticated caller.
