# Frontend to Live Database Mismatches Audit

This document summarizes the mismatches between the frontend implementation (in `src/components/Community`, `src/features/community`, `src/features/groups`, and related hooks/services) and the live Supabase database schema defined in `docs/live-schema.json` (along with migration `20261021000001_community_minimal_fix.sql`).

---

## 1. Mismatches List

### Help Forum & Posts (`src/components/Community/HelpForum.jsx`, `ForumPostDetail.jsx`, `AskQuestionModal.jsx`)
- **`src/components/Community/HelpForum.jsx:85`**:
  - **Code uses**: `supabase.from("community_profiles")`
  - **Database has**: No `community_profiles` table. User profiles are retrieved via `supabase.rpc("get_public_profile", { p_user_id })` or `profiles` table.
- **`src/components/Community/ForumPostDetail.jsx:96,128`**:
  - **Code uses**: `supabase.from("community_profiles")`
  - **Database has**: No `community_profiles` table.
- **`src/components/Community/ForumPostDetail.jsx:215-225`**:
  - **Code uses**: `supabase.from("forum_votes").insert({ post_id / answer_id, vote_type })`
  - **Database has**: `forum_votes` table has schema `(user_id, target_type, target_id, created_at)`. No `id`, `vote_type`, `post_id`, or `answer_id` columns.
- **`src/components/Community/ForumPostDetail.jsx:250`**:
  - **Code uses**: `forum_answers` insert payload with `content` column.
  - **Database has**: `forum_answers` uses column `body` (not `content`).
- **`src/components/Community/ForumPostDetail.jsx:279`**:
  - **Code uses**: `supabase.rpc("accept_forum_answer", { post_id, answer_id })`
  - **Database has**: RPC signature is `accept_forum_answer(p_answer_id uuid)`.
- **`src/components/Community/ForumPostDetail.jsx:75`**:
  - **Code uses**: `supabase.rpc("increment_post_views", { p_post_id })`
  - **Database has**: `increment_post_views(p_post_id uuid)`. Arg name matches `p_post_id`.
- **`src/components/Community/AskQuestionModal.jsx:60`**:
  - **Code uses**: `forum_posts` insert payload with `content` column.
  - **Database has**: `forum_posts` uses column `body` (not `content`).

### Virtual Study Rooms & Lobby (`src/components/Community/VirtualStudyRoom.jsx`, `StudyRoomsLobby.jsx`, `SessionRoom.jsx`)
- **`src/components/Community/StudyRoomsLobby.jsx:77`**:
  - **Code uses**: `supabase.from("study_group_members")`
  - **Database has**: No `study_group_members` table in live schema.
- **`src/components/Community/StudyRoomsLobby.jsx:57`**:
  - **Code uses**: `supabase.rpc("list_study_rooms", { p_subject, p_group_id })`
  - **Database has**: Returns `jsonb` array of room objects.
- **`src/components/Community/VirtualStudyRoom.jsx:94`**:
  - **Code uses**: `supabase.rpc("get_room_roster", { p_room_id })`
  - **Database has**: Returns `jsonb` array of participant objects.
- **`src/components/Community/VirtualStudyRoom.jsx:147`**:
  - **Code uses**: `supabase.rpc("join_study_room", { p_room_id, p_goal })`
  - **Database has**: RPC signature is `join_study_room(p_room_id uuid, p_goal text) -> jsonb`.
- **`src/components/Community/VirtualStudyRoom.jsx:338`**:
  - **Code uses**: `supabase.rpc("advance_room_phase", { p_room_id })`
  - **Database has**: Returns `jsonb`.
- **`src/components/Community/VirtualStudyRoom.jsx:357`**:
  - **Code uses**: `supabase.rpc("set_room_phase", { p_room_id, p_phase })`
  - **Database has**: RPC signature is `set_room_phase(p_room_id uuid, p_phase text) -> jsonb`.

### Peer Tutors (`src/components/Community/PeerTutors.jsx`)
- **`src/components/Community/PeerTutors.jsx:71,91`**:
  - **Code uses**: `supabase.rpc("find_peer_matches", { p_mode, p_subject, p_limit })`
  - **Database has**: Returns `jsonb`.
- **`src/components/Community/PeerTutors.jsx:127`**:
  - **Code uses**: `supabase.from("community_profiles")`
  - **Database has**: No `community_profiles` table.
- **`src/components/Community/PeerTutors.jsx:179`**:
  - **Code uses**: `supabase.rpc("request_tutor", { p_tutor_id, p_subject, p_topic, p_message })`
  - **Database has**: Returns `uuid` of created match_request.
- **`src/components/Community/PeerTutors.jsx:205`**:
  - **Code uses**: `supabase.from("friendships")`
  - **Database has**: No `friendships` table in live schema.
- **`src/components/Community/PeerTutors.jsx:228`**:
  - **Code uses**: `supabase.rpc("respond_match_request", { p_request_id, p_accept })`
  - **Database has**: Signature is `respond_match_request(p_request_id uuid, p_accept boolean) -> jsonb`.
- **`src/components/Community/PeerTutors.jsx:265`**:
  - **Code uses**: `supabase.rpc("complete_match_request", { p_request_id, p_rating, p_feedback })`
  - **Database has**: Signature is `complete_match_request(p_request_id uuid, p_rating integer, p_feedback text) -> void`.

### Messages & Chat (`src/components/Community/ChatInbox.jsx`, `ChatThread.jsx`, `src/lib/communityChat.js`)
- **`src/components/Community/ChatInbox.jsx:69, ChatThread.jsx:288,330`**:
  - **Code uses**: `supabase.from("community_profiles")`
  - **Database has**: No `community_profiles` table.
