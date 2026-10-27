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

## 2026-10-18 - Ledger Granularity & Feature Sub-directory Auditing
**Learning:** Re-auditing revealed 22 modular sub-components and service files in `src/features/` that had been grouped under parent modules in previous coverage ledgers. Auditing every individual `.jsx` and `.ts` file guarantees complete coverage tracking across component subtrees.
**Action:** Always enumerate nested directories programmatically when building the coverage ledger to prevent file omission.

## 2026-10-27 - Differentiating Fully-Backed Subsystems vs Isolated Component Stubs
**Learning:** Comprehensive auditing revealed that while main user feedback pathways (`FeedbackModal.jsx`, `lib/feedback.js`) are fully wired to Supabase feedback tables and RPCs, standalone dialog components (`FeedbackDialog.jsx`) still use `localStorage` trapping. Distinguishing module-level backing from isolated component stubs prevents declaring entire domains missing while accurately pinpointing remaining gaps.
**Action:** Inspect every component instance in a feature domain individually rather than inferring coverage from central service libraries alone.
