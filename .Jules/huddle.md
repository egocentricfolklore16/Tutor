# Huddle's Journal - Community System

## 2025-10-16 - Community System Architecture & Activity Feed Major Win
**Learning:** The Community system previously scattered groups API logic in `src/features/groups/`, leaderboard in `src/hooks/useLeaderboard.js` and `src/components/Community/LeaderboardTab.jsx`, and friendship handling directly inside `src/components/Community/community.jsx`. Activity feed (`activity_events`) was entirely missing from both the database schema and UI.
**Action:** Restructure Community under `src/features/community/` with modular components, hooks, services, types, and constants. Create `activity_events` database schema with RLS and triggers, and build the Activity Feed system end-to-end as the Major Win.
