## 2025-05-22 - Missing Mandatory Authentication on AI Edge Functions
**Vulnerability:** Edge Functions calling third-party AI LLM services (e.g. Groq) without strictly enforcing JWT authentication allowed unauthenticated requests to consume API credits and server resources.
**Learning:** AI completion endpoints MUST require an `Authorization` header and validate user tokens via `supabase.auth.getUser(token)` before performing model invocations or strictness resolution.
**Prevention:** Always verify `Authorization` header and return 401 Unauthorized for missing or invalid tokens prior to calling third-party APIs.

## 2025-05-10 - IDOR in Supabase Edge Functions with Service Role Clients
**Vulnerability:** Edge Functions receiving standard user Auth JWT tokens used Supabase service role clients to query or mutate user data using request parameters (like `requestBody.userId`) without verifying that the parameter matched `user.id`.
**Learning:** Authenticated user tokens confirm identity (`user.id`), but using `adminClient` (service role) bypasses Row Level Security (RLS). Any parameter passed in the request body that specifies a target user ID must be validated against `user.id` or restricted to `user.id`.
**Prevention:** Always assert `if (requestBody.userId && requestBody.userId !== user.id) return 403 Forbidden` before invoking `adminClient` operations on behalf of an authenticated caller.

## 2025-05-22 - Missing Authentication Guard on Edge Functions with Service Role Client
**Vulnerability:** The `ai-tutor-chat` Edge Function allowed unauthenticated requests, falling back to anonymous defaults instead of rejecting missing or invalid JWT tokens with HTTP 401 Unauthorized.
**Learning:** Edge Functions initialized with `SUPABASE_SERVICE_ROLE_KEY` bypass Row Level Security. Failing to strictly enforce JWT verification allows unauthenticated callers to trigger LLM API calls and write to internal tables like `ai_error_log`.
**Prevention:** Always check for `Authorization` header and validate JWT via `supabase.auth.getUser(token)` returning `HTTP 401` immediately if missing or invalid.
