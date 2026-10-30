# Huddle's Journal - Community System

## 2025-10-16 - Community System Architecture & Activity Feed Major Win
**Learning:** The Community system previously scattered groups API logic in `src/features/groups/`, leaderboard in `src/hooks/useLeaderboard.js` and `src/components/Community/LeaderboardTab.jsx`, and friendship handling directly inside `src/components/Community/community.jsx`. Activity feed (`activity_events`) was entirely missing from both the database schema and UI.
**Action:** Restructure Community under `src/features/community/` with modular components, hooks, services, types, and constants. Create `activity_events` database schema with RLS and triggers, and build the Activity Feed system end-to-end as the Major Win.

## 2025-10-17 - Modular Community Refactoring & Safety Reporting Major Win
**Learning:** Monolithic tab views like `LeaderboardTab` and `community.jsx` re-implemented inline state and direct PostgREST calls for friends, search, and rankings, bypassing services and leading to inconsistent payload handling (e.g., `data.my_rank` vs `data.me`). Additionally, safety reporting for community content was missing.
**Action:** Restructure Community components into `src/features/community/` (`leaderboard/`, `friends/`, `groups/`, `shared/`), unify data fetching via `leaderboardService`, `friendsService`, `groupsService`, and `reportsService`, and implement the `community_reports` database migration and `ReportDialog` component.

## 2025-10-18 - Community Audit & Leaderboard Experience Major Win
**Learning:** The single-source-of-truth RPC `get_leaderboard` calculates server-enforced XP, study hours, and streak rankings securely without allowing client-side rating manipulation. Ensuring minimum 44px touch targets on podium cards and list items guarantees accessible mobile interaction across all density viewports.
**Action:** Audit all seven layers of Community. Confirm zero client-side write access for XP/leaderboards and verify RLS policies across all tables (`profiles`, `friendships`, `study_groups`, `activity_events`, `community_reports`). Enhance touch targets and ARIA labels across leaderboard podium and table components.

## 2025-10-19 - Group Lifecycle Extraction & Community Resiliency Audit
**Learning:** Monolithic files like `community.jsx` previously mixed container routing with complex multi-tab modal states (group details, member role management, join request decisions, settings forms, danger zones). Decoupling these into dedicated sub-components (`GroupDetail.jsx`, `MemberList.jsx`) under `src/features/community/components/groups/` maintains a clean, maintainable architecture aligned with target structure guidelines.
**Action:** Audit all seven layers of Community. Extract group detail lifecycle views into modular components, clean up dead variables across community files, and verify resilience states with loading skeletons and empty feedback.

## 2025-10-20 - Community Leaderboard Podium Elevation & Accessibility Audit
**Learning:** Podium cards on the study leaderboard require clear visual hierarchy and distinct podium styling (1st, 2nd, 3rd) along with accessible touch targets (min-h-[44px]), keyboard navigation, ARIA labels, and sticky "Your Rank" status cards for users placed outside the top ranks.
**Action:** Rebuild LeaderboardPodium, LeaderboardTable, YourRankCard, and LeaderboardTab with design tokens, level tags, rank badges, keyboard interactions, and responsive dark/light mode themes.

## 2025-10-21 - Persistent Social Cheers & Structural Encapsulation
**Learning:** Ephemeral client-only state for activity feed reactions meant social cheers reset on page reload and failed to propagate across user sessions. Encapsulating all group management mutations in `groupsService.js` and creating a database-backed `activity_cheers` table with unique user constraints and $O(1)$ batch query fetching enables persistent, scalable social engagement in the activity feed.
**Action:** Action: Audit all seven layers of Community. Encapsulate direct PostgREST calls inside `groupsService.js`, add `activity_cheers` database migration with RLS, update `feedService` and `useActivityFeed` for batch cheer fetching and optimistic toggling with error rollback, and ship interactive social cheers on the Activity Feed as the Major Win.

## 2025-10-22 - Full Friends Connection Lifecycle & Community Feature Consolidation
**Learning:** Scratched/scattered feature modules like `src/features/groups/` leak domain logic across feature boundaries. Consolidating groups sub-hooks and RPC APIs into `src/features/community/` ensures a single cohesive Community feature module. In addition, user search in `UserSearch.jsx` previously misidentified incoming friend requests as non-friends, attempting invalid reverse requests. Differentiating all 4 friendship states (Friends, Request Sent, Accept/Decline Incoming Request, Add Friend) with instant in-memory search state updates completes the social connection flow.
**Action:** Consolidate `src/features/groups/` into `src/features/community/`, add database migration `20250529000000_community_integrity_and_views.sql` for symmetric friendship pair uniqueness and `community_profiles` view, overhaul `UserSearch.jsx` and `useFriends.js` with complete incoming/outgoing friend request actions, and add unit tests in `test/friendsUtils.test.js`.

## 2025-10-23 - Leaderboard Empty State Motivation & Application Lint Audit
**Learning:** When leaderboards or group filters have zero activity recorded or when a user has not joined any study groups, generic empty states ("No items found") cause friction. Providing specific guidance with positive student motivation copy ("Complete a 15-minute study session to claim your place on the board!") and direct navigation links to explore study groups encourages daily student engagement and retention.
**Action:** Audit all seven layers of Community. Fix unused variable lint errors across `community.jsx`, `StudyTrendChart.jsx`, `PlannerActivityModal.jsx`, `PracticeQuestions.jsx`, `NodeDetailSheet.jsx`, `RoadmapNode.jsx`, and `levelMilestones.js`. Enhance `LeaderboardTab.jsx` with contextual zero-activity and unjoined group empty states and direct group discovery actions.

## 2025-10-28 - Leaderboard Dense Ranking & Zero-Activity Exclusion Major Win
**Learning:** The `get_leaderboard` RPC function included `profile_created_at` and `user_id` inside `dense_rank(order by ...)`, preventing true tie-handling and assigning distinct rank numbers (e.g. #1 and #2) to users with identical scores. Additionally, period-based leaderboards included zero-activity users, crowning 0 XP users on weekly/monthly podiums.
**Action:** Create migration `20250602000000_leaderboard_dense_rank_fix.sql` updating `get_leaderboard` to apply `dense_rank() over (order by metric_value desc)` for true tie-handling and filter out zero-activity users (`metric_value > 0`) for period leaderboards. Update `LeaderboardPodium.jsx`, `LeaderboardTable.jsx`, and `YourRankCard.jsx` to render rank change badges (▲▼) and `#—` unranked states. Export `friendsUtils` from `src/features/community/index.ts` and add unit tests in `test/leaderboard.test.js`.

## 2025-10-30 - Friends System Major Win & Safety Alignment
**Learning:** Community v1 scope strictly prohibits direct messaging between users. Providing interactive social connection statistics (Total Friends, Average Level, Active Learners), in-list instant search filtering, and study status indicators in `FriendList.jsx` while removing direct message triggers aligns the Friends tab with safety guidelines and provides an engaging social dashboard.
**Action:** Rebuild `FriendList.jsx` with social stats header badges, instant search filtering, level badges, and study status indicators. Add `computeFriendStats` and `filterFriendsList` helpers in `friendsUtils.js`, update `community.jsx` to remove direct messaging triggers, and add unit tests in `test/friendsUtils.test.js`.