- **`src/components/Community/ChatInbox.jsx:94, ChatThread.jsx:299`**:
  - **Code uses**: `supabase.from("study_groups")`
  - **Database has**: No `study_groups` table in live schema.
- **`src/components/Community/ChatInbox.jsx:139, ResourceCard.jsx:85, ResourcePicker.jsx:35`**:
  - **Code uses**: `supabase.from("session_resources")`
  - **Database has**: `messages` links to `resource_id uuid` referencing the `resources` table. No `session_resources` table in live schema.
- **`src/components/Community/ChatThread.jsx:353,412,559,591,629`**:
  - **Code uses**: `messages` with `attachment_url`, `attachment_type`, `updated_at`, `is_edited`
  - **Database has**: `messages` columns are `(id, conversation_id, sender_id, content, resource_id, created_at)`. No attachments or editing columns.
- **`src/lib/communityChat.js:169`**:
  - **Code uses**: `supabase.from("resources")`
  - **Database has**: `resources` table exists in base schema (used for message attachments via `resource_id`).

### Notifications & In-App Notifications (`src/hooks/useInAppNotifications.js`)
- **`src/hooks/useInAppNotifications.js:28`**:
  - **Code uses**: `supabase.from("community_profiles")`
  - **Database has**: No `community_profiles` table.
- **`src/hooks/useInAppNotifications.js:55,140,155`**:
  - **Code uses**: `in_app_notifications` with `title`, `message`, `data`, `read`
  - **Database has**: `in_app_notifications` schema is `(id, user_id, type, actor_id, payload jsonb, is_read boolean, created_at)`. No `title`, `message`, `data`, or `read` columns.

### Friendships & Friends Service (`src/features/community/services/friendsService.js`, `FriendPicker.jsx`, `UserProfilePage.jsx`)
- **`src/features/community/services/friendsService.js:10,75,93,110`**:
  - **Code uses**: `supabase.from("friendships")`
  - **Database has**: No `friendships` table in live schema. Friend relationships are handled or derived via RPCs/matches or pending backend.

### Groups & Group API (`src/features/groups/groupsApi.js`, `src/features/community/services/groupsService.js`, `useCombinedSessions.js`)
- **`src/features/groups/groupsApi.js:4,29,38,48,57,67,76,87,98,108`**:
  - **Code uses**: `get_explore_groups`, `get_group_overview`, `request_to_join_group`, `cancel_join_request`, `decide_join_request`, `leave_group`, `remove_group_member`, `set_group_member_role`, `transfer_group_ownership`, `update_group_privacy`
  - **Database has**: These group RPCs are NOT in `docs/live-schema.json`. Live DB has `is_group_admin` and `is_group_member` RPCs, and tables `group_study_sessions` and `group_study_session_participants`.
- **`src/features/community/services/groupsService.js:22,37,83,99`**:
  - **Code uses**: `supabase.from("study_groups")`, `supabase.from("study_group_members")`
  - **Database has**: No `study_groups` or `study_group_members` tables in live schema.

### Leaderboard (`src/features/community/services/leaderboardService.js`, `src/hooks/useLeaderboard.js`)
- **`src/features/community/services/leaderboardService.js:13`, `src/hooks/useLeaderboard.js:49`**:
  - **Code uses**: `supabase.rpc("get_leaderboard", ...)`
  - **Database has**: `get_leaderboard` RPC is missing from live schema.

### User Profiles (`src/components/Community/UserProfilePage.jsx`, `ChooseUsernameCard.jsx`)
- **`src/components/Community/UserProfilePage.jsx:60`**:
  - **Code uses**: `supabase.rpc("get_public_profile", { p_user_id })`
  - **Database has**: RPC `get_public_profile(p_user_id uuid) -> jsonb`.
- **`src/components/Community/ChooseUsernameCard.jsx:50`**:
  - **Code uses**: `supabase.from("profiles")`
  - **Database has**: Base schema `profiles` table.

---

## 2. NEEDS BACKEND

The following features/functionalities present in the frontend UI are missing corresponding tables, RPCs, or columns in the live database schema:

1. **Friendships Table / Direct Friend Management**:
   - Needed: `friendships` table (e.g. `id, requester_id, addressee_id, status, created_at, updated_at`) or RPCs to manage direct user friend requests and acceptances.
2. **Leaderboard RPC**:
   - Needed: `get_leaderboard(p_period text, p_scope text, p_metric text, p_group_id uuid, p_limit integer)` returning user rankings/XP/streak leaderboards.
3. **Study Groups CRUD & Membership RPCs**:
   - Needed: `study_groups` table, `study_group_members` table, and RPCs: `get_explore_groups`, `get_group_overview`, `request_to_join_group`, `cancel_join_request`, `decide_join_request`, `leave_group`, `remove_group_member`, `set_group_member_role`, `transfer_group_ownership`, `update_group_privacy`.
4. **Message Attachments & Message Editing**:
   - Needed: `attachment_url` and `attachment_type` columns on `messages` table, or dedicated attachment metadata JSONB column; `updated_at` / `is_edited` columns on `messages` table.
5. **Forum Upvote / Downvote Direction & Unvoting**:
   - Needed: `vote_type` column (or integer direction `-1` / `+1`) on `forum_votes` table (live schema `forum_votes` is a binary bookmark/like table: `user_id, target_type, target_id, created_at`).
6. **Notification Display Fields**:
   - Needed: Frontend adapts to `in_app_notifications` `payload jsonb` for title/message formatting, but if standard title/message columns are expected by external notification services, backend support for enriched payload structure is required.
