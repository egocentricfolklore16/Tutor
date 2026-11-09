## 2025-10-01 - Edge Function Authorization and Metadata User ID Verification
**Vulnerability:** Edge Functions that execute elevated operations via `SUPABASE_SERVICE_ROLE_KEY` (such as payment or subscription fulfillment) did not check the `Authorization` header or verify that the calling user matched the transaction's target `user_id`.
**Learning:** Service role client invocations bypass Row Level Security (RLS). Any Edge Function performing write actions with service role credentials must explicitly validate the caller's JWT with `supabaseUserClient.auth.getUser()` and verify that `user.id` matches the domain object/metadata ownership before processing.
**Prevention:** Always extract `Authorization` header, validate `auth.getUser()`, and assert `user.id === targetUserId` in Edge Functions using service role keys.

## 2026-11-09 - Protocol-Relative URL Open Redirects in Client URL Sanitizers
**Vulnerability:** The client-side `sanitizeUrl` helper permitted any input starting with `/` to support relative links (`/dashboard`), which inadvertently allowed protocol-relative URLs (`//attacker.com`) and backslash-prefixed paths (`/\attacker.com`). When rendered in `<a href>` or passed to `window.open`, the browser treats these as cross-origin navigation, creating open redirect and phishing risks.
**Learning:** Checking for relative paths with simple leading `/` checks fails to account for protocol-relative paths (`//`) or backslash-escaped delimiters (`/\`) parsed by browsers as protocol-relative URLs.
**Prevention:** Reject paths matching `/^\/[/\\]/` before permitting relative path prefixes, ensuring all relative links are strictly internal paths (`/path` where the second character is not another slash or backslash).
