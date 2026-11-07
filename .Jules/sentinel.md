## 2025-10-15 - Protocol-Relative URL Open Redirects and Scheme-Relative Sanitization
**Vulnerability:** Client-side URL sanitization in `sanitizeUrl` permitted paths beginning with `/`, which allowed protocol-relative URLs (`//evil.com`) and backslash-prefixed paths (`/\evil.com`) to pass validation.
**Learning:** Browsers treat URLs starting with `//` or `/\` as scheme-relative, resolving them to external origins under the current protocol (e.g. `https://evil.com`), bypassing origin restrictions in `<a href>` and `window.open` handlers.
**Prevention:** When validating relative URL paths in sanitizers, explicitly reject paths starting with double forward slashes or backslashes (`/^\/[/\\]/`) before checking for leading single slashes.

## 2025-10-01 - Edge Function Authorization and Metadata User ID Verification
**Vulnerability:** Edge Functions that execute elevated operations via `SUPABASE_SERVICE_ROLE_KEY` (such as payment or subscription fulfillment) did not check the `Authorization` header or verify that the calling user matched the transaction's target `user_id`.
**Learning:** Service role client invocations bypass Row Level Security (RLS). Any Edge Function performing write actions with service role credentials must explicitly validate the caller's JWT with `supabaseUserClient.auth.getUser()` and verify that `user.id` matches the domain object/metadata ownership before processing.
**Prevention:** Always extract `Authorization` header, validate `auth.getUser()`, and assert `user.id === targetUserId` in Edge Functions using service role keys.
