## 2026-11-02 - Protocol-Relative URL Open Redirects in URL Sanitization
**Vulnerability:** Frontend URL sanitization allowed relative paths starting with `/` without disallowing protocol-relative prefixes (`//` or `/\\`), permitting open redirect and phishing bypasses via links like `//attacker.com`.
**Learning:** Checking whether a URL begins with `/` to allow site-relative links inadvertently matches protocol-relative URLs (`//example.com`), which modern browsers evaluate as absolute network-path references inheriting the current page's scheme.
**Prevention:** In URL sanitizers that allow relative URLs, explicitly reject paths where the leading slash is followed by another slash or backslash (`/^\/[/\\]/`) before whitelisting relative routes.

## 2025-10-01 - Edge Function Authorization and Metadata User ID Verification
**Vulnerability:** Edge Functions that execute elevated operations via `SUPABASE_SERVICE_ROLE_KEY` (such as payment or subscription fulfillment) did not check the `Authorization` header or verify that the calling user matched the transaction's target `user_id`.
**Learning:** Service role client invocations bypass Row Level Security (RLS). Any Edge Function performing write actions with service role credentials must explicitly validate the caller's JWT with `supabaseUserClient.auth.getUser()` and verify that `user.id` matches the domain object/metadata ownership before processing.
**Prevention:** Always extract `Authorization` header, validate `auth.getUser()`, and assert `user.id === targetUserId` in Edge Functions using service role keys.
