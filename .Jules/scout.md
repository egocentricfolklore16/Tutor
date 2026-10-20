# Scout's Journal 🔭

## 2026-10-16 - Local Storage Trapping vs Server Telemetry
**Learning:** In frontend components like `FeedbackDialog.jsx`, user actions were designed with complete UI feedback loops (showing success messages) that saved input payloads exclusively into `localStorage` keys (`hyper-tutor-feedback`). Without inspecting the exact event handler, these look like functioning backend integrations.
**Action:** Always check the submit handler in dialog and feedback components to verify whether data is dispatched to Supabase or an Edge Function endpoint versus written to `localStorage`.

## 2026-10-16 - Client-Authoritative Gamification Inputs
**Learning:** `completeSession` in `src/lib/sessionService.js` passed `xp = 50, gems = 5` as client parameters to `awardUserRewards` / `award_user_rewards`. Client-side calculation of rewards allows unauthorized manipulation of XP points and gems.
**Action:** Ensure all reward calculations (XP, gems, level progress) are strictly calculated on the server inside Postgres SECURITY DEFINER RPCs based on immutable database session metrics.

## 2026-10-16 - Third-Party OAuth Token Expiration in Client Code
**Learning:** `ExternalCalendarSync.jsx` and `googleCalendarSync.js` fetched Google Calendar events using `session.provider_token` directly from client-side JS. Because provider access tokens expire after 60 minutes, direct client calls fail without refresh token handling.
**Action:** Delegate third-party OAuth calendar synchronization to a dedicated Edge Function proxy that manages token refreshes securely on the server.

## 2026-10-17 - Full Codebase Audit & Gap Tracking Verification
**Learning:** Verified all 160 frontend source files under `src/` against backend SQL schemas and Edge Functions. Confirmed that no new backend gap regressions were introduced across recent PR merges.
**Action:** Maintain running ledger index entries in `docs/backend-gaps/INDEX.md` and keep previous reports immutable for historical diff auditing.

## 2026-10-20 - Source File Inventory Index Verification
**Learning:** Expanded codebase inventory verification to 183 frontend source files under `src/`, including modularized gamification components (`src/features/gamification/`) and study group hooks (`src/features/groups/`). Confirmed 8 backend gap items (3 critical, 3 high, 2 medium) with exact evidence citations.
**Action:** Continue indexing newly added feature subdirectories into Appendix A coverage ledgers on subsequent Scout audit runs.
