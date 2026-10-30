## 2025-10-30 - Edge Function RFC 6750 Authorization Bearer Token Extraction
**Vulnerability:** Strict string replacement `authHeader.replace("Bearer ", "")` in Edge Functions failed to extract JWT tokens when clients transmitted case variations (e.g. `bearer`, `BEARER`) or irregular whitespace padding, causing authentication failures or invalid token parsing.
**Learning:** RFC 6750 allows case-insensitive Bearer scheme prefixes. Using exact string replacement leaves scheme prefixes intact or introduces space padding when evaluating `supabase.auth.getUser(token)`.
**Prevention:** Use case-insensitive regex pattern `authHeader.replace(/^Bearer\s+/i, "").trim()` across all Edge Functions receiving Authorization headers.

## 2025-10-01 - Edge Function Authorization and Metadata User ID Verification
**Vulnerability:** Edge Functions that execute elevated operations via `SUPABASE_SERVICE_ROLE_KEY` (such as payment or subscription fulfillment) did not check the `Authorization` header or verify that the calling user matched the transaction's target `user_id`.
**Learning:** Service role client invocations bypass Row Level Security (RLS). Any Edge Function performing write actions with service role credentials must explicitly validate the caller's JWT with `supabaseUserClient.auth.getUser()` and verify that `user.id` matches the domain object/metadata ownership before processing.
**Prevention:** Always extract `Authorization` header, validate `auth.getUser()`, and assert `user.id === targetUserId` in Edge Functions using service role keys.
