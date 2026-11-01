## 2025-10-01 - Edge Function Authorization and Metadata User ID Verification
**Vulnerability:** Edge Functions that execute elevated operations via `SUPABASE_SERVICE_ROLE_KEY` (such as payment or subscription fulfillment) did not check the `Authorization` header or verify that the calling user matched the transaction's target `user_id`.
**Learning:** Service role client invocations bypass Row Level Security (RLS). Any Edge Function performing write actions with service role credentials must explicitly validate the caller's JWT with `supabaseUserClient.auth.getUser()` and verify that `user.id` matches the domain object/metadata ownership before processing.
**Prevention:** Always extract `Authorization` header, validate `auth.getUser()`, and assert `user.id === targetUserId` in Edge Functions using service role keys.

## 2026-11-01 - Protocol-Relative URL Scheme Bypass in sanitizeUrl
**Vulnerability:** `sanitizeUrl` permitted relative URLs matching `/^\//`, which allowed protocol-relative URLs (`//evil.com`) and backslash-prefixed paths (`/\evil.com`) to pass through as legitimate relative URLs, exposing chat and resource link navigations to open redirects and external domain phishing.
**Learning:** Checking for leading slash `/` without rejecting adjacent forward slashes or backslashes allows browsers to treat the path as a network-path reference (`//`) or normalize backslashes into slashes in navigation contexts.
**Prevention:** Always inspect leading slash paths with `/^\/[/\\]/` and reject them before allowing relative URLs.
