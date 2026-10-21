# Backend Requirements Audit: Community Page

> **Notice:** This audit is based strictly on a static analysis of the repository's source code and database migrations in `supabase/` and `supabase/migrations/`. Live database state was not queried.

---

## 1. Audited Files

A total of **66 files** were audited across the application:

### Community Components (`src/components/Community/`)
1. `src/components/Community/community.jsx`
2. `src/components/Community/LeaderboardTab.jsx`
3. `src/components/Community/HelpForum.jsx`
4. `src/components/Community/ForumPostDetail.jsx`
5. `src/components/Community/AskQuestionModal.jsx`
6. `src/components/Community/ChatInbox.jsx`
7. `src/components/Community/ChatThread.jsx`
8. `src/components/Community/GroupStudySessions.jsx`
9. `src/components/Community/SessionRoom.jsx`
10. `src/components/Community/VirtualStudyRoom.jsx`
11. `src/components/Community/StudyRoomsLobby.jsx`
12. `src/components/Community/PeerTutors.jsx`
13. `src/components/Community/UserProfilePage.jsx`
14. `src/components/Community/ChooseUsernameCard.jsx`
15. `src/components/Community/FriendPicker.jsx`
16. `src/components/Community/RequestJoinModal.jsx`
17. `src/components/Community/ResourceCard.jsx`
18. `src/components/Community/ResourcePicker.jsx`
19. `src/components/Community/AchievementsPage.jsx`

### Modularized Community Feature (`src/features/community/`)
20. `src/features/community/index.ts`
21. `src/features/community/constants.ts`
22. `src/features/community/types.ts`
23. `src/features/community/utils/rankUtils.js`
24. `src/features/community/hooks/useLeaderboard.js`
25. `src/features/community/hooks/useActivityFeed.js`
26. `src/features/community/hooks/useFriends.js`
27. `src/features/community/hooks/useGroups.js`
28. `src/features/community/services/leaderboardService.js`
29. `src/features/community/services/feedService.js`
30. `src/features/community/services/friendsService.js`
31. `src/features/community/services/groupsService.js`
32. `src/features/community/services/reportsService.js`
33. `src/features/community/components/feed/ActivityFeed.jsx`
34. `src/features/community/components/feed/ActivityItem.jsx`
35. `src/features/community/components/feed/FeedFilters.jsx`
36. `src/features/community/components/friends/FriendList.jsx`
37. `src/features/community/components/friends/PendingRequests.jsx`
38. `src/features/community/components/friends/UserSearch.jsx`
39. `src/features/community/components/groups/CreateGroupModal.jsx`
40. `src/features/community/components/groups/GroupCard.jsx`
41. `src/features/community/components/groups/GroupDetail.jsx`
42. `src/features/community/components/groups/MemberList.jsx`
43. `src/features/community/components/leaderboard/LeaderboardPodium.jsx`
44. `src/features/community/components/leaderboard/LeaderboardTable.jsx`
45. `src/features/community/components/leaderboard/MetricTabs.jsx`
46. `src/features/community/components/leaderboard/PeriodTabs.jsx`
47. `src/features/community/components/leaderboard/ScopeTabs.jsx`
48. `src/features/community/components/leaderboard/YourRankCard.jsx`
49. `src/features/community/components/shared/EmptyState.jsx`
50. `src/features/community/components/shared/ErrorState.jsx`
51. `src/features/community/components/shared/ReportDialog.jsx`
52. `src/features/community/components/shared/SkeletonList.jsx`

### Study Groups Feature (`src/features/groups/`)
53. `src/features/groups/groupsApi.js`
54. `src/features/groups/useExploreGroups.js`
55. `src/features/groups/useGroupActions.js`
56. `src/features/groups/useGroupOverview.js`
57. `src/features/groups/useMyGroups.js`

### Shared Hooks & Libs (`src/hooks/` & `src/lib/`)
58. `src/hooks/useLeaderboard.js`
59. `src/hooks/useInAppNotifications.js`
60. `src/hooks/useCombinedSessions.js`
61. `src/lib/communityChat.js`
62. `src/lib/leaderboardUtils.js`

### Related Dashboard & Notification Components
63. `src/components/Dashboard/CommunitySpotlight.jsx`
64. `src/components/Dashboard/Leaderboard.jsx`
65. `src/components/Notifications/NotificationCenter.jsx`
66. `src/components/Notifications/NotificationsPage.jsx`

---

## 2. Summary Table

| Table / View / Function | Status | Missing Columns / Key Issues |
| :--- | :--- | :--- |
| `activity_events` | **EXISTS** | None missing in schema. The runtime error (`column activity_events.actor_id does not exist`) occurs when migration `20250526000000_activity_feed_and_community.sql` has not been applied to the target database instance. |
| `activity_cheers` | **EXISTS** | None. Defined in `20250528000000_activity_cheers.sql`. |
| `community_profiles` | **MISSING** | **View or Table MISSING**. Frontend queries `.from("community_profiles")` extensively (21 references), but it is nowhere created in migrations. (Migrations define `profiles` table). |
| `friendships` | **EXISTS** | None missing. Defined in `20250523000000_leaderboard.sql`. |
| `study_groups` | **EXISTS** | None missing. Defined in `20250525000000_study_groups_restructure.sql`. |
| `study_group_members` | **EXISTS** | None missing. Defined in `20250525000000_study_groups_restructure.sql`. |
| `study_group_join_requests` | **EXISTS** | None missing. Defined in `20250525000000_study_groups_restructure.sql`. |
| `study_group_bans` | **EXISTS** | Defined in `20250525000000_study_groups_restructure.sql`. |
| `conversations` | **MISSING** | Table **MISSING**. Referenced in `groupsService.js`, `ChatInbox.jsx`, `ChatThread.jsx`, `SessionRoom.jsx`. |
| `conversation_participants` | **MISSING** | Table **MISSING**. Referenced in `ChatInbox.jsx`, `ChatThread.jsx`. |
| `conversation_mutes` | **MISSING** | Table **MISSING**. Referenced in `ChatThread.jsx`. |
| `messages` | **MISSING** | Table **MISSING**. Referenced in `ChatInbox.jsx`, `ChatThread.jsx`, `VirtualStudyRoom.jsx`. |
| `message_reports` | **MISSING** | Table **MISSING**. Referenced in `ChatThread.jsx`. |
| `group_study_sessions` | **MISSING** | Table **MISSING**. Referenced in `GroupStudySessions.jsx`, `SessionRoom.jsx`, `useCombinedSessions.js`. |
| `group_study_session_participants` | **MISSING** | Table **MISSING**. Referenced in `GroupStudySessions.jsx`, `SessionRoom.jsx`, `useCombinedSessions.js`. |
| `forum_posts` | **MISSING** | Table **MISSING**. Referenced in `HelpForum.jsx`, `ForumPostDetail.jsx`, `AskQuestionModal.jsx`. |
| `forum_answers` | **MISSING** | Table **MISSING**. Referenced in `ForumPostDetail.jsx`. |
| `forum_votes` | **MISSING** | Table **MISSING**. Referenced in `ForumPostDetail.jsx`. |
| `forum_reports` | **MISSING** | Table **MISSING**. Referenced in `ForumPostDetail.jsx`. |
| `peer_tutor_profiles` | **MISSING** | Table **MISSING**. Referenced in `PeerTutors.jsx`, `UserProfilePage.jsx`. |
| `match_requests` | **MISSING** | Table **MISSING**. Referenced in `PeerTutors.jsx`. |
| `study_rooms` | **MISSING** | Table **MISSING**. Referenced in `StudyRoomsLobby.jsx`, `VirtualStudyRoom.jsx`. |
| `community_reports` | **EXISTS** | Defined in `20250527000000_community_reports.sql`. |
| `in_app_notifications` | **EXISTS** | Defined in `20250524000000_chat_and_push_notifications.sql`. |
| `profiles` | **EXISTS** | Defined in `supabase/005_profiles.sql` & subsequent profile migrations. |
| `resources` | **EXISTS** | Defined in `supabase/003_study_tools.sql`. |
| `session_resources` | **EXISTS** | Defined in `supabase/003_study_tools.sql`. |
| `Study` | **EXISTS** | Personal study sessions table defined in `supabase/002_study_sessions.sql`. |

---

## 3. Per-Table Database Requirements

### 3.1 `activity_events`
- **Migration Status:** **EXISTS** (`supabase/migrations/20250526000000_activity_feed_and_community.sql`).
- **Explanation of Error:** The runtime error `column activity_events.actor_id does not exist` occurs when the migration `20250526000000_activity_feed_and_community.sql` has not been run against the target database.

#### Columns
| Column | Type | Nullable | Default | FK | Status | Referenced in File:Line |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | - | EXISTS | `feedService.js:13` |
| `actor_id` | `uuid` | No | - | `auth.users(id)` | EXISTS | `feedService.js:13`, `20250526000000_activity_feed_and_community.sql:6` |
| `type` | `text` | No | - | - | EXISTS | `feedService.js:13`, `ActivityItem.jsx:45` |
| `payload` | `jsonb` | No | `'{}'::jsonb` | - | EXISTS | `feedService.js:13`, `ActivityItem.jsx:52` |
| `visibility` | `text` | No | `'friends'` | - | EXISTS | `feedService.js:13`, `20250526000000_activity_feed_and_community.sql:9` |
| `group_id` | `uuid` | Yes | `null` | `study_groups(id)` | EXISTS | `feedService.js:13`, `20250526000000_activity_feed_and_community.sql:10` |
| `created_at` | `timestamptz` | No | `now()` | - | EXISTS | `feedService.js:13`, `ActivityItem.jsx:38` |

- **Allowed Enum Values:**
  - `type`: `'session_completed'`, `'streak_milestone'`, `'level_up'`, `'group_joined'`, `'achievement_unlocked'`
  - `visibility`: `'public'`, `'friends'`, `'group'`
- **Indexes:**
  - `idx_activity_events_actor_created`: `(actor_id, created_at desc)`
  - `idx_activity_events_created`: `(created_at desc)`
  - `idx_activity_events_group`: `(group_id, created_at desc) WHERE group_id IS NOT NULL`

---

### 3.2 `activity_cheers`
- **Migration Status:** **EXISTS** (`supabase/migrations/20250528000000_activity_cheers.sql`).

#### Columns
| Column | Type | Nullable | Default | FK | Status | Referenced in File:Line |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | - | EXISTS | `feedService.js:57` |
| `activity_id` | `uuid` | No | - | `activity_events(id) ON DELETE CASCADE` | EXISTS | `feedService.js:57,103,111,119` |
| `user_id` | `uuid` | No | - | `auth.users(id) ON DELETE CASCADE` | EXISTS | `feedService.js:57,103,111,119` |
| `created_at` | `timestamptz` | No | `now()` | - | EXISTS | `20250528000000_activity_cheers.sql:9` |

- **Unique Constraints:** `UNIQUE(activity_id, user_id)`
- **Indexes:**
  - `idx_activity_cheers_activity_id`: `(activity_id)`
  - `idx_activity_cheers_user_id`: `(user_id)`

---

### 3.3 `community_profiles`
- **Migration Status:** **MISSING**. The frontend queries `community_profiles` across 21 locations as a lightweight view or table, but no migration defines it.

#### Suggested Definition
`community_profiles` can be defined as a public view on `public.profiles`:
```sql
CREATE OR REPLACE VIEW public.community_profiles AS
SELECT
  user_id AS id,
  user_id,
  username,
  full_name,
  avatar_url,
  user_img,
  xp_points,
  level,
  primary_goal,
  education_level,
  settings_subject,
  subjects,
  current_topic,
  created_at
FROM public.profiles;
```

#### Columns Referenced in Code
| Column | Type | Nullable | Default | FK | Status | Referenced in File:Line |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | - | `auth.users(id)` | MISSING | `useInAppNotifications.js:28`, `ChatInbox.jsx:69`, `friendsService.js:27,56`, `feedService.js:42`, `GroupStudySessions.jsx:91`, `SessionRoom.jsx:70`, `VirtualStudyRoom.jsx:70`, `PeerTutors.jsx:127`, `UserProfilePage.jsx:69`, `FriendPicker.jsx:32` |
| `user_id` | `uuid` | No | - | `auth.users(id)` | MISSING | `types.ts:12`, `friendsService.js:27` |
| `username` | `text` | Yes | - | - | MISSING | `types.ts:13`, `ChatInbox.jsx:69`, `UserProfilePage.jsx:69` |
| `full_name` | `text` | Yes | - | - | MISSING | `types.ts:14`, `ChatInbox.jsx:69`, `UserProfilePage.jsx:69` |
| `avatar_url` | `text` | Yes | - | - | MISSING | `types.ts:15`, `ChatInbox.jsx:69`, `UserProfilePage.jsx:69` |
| `user_img` | `text` | Yes | - | - | MISSING | `types.ts:16`, `UserProfilePage.jsx:69` |
| `xp_points` | `integer` | No | `0` | - | MISSING | `types.ts:17`, `UserProfilePage.jsx:69` |
| `level` | `integer` | No | `1` | - | MISSING | `types.ts:18`, `UserProfilePage.jsx:69` |

---

### 3.4 `friendships`
- **Migration Status:** **EXISTS** (`supabase/migrations/20250523000000_leaderboard.sql`, `20250524000000_chat_and_push_notifications.sql`, `20250526000000_activity_feed_and_community.sql`).

#### Columns
| Column | Type | Nullable | Default | FK | Status | Referenced in File:Line |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | - | EXISTS | `friendsService.js:10,75,93,110`, `NotificationCenter.jsx:59` |
| `requester_id` | `uuid` | No | - | `auth.users(id) ON DELETE CASCADE` | EXISTS | `friendsService.js:10,75,93`, `UserProfilePage.jsx:103,147`, `PeerTutors.jsx:205`, `FriendPicker.jsx:19` |
| `addressee_id` | `uuid` | No | - | `auth.users(id) ON DELETE CASCADE` | EXISTS | `friendsService.js:10,75,93`, `UserProfilePage.jsx:103,147`, `PeerTutors.jsx:205`, `FriendPicker.jsx:19` |
| `status` | `text` | No | `'pending'` | - | EXISTS | `friendsService.js:10,75,93`, `UserProfilePage.jsx:103`, `FriendPicker.jsx:19` |
| `created_at` | `timestamptz` | No | `now()` | - | EXISTS | `friendsService.js:10,75,93` |
| `updated_at` | `timestamptz` | No | `now()` | - | EXISTS | `friendsService.js:93` |

- **Allowed Enum Values:**
  - `status`: `'pending'`, `'accepted'`, `'declined'`
- **Constraints:**
  - `UNIQUE(requester_id, addressee_id)`
  - `CHECK (requester_id != addressee_id)`

---

### 3.5 `study_groups`
- **Migration Status:** **EXISTS** (`supabase/migrations/20250525000000_study_groups_restructure.sql`).

#### Columns
| Column | Type | Nullable | Default | FK | Status | Referenced in File:Line |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | - | EXISTS | `groupsService.js:22,83,99`, `ChatInbox.jsx:94`, `useCombinedSessions.js:75`, `ChatThread.jsx:299` |
| `name` | `text` | No | - | - | EXISTS | `groupsService.js:22,83`, `CreateGroupModal.jsx:52`, `ChatInbox.jsx:94` |
| `description` | `text` | Yes | `null` | - | EXISTS | `groupsService.js:22,83` |
| `subject` | `text` | No | `'General'` | - | EXISTS | `groupsService.js:22,83` |
| `privacy` | `text` | No | `'public'` | - | EXISTS | `groupsService.js:22,83` |
| `avatar_url` | `text` | Yes | `null` | - | EXISTS | `groupsService.js:22,83` |
| `owner_id` | `uuid` | No | - | `auth.users(id) ON DELETE CASCADE` | EXISTS | `groupsService.js:22,83` |
| `created_at` | `timestamptz` | No | `now()` | - | EXISTS | `groupsService.js:22,83` |
| `updated_at` | `timestamptz` | No | `now()` | - | EXISTS | `groupsService.js:22,83` |

- **Allowed Enum Values:**
  - `privacy`: `'public'`, `'private'`, `'hidden'`

---

### 3.6 `study_group_members`
- **Migration Status:** **EXISTS** (`supabase/migrations/20250525000000_study_groups_restructure.sql`).

#### Columns
| Column | Type | Nullable | Default | FK | Status | Referenced in File:Line |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | - | EXISTS | `groupsService.js:37` |
| `group_id` | `uuid` | No | - | `study_groups(id) ON DELETE CASCADE` | EXISTS | `groupsService.js:37`, `groupsApi.js:19`, `useCombinedSessions.js:63`, `NotificationCenter.jsx:101`, `ChatThread.jsx:304`, `StudyRoomsLobby.jsx:77` |
| `user_id` | `uuid` | No | - | `auth.users(id) ON DELETE CASCADE` | EXISTS | `groupsService.js:37`, `groupsApi.js:19`, `useCombinedSessions.js:63`, `NotificationCenter.jsx:101`, `ChatThread.jsx:304`, `StudyRoomsLobby.jsx:77` |
| `role` | `text` | No | `'member'` | - | EXISTS | `groupsService.js:37`, `groupsApi.js:19` |
| `joined_at` | `timestamptz` | No | `now()` | - | EXISTS | `groupsService.js:37` |

- **Allowed Enum Values:**
  - `role`: `'owner'`, `'admin'`, `'member'`

---

### 3.7 `study_group_join_requests`
- **Migration Status:** **EXISTS** (`supabase/migrations/20250525000000_study_groups_restructure.sql`).

#### Columns
| Column | Type | Nullable | Default | FK | Status | Referenced in File:Line |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | - | EXISTS | `NotificationCenter.jsx:108` |
| `group_id` | `uuid` | No | - | `study_groups(id) ON DELETE CASCADE` | EXISTS | `NotificationCenter.jsx:108` |
| `user_id` | `uuid` | No | - | `auth.users(id) ON DELETE CASCADE` | EXISTS | `NotificationCenter.jsx:108` |
| `message` | `text` | Yes | `null` | - | EXISTS | `20250525000000_study_groups_restructure.sql:50` |
| `status` | `text` | No | `'pending'` | - | EXISTS | `NotificationCenter.jsx:108` |
| `created_at` | `timestamptz` | No | `now()` | - | EXISTS | `NotificationCenter.jsx:108` |

- **Allowed Enum Values:**
  - `status`: `'pending'`, `'accepted'`, `'declined'`, `'cancelled'`

---

### 3.8 `study_group_bans`
- **Migration Status:** **EXISTS** (`supabase/migrations/20250525000000_study_groups_restructure.sql`).

#### Columns
| Column | Type | Nullable | Default | FK | Status | Referenced in File:Line |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `group_id` | `uuid` | No | - | `study_groups(id) ON DELETE CASCADE` | EXISTS | `20250525000000_study_groups_restructure.sql:71` |
| `user_id` | `uuid` | No | - | `auth.users(id) ON DELETE CASCADE` | EXISTS | `20250525000000_study_groups_restructure.sql:72` |
| `banned_by` | `uuid` | No | - | `auth.users(id)` | EXISTS | `20250525000000_study_groups_restructure.sql:73` |
| `created_at` | `timestamptz` | No | `now()` | - | EXISTS | `20250525000000_study_groups_restructure.sql:74` |

---

### 3.9 `conversations`
- **Migration Status:** **MISSING**.

#### Columns
| Column | Type | Nullable | Default | FK | Status | Referenced in File:Line |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | - | MISSING | `ChatInbox.jsx:41`, `ChatThread.jsx:268`, `groupsService.js:43`, `SessionRoom.jsx:49` |
| `type` | `text` | No | - | - | MISSING | `groupsService.js:43`, `ChatInbox.jsx:41`, `ChatThread.jsx:268` |
| `study_group_id` | `uuid` | Yes | `null` | `study_groups(id) ON DELETE CASCADE` | MISSING | `groupsService.js:43`, `ChatThread.jsx:268`, `SessionRoom.jsx:49` |
| `created_at` | `timestamptz` | No | `now()` | - | MISSING | `ChatInbox.jsx:41`, `groupsService.js:43` |
| `updated_at` | `timestamptz` | No | `now()` | - | MISSING | `ChatInbox.jsx:41`, `groupsService.js:43` |

- **Allowed Enum Values:**
  - `type`: `'direct'`, `'group'`, `'room'`

---

### 3.10 `conversation_participants`
- **Migration Status:** **MISSING**.

#### Columns
| Column | Type | Nullable | Default | FK | Status | Referenced in File:Line |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | - | MISSING | `ChatInbox.jsx:21,55` |
| `conversation_id` | `uuid` | No | - | `conversations(id) ON DELETE CASCADE` | MISSING | `ChatInbox.jsx:21,55`, `ChatThread.jsx:178` |
| `user_id` | `uuid` | No | - | `auth.users(id) ON DELETE CASCADE` | MISSING | `ChatInbox.jsx:21,55`, `ChatThread.jsx:178` |
| `last_read_at` | `timestamptz` | Yes | `now()` | - | MISSING | `ChatInbox.jsx:55`, `ChatThread.jsx:178` |
| `joined_at` | `timestamptz` | No | `now()` | - | MISSING | `ChatInbox.jsx:21` |

- **Constraints:** `UNIQUE(conversation_id, user_id)`

---

### 3.11 `conversation_mutes`
- **Migration Status:** **MISSING**.

#### Columns
| Column | Type | Nullable | Default | FK | Status | Referenced in File:Line |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | - | MISSING | `ChatThread.jsx:104,133,160` |
| `conversation_id` | `uuid` | No | - | `conversations(id) ON DELETE CASCADE` | MISSING | `ChatThread.jsx:104,133,160` |
| `user_id` | `uuid` | No | - | `auth.users(id) ON DELETE CASCADE` | MISSING | `ChatThread.jsx:104,133,160` |
| `muted_until` | `timestamptz` | Yes | `null` | - | MISSING | `ChatThread.jsx:104,133,160` |
| `created_at` | `timestamptz` | No | `now()` | - | MISSING | `ChatThread.jsx:104` |

- **Constraints:** `UNIQUE(conversation_id, user_id)`

---

### 3.12 `messages`
- **Migration Status:** **MISSING**.

#### Columns
| Column | Type | Nullable | Default | FK | Status | Referenced in File:Line |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | - | MISSING | `ChatInbox.jsx:108`, `ChatThread.jsx:353,412,559,591,629`, `VirtualStudyRoom.jsx:900` |
| `conversation_id` | `uuid` | No | - | `conversations(id) ON DELETE CASCADE` | MISSING | `ChatInbox.jsx:108`, `ChatThread.jsx:353,412,559,591,629`, `VirtualStudyRoom.jsx:900` |
| `sender_id` | `uuid` | No | - | `auth.users(id) ON DELETE CASCADE` | MISSING | `ChatThread.jsx:353,559,591`, `VirtualStudyRoom.jsx:900` |
| `content` | `text` | No | - | - | MISSING | `ChatInbox.jsx:108`, `ChatThread.jsx:353,559`, `VirtualStudyRoom.jsx:900` |
| `attachment_url` | `text` | Yes | `null` | - | MISSING | `ChatThread.jsx:353,559` |
| `attachment_type` | `text` | Yes | `null` | - | MISSING | `ChatThread.jsx:353,559` |
| `resource_id` | `uuid` | Yes | `null` | `session_resources(id) ON DELETE SET NULL` | MISSING | `ChatThread.jsx:353,559` |
| `created_at` | `timestamptz` | No | `now()` | - | MISSING | `ChatInbox.jsx:108`, `ChatThread.jsx:353,412,559`, `VirtualStudyRoom.jsx:900` |
| `updated_at` | `timestamptz` | No | `now()` | - | MISSING | `ChatThread.jsx:591` |

---

### 3.13 `message_reports`
- **Migration Status:** **MISSING**.

#### Columns
| Column | Type | Nullable | Default | FK | Status | Referenced in File:Line |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | - | MISSING | `ChatThread.jsx:649` |
| `message_id` | `uuid` | No | - | `messages(id) ON DELETE CASCADE` | MISSING | `ChatThread.jsx:649` |
| `reporter_id` | `uuid` | No | - | `auth.users(id) ON DELETE CASCADE` | MISSING | `ChatThread.jsx:649` |
| `reason` | `text` | No | - | - | MISSING | `ChatThread.jsx:649` |
| `created_at` | `timestamptz` | No | `now()` | - | MISSING | `ChatThread.jsx:649` |

---

### 3.14 `group_study_sessions`
- **Migration Status:** **MISSING**.

#### Columns
| Column | Type | Nullable | Default | FK | Status | Referenced in File:Line |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | - | MISSING | `GroupStudySessions.jsx:62,122`, `SessionRoom.jsx:37,168`, `useCombinedSessions.js:86` |
| `group_id` | `uuid` | No | - | `study_groups(id) ON DELETE CASCADE` | MISSING | `GroupStudySessions.jsx:62,122`, `SessionRoom.jsx:37`, `useCombinedSessions.js:86` |
| `creator_id` | `uuid` | No | - | `auth.users(id) ON DELETE CASCADE` | MISSING | `GroupStudySessions.jsx:62,122` |
| `title` | `text` | No | - | - | MISSING | `GroupStudySessions.jsx:62,122`, `SessionRoom.jsx:37`, `useCombinedSessions.js:86` |
| `description` | `text` | Yes | `null` | - | MISSING | `GroupStudySessions.jsx:62,122`, `SessionRoom.jsx:37` |
| `subject` | `text` | No | `'General'` | - | MISSING | `GroupStudySessions.jsx:62,122`, `SessionRoom.jsx:37`, `useCombinedSessions.js:86` |
| `scheduled_start` | `timestamptz` | No | - | - | MISSING | `GroupStudySessions.jsx:62,122`, `SessionRoom.jsx:37`, `useCombinedSessions.js:86` |
| `duration_minutes` | `integer` | No | `60` | - | MISSING | `GroupStudySessions.jsx:62,122`, `SessionRoom.jsx:37`, `useCombinedSessions.js:86` |
| `status` | `text` | No | `'scheduled'` | - | MISSING | `GroupStudySessions.jsx:62,122`, `SessionRoom.jsx:37,168` |
| `created_at` | `timestamptz` | No | `now()` | - | MISSING | `GroupStudySessions.jsx:62` |

- **Allowed Enum Values:**
  - `status`: `'scheduled'`, `'live'`, `'completed'`, `'cancelled'`

---

### 3.15 `group_study_session_participants`
- **Migration Status:** **MISSING**.

#### Columns
| Column | Type | Nullable | Default | FK | Status | Referenced in File:Line |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | - | MISSING | `GroupStudySessions.jsx:75,139,163` |
| `session_id` | `uuid` | No | - | `group_study_sessions(id) ON DELETE CASCADE` | MISSING | `GroupStudySessions.jsx:75,139,163`, `SessionRoom.jsx:61`, `useCombinedSessions.js:96` |
| `user_id` | `uuid` | No | - | `auth.users(id) ON DELETE CASCADE` | MISSING | `GroupStudySessions.jsx:75,139,163`, `SessionRoom.jsx:61`, `useCombinedSessions.js:96` |
| `rsvp_status` | `text` | No | `'going'` | - | MISSING | `GroupStudySessions.jsx:75,139,163`, `SessionRoom.jsx:61`, `useCombinedSessions.js:96` |
| `joined_at` | `timestamptz` | No | `now()` | - | MISSING | `GroupStudySessions.jsx:75` |

- **Allowed Enum Values:**
  - `rsvp_status`: `'going'`, `'maybe'`, `'declined'`
- **Constraints:** `UNIQUE(session_id, user_id)`

---

### 3.16 `forum_posts`
- **Migration Status:** **MISSING**.

#### Columns
| Column | Type | Nullable | Default | FK | Status | Referenced in File:Line |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | - | MISSING | `HelpForum.jsx:42`, `ForumPostDetail.jsx:82,336,351`, `AskQuestionModal.jsx:60` |
| `author_id` | `uuid` | No | `auth.uid()` | `auth.users(id) ON DELETE CASCADE` | MISSING | `HelpForum.jsx:42,82`, `ForumPostDetail.jsx:82`, `AskQuestionModal.jsx:60` |
| `title` | `text` | No | - | - | MISSING | `HelpForum.jsx:42`, `ForumPostDetail.jsx:82`, `AskQuestionModal.jsx:60` |
| `content` | `text` | No | - | - | MISSING | `HelpForum.jsx:42`, `ForumPostDetail.jsx:82`, `AskQuestionModal.jsx:60` |
| `subject` | `text` | No | `'General'` | - | MISSING | `HelpForum.jsx:42`, `ForumPostDetail.jsx:82`, `AskQuestionModal.jsx:60` |
| `tags` | `text[]` | No | `'{}'` | - | MISSING | `HelpForum.jsx:42`, `ForumPostDetail.jsx:82`, `AskQuestionModal.jsx:60` |
| `views_count` | `integer` | No | `0` | - | MISSING | `HelpForum.jsx:42`, `ForumPostDetail.jsx:82` |
| `upvotes_count` | `integer` | No | `0` | - | MISSING | `HelpForum.jsx:42`, `ForumPostDetail.jsx:82` |
| `answers_count` | `integer` | No | `0` | - | MISSING | `HelpForum.jsx:42`, `ForumPostDetail.jsx:82` |
| `accepted_answer_id` | `uuid` | Yes | `null` | `forum_answers(id) ON DELETE SET NULL` | MISSING | `ForumPostDetail.jsx:82,279` |
| `is_resolved` | `boolean` | No | `false` | - | MISSING | `HelpForum.jsx:42`, `ForumPostDetail.jsx:82` |
| `created_at` | `timestamptz` | No | `now()` | - | MISSING | `HelpForum.jsx:42`, `ForumPostDetail.jsx:82`, `AskQuestionModal.jsx:60` |
| `updated_at` | `timestamptz` | No | `now()` | - | MISSING | `ForumPostDetail.jsx:82` |

---

### 3.17 `forum_answers`
- **Migration Status:** **MISSING**.

#### Columns
| Column | Type | Nullable | Default | FK | Status | Referenced in File:Line |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | - | MISSING | `ForumPostDetail.jsx:106,250` |
| `post_id` | `uuid` | No | - | `forum_posts(id) ON DELETE CASCADE` | MISSING | `ForumPostDetail.jsx:106,250` |
| `author_id` | `uuid` | No | `auth.uid()` | `auth.users(id) ON DELETE CASCADE` | MISSING | `ForumPostDetail.jsx:106,250` |
| `content` | `text` | No | - | - | MISSING | `ForumPostDetail.jsx:106,250` |
| `upvotes_count` | `integer` | No | `0` | - | MISSING | `ForumPostDetail.jsx:106` |
| `is_accepted` | `boolean` | No | `false` | - | MISSING | `ForumPostDetail.jsx:106,279` |
| `created_at` | `timestamptz` | No | `now()` | - | MISSING | `ForumPostDetail.jsx:106,250` |

---

### 3.18 `forum_votes`
- **Migration Status:** **MISSING**.

#### Columns
| Column | Type | Nullable | Default | FK | Status | Referenced in File:Line |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | - | MISSING | `ForumPostDetail.jsx:143,200,215` |
| `target_type` | `text` | No | - | - | MISSING | `ForumPostDetail.jsx:143,200,215` |
| `target_id` | `uuid` | No | - | - | MISSING | `ForumPostDetail.jsx:143,200,215` |
| `user_id` | `uuid` | No | `auth.uid()` | `auth.users(id) ON DELETE CASCADE` | MISSING | `ForumPostDetail.jsx:143,200,215` |
| `vote_type` | `integer` | No | `1` | - | MISSING | `ForumPostDetail.jsx:143,200,215` |
| `created_at` | `timestamptz` | No | `now()` | - | MISSING | `ForumPostDetail.jsx:143` |

- **Allowed Enum Values:**
  - `target_type`: `'post'`, `'answer'`
  - `vote_type`: `1` (upvote), `-1` (downvote)
- **Constraints:** `UNIQUE(target_type, target_id, user_id)`

---

### 3.19 `forum_reports`
- **Migration Status:** **MISSING**.

#### Columns
| Column | Type | Nullable | Default | FK | Status | Referenced in File:Line |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | - | MISSING | `ForumPostDetail.jsx:300` |
| `target_type` | `text` | No | - | - | MISSING | `ForumPostDetail.jsx:300` |
| `target_id` | `uuid` | No | - | - | MISSING | `ForumPostDetail.jsx:300` |
| `reporter_id` | `uuid` | No | `auth.uid()` | `auth.users(id) ON DELETE CASCADE` | MISSING | `ForumPostDetail.jsx:300` |
| `reason` | `text` | No | - | - | MISSING | `ForumPostDetail.jsx:300` |
| `created_at` | `timestamptz` | No | `now()` | - | MISSING | `ForumPostDetail.jsx:300` |

- **Allowed Enum Values:**
  - `target_type`: `'post'`, `'answer'`

---

### 3.20 `peer_tutor_profiles`
- **Migration Status:** **MISSING**.

#### Columns
| Column | Type | Nullable | Default | FK | Status | Referenced in File:Line |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | - | MISSING | `PeerTutors.jsx:147,299`, `UserProfilePage.jsx:86` |
| `user_id` | `uuid` | No | - | `auth.users(id) ON DELETE CASCADE` | MISSING | `PeerTutors.jsx:147,299`, `UserProfilePage.jsx:86` |
| `subjects` | `text[]` | No | `'{}'` | - | MISSING | `PeerTutors.jsx:147,299`, `UserProfilePage.jsx:86` |
| `bio` | `text` | Yes | `null` | - | MISSING | `PeerTutors.jsx:147,299`, `UserProfilePage.jsx:86` |
| `hourly_rate` | `numeric` | Yes | `0` | - | MISSING | `PeerTutors.jsx:147,299` |
| `rating` | `numeric` | No | `5.0` | - | MISSING | `PeerTutors.jsx:147,299`, `UserProfilePage.jsx:86` |
| `total_sessions` | `integer` | No | `0` | - | MISSING | `PeerTutors.jsx:147,299`, `UserProfilePage.jsx:86` |
| `is_available` | `boolean` | No | `true` | - | MISSING | `PeerTutors.jsx:147,299` |

---

### 3.21 `match_requests`
- **Migration Status:** **MISSING**.

#### Columns
| Column | Type | Nullable | Default | FK | Status | Referenced in File:Line |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | - | MISSING | `PeerTutors.jsx:111` |
| `requester_id` | `uuid` | No | - | `auth.users(id) ON DELETE CASCADE` | MISSING | `PeerTutors.jsx:111` |
| `tutor_id` | `uuid` | No | - | `auth.users(id) ON DELETE CASCADE` | MISSING | `PeerTutors.jsx:111` |
| `subject` | `text` | No | - | - | MISSING | `PeerTutors.jsx:111` |
| `note` | `text` | Yes | `null` | - | MISSING | `PeerTutors.jsx:111` |
| `status` | `text` | No | `'pending'` | - | MISSING | `PeerTutors.jsx:111` |
| `created_at` | `timestamptz` | No | `now()` | - | MISSING | `PeerTutors.jsx:111` |

- **Allowed Enum Values:**
  - `status`: `'pending'`, `'accepted'`, `'declined'`, `'cancelled'`, `'completed'`

---

### 3.22 `study_rooms`
- **Migration Status:** **MISSING**.

#### Columns
| Column | Type | Nullable | Default | FK | Status | Referenced in File:Line |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | - | MISSING | `StudyRoomsLobby.jsx:127`, `VirtualStudyRoom.jsx:122,373,389` |
| `name` | `text` | No | - | - | MISSING | `StudyRoomsLobby.jsx:127`, `VirtualStudyRoom.jsx:122` |
| `subject` | `text` | No | `'General'` | - | MISSING | `StudyRoomsLobby.jsx:127`, `VirtualStudyRoom.jsx:122` |
| `topic` | `text` | Yes | `null` | - | MISSING | `StudyRoomsLobby.jsx:127`, `VirtualStudyRoom.jsx:122` |
| `host_id` | `uuid` | No | - | `auth.users(id) ON DELETE CASCADE` | MISSING | `StudyRoomsLobby.jsx:127`, `VirtualStudyRoom.jsx:122` |
| `max_participants` | `integer` | No | `10` | - | MISSING | `StudyRoomsLobby.jsx:127`, `VirtualStudyRoom.jsx:122` |
| `current_participants_count` | `integer` | No | `1` | - | MISSING | `StudyRoomsLobby.jsx:127`, `VirtualStudyRoom.jsx:122` |
| `phase` | `text` | No | `'study'` | - | MISSING | `VirtualStudyRoom.jsx:122,338,357` |
| `phase_ends_at` | `timestamptz` | Yes | `null` | - | MISSING | `VirtualStudyRoom.jsx:122,338,357` |
| `goal` | `text` | Yes | `null` | - | MISSING | `VirtualStudyRoom.jsx:122,408` |
| `is_active` | `boolean` | No | `true` | - | MISSING | `StudyRoomsLobby.jsx:127`, `VirtualStudyRoom.jsx:122` |
| `created_at` | `timestamptz` | No | `now()` | - | MISSING | `StudyRoomsLobby.jsx:127` |

---

### 3.23 `community_reports`
- **Migration Status:** **EXISTS** (`supabase/migrations/20250527000000_community_reports.sql`).

#### Columns
| Column | Type | Nullable | Default | FK | Status | Referenced in File:Line |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | - | EXISTS | `reportsService.js:24` |
| `reporter_id` | `uuid` | No | `auth.uid()` | `auth.users(id) ON DELETE CASCADE` | EXISTS | `reportsService.js:24` |
| `target_type` | `text` | No | - | - | EXISTS | `reportsService.js:24` |
| `target_id` | `text` | No | - | - | EXISTS | `reportsService.js:24` |
| `reason` | `text` | No | - | - | EXISTS | `reportsService.js:24` |
| `details` | `text` | Yes | `null` | - | EXISTS | `reportsService.js:24` |
| `status` | `text` | No | `'pending'` | - | EXISTS | `20250527000000_community_reports.sql:10` |
| `created_at` | `timestamptz` | No | `now()` | - | EXISTS | `reportsService.js:24` |

- **Allowed Enum Values:**
  - `target_type`: `'user'`, `'group'`, `'activity'`, `'forum_post'`, `'forum_comment'`
  - `status`: `'pending'`, `'reviewed'`, `'dismissed'`, `'action_taken'`

---

### 3.24 `in_app_notifications`
- **Migration Status:** **EXISTS** (`supabase/migrations/20250524000000_chat_and_push_notifications.sql`).

#### Columns
| Column | Type | Nullable | Default | FK | Status | Referenced in File:Line |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | - | EXISTS | `useInAppNotifications.js:55,140,155` |
| `user_id` | `uuid` | No | - | `auth.users(id) ON DELETE CASCADE` | EXISTS | `useInAppNotifications.js:55,140,155` |
| `actor_id` | `uuid` | Yes | `null` | `auth.users(id) ON DELETE CASCADE` | EXISTS | `useInAppNotifications.js:55` |
| `type` | `text` | No | - | - | EXISTS | `useInAppNotifications.js:55` |
| `title` | `text` | No | - | - | EXISTS | `useInAppNotifications.js:55` |
| `message` | `text` | No | - | - | MISSING (Code uses `message`, migration defined `body text`) | MISMATCH | `useInAppNotifications.js:55`, `20250524000000_chat_and_push_notifications.sql:94` |
| `data` | `jsonb` | No | `'{}'::jsonb` | - | EXISTS | `useInAppNotifications.js:55` |
| `read` | `boolean` | No | `false` | - | EXISTS | `useInAppNotifications.js:55,140,155` |
| `created_at` | `timestamptz` | No | `now()` | - | EXISTS | `useInAppNotifications.js:55` |

- **Allowed Enum Values:**
  - `type`: `'message'`, `'friend_request'`, `'friend_accepted'`, `'system'`, `'session_reminder'`, `'streak_alert'`

---

## 4. RPC Functions Section

| Function Name | Parameters & Types | Expected Return Type | Status | Referenced in File:Line |
| :--- | :--- | :--- | :--- | :--- |
| `get_leaderboard` | `p_scope text DEFAULT 'global'`, `p_period text DEFAULT 'weekly'`, `p_metric text DEFAULT 'xp'`, `p_group_id uuid DEFAULT NULL`, `p_limit integer DEFAULT 50` | `json` (Array of ranked user objects) | **EXISTS** | `leaderboardService.js:13`, `useLeaderboard.js:49` |
| `get_explore_groups` | `p_search text DEFAULT ''`, `p_subject text DEFAULT 'all'`, `p_privacy_filter text DEFAULT 'all'`, `p_limit integer DEFAULT 20`, `p_offset integer DEFAULT 0` | `table` (group previews + member count + requester status) | **EXISTS** | `groupsApi.js:4` |
| `get_group_overview` | `p_group_id uuid` | `jsonb` (Group details, member list, activity, join status) | **EXISTS** | `groupsApi.js:29` |
| `request_to_join_group` | `p_group_id uuid`, `p_message text DEFAULT NULL` | `jsonb` (`{ success: bool, status: text }`) | **EXISTS** | `groupsApi.js:38` |
| `cancel_join_request` | `p_request_id uuid` | `jsonb` (`{ success: bool }`) | **EXISTS** | `groupsApi.js:48` |
| `decide_join_request` | `p_request_id uuid`, `p_decision text` | `jsonb` (`{ success: bool }`) | **EXISTS** | `groupsApi.js:57` |
| `leave_group` | `p_group_id uuid` | `jsonb` (`{ success: bool }`) | **EXISTS** | `groupsApi.js:67` |
| `remove_group_member` | `p_group_id uuid`, `p_target_user_id uuid`, `p_ban boolean DEFAULT false` | `jsonb` (`{ success: bool }`) | **EXISTS** | `groupsApi.js:76` |
| `set_group_member_role` | `p_group_id uuid`, `p_target_user_id uuid`, `p_new_role text` | `jsonb` (`{ success: bool }`) | **EXISTS** | `groupsApi.js:87` |
| `transfer_group_ownership` | `p_group_id uuid`, `p_new_owner_id uuid` | `jsonb` (`{ success: bool }`) | **EXISTS** | `groupsApi.js:98` |
| `update_group_privacy` | `p_group_id uuid`, `p_new_privacy text` | `jsonb` (`{ success: bool }`) | **EXISTS** | `groupsApi.js:108` |
| `sync_my_achievements` | *(None)* | `void` | **MISSING** | `AchievementsPage.jsx:40` |
| `get_achievements` | `p_user_id uuid DEFAULT NULL` | `jsonb` / `table` (List of user achievements) | **MISSING** | `AchievementsPage.jsx:46`, `UserProfilePage.jsx:94` |
| `get_public_profile` | `p_user_id uuid` | `jsonb` / `table` | **MISSING** | `UserProfilePage.jsx:60` |
| `get_or_create_direct_conversation` | `p_other_user_id uuid` | `uuid` (conversation_id) | **MISSING** | `community.jsx:622`, `UserProfilePage.jsx:133`, `VirtualStudyRoom.jsx:896`, `FriendPicker.jsx:57`, `NotificationCenter.jsx:155` |
| `find_peer_matches` | `p_subject text`, `p_query text DEFAULT ''` | `table` | **MISSING** | `PeerTutors.jsx:71,91` |
| `request_tutor` | `p_tutor_id uuid`, `p_subject text`, `p_note text DEFAULT NULL` | `jsonb` | **MISSING** | `PeerTutors.jsx:179`, `UserProfilePage.jsx:165` |
| `respond_match_request` | `p_request_id uuid`, `p_response text` | `jsonb` | **MISSING** | `PeerTutors.jsx:228`, `NotificationCenter.jsx:129` |
| `cancel_match_request` | `p_request_id uuid` | `jsonb` | **MISSING** | `PeerTutors.jsx:247` |
| `complete_match_request` | `p_request_id uuid` | `jsonb` | **MISSING** | `PeerTutors.jsx:265` |
| `list_study_rooms` | `p_subject text DEFAULT 'all'` | `table` | **MISSING** | `StudyRoomsLobby.jsx:57` |
| `join_study_room` | `p_room_id uuid` | `jsonb` | **MISSING** | `StudyRoomsLobby.jsx:152`, `VirtualStudyRoom.jsx:147,193` |
| `leave_study_room` | `p_room_id uuid` | `void` | **MISSING** | `VirtualStudyRoom.jsx:203` |
| `get_room_roster` | `p_room_id uuid` | `table` | **MISSING** | `VirtualStudyRoom.jsx:94` |
| `room_heartbeat` | `p_room_id uuid` | `boolean` | **MISSING** | `VirtualStudyRoom.jsx:187` |
| `advance_room_phase` | `p_room_id uuid` | `jsonb` | **MISSING** | `VirtualStudyRoom.jsx:338` |
| `set_room_phase` | `p_room_id uuid`, `p_phase text`, `p_duration_minutes integer` | `jsonb` | **MISSING** | `VirtualStudyRoom.jsx:357` |
| `set_room_goal` | `p_room_id uuid`, `p_goal text` | `jsonb` | **MISSING** | `VirtualStudyRoom.jsx:408` |
| `increment_post_views` | `p_post_id uuid` | `void` | **MISSING** | `ForumPostDetail.jsx:75` |
| `accept_forum_answer` | `p_post_id uuid`, `p_answer_id uuid` | `jsonb` | **MISSING** | `ForumPostDetail.jsx:279` |

---

## 5. Realtime and Storage Requirements

### 5.1 Realtime Subscriptions Required

| Table / Topic | Channel Pattern / Event | Referenced in File:Line | Purpose |
| :--- | :--- | :--- | :--- |
| `activity_events` | `feed:activity` (`postgres_changes` on `activity_events`) | `feedService.js:158` | Live updates for friend and group activity feed items |
| `messages` | `chat:conv_id` (`postgres_changes` on `messages` WHERE `conversation_id=eq.{id}`) | `ChatThread.jsx:223` | Realtime instant messaging inside group and direct chats |
| `conversation_participants` | `inbox:user_id` (`postgres_changes` on `conversation_participants` WHERE `user_id=eq.{id}`) | `ChatInbox.jsx:130` | Inbox update notifications when new messages arrive |
| `in_app_notifications` | `notifications:{user_id}` (`postgres_changes` on `in_app_notifications` WHERE `user_id=eq.{id}`) | `useInAppNotifications.js:90` | Toast notifications and badge updates |
| `profiles` & `users_streaks` | `leaderboard:updates` (`postgres_changes` on `profiles` & `users_streaks`) | `useLeaderboard.js:120` | Debounced leaderboard updates when users gain XP/streaks |
| `group_study_sessions` | `session_room:{id}` (`postgres_changes` on `group_study_sessions` & `group_study_session_participants`) | `SessionRoom.jsx:101,113` | Study room participant roster sync & session phase changes |
| `study_rooms` | `room:{id}` (`postgres_changes` on `study_rooms`) | `VirtualStudyRoom.jsx:223` | Virtual study room roster & Pomodoro phase synchronization |

### 5.2 Storage Buckets Required

| Bucket Name | Access Level | Max Size / Allowed Types | Referenced in File:Line | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `user-images` | Public Read, Authenticated Write | 5MB (PNG, JPG, WEBP) | `ProfileContext.jsx:55`, `groupsService.js:15` | User profile avatars & study group cover photos |
| `chat-attachments` | Private Read (Participants), Authenticated Write | 10MB | `ChatThread.jsx:350` | Images and PDFs attached in community direct/group messages |

---

## 6. Required RLS Policies (Implicit Code Expectations)

1. **`activity_events`**:
   - `SELECT`: Authenticated users can read public events, events by accepted friends, and events for groups they belong to.
   - `INSERT`: Authenticated users can insert events where `actor_id = auth.uid()`.
2. **`activity_cheers`**:
   - `SELECT`: Authenticated users can view cheers on activity events they can access.
   - `INSERT`: Authenticated users can cheer (`user_id = auth.uid()`).
   - `DELETE`: Authenticated users can remove their own cheer (`user_id = auth.uid()`).
3. **`friendships`**:
   - `SELECT`: Users can view rows where `requester_id = auth.uid()` OR `addressee_id = auth.uid()`.
   - `INSERT`: Users can send friend requests where `requester_id = auth.uid()`.
   - `UPDATE`/`DELETE`: Users can manage friendships they are part of.
4. **`study_groups`**:
   - `SELECT`: Public groups are visible to all; private/hidden groups visible to members.
   - `INSERT`: Authenticated users can create study groups (`owner_id = auth.uid()`).
   - `UPDATE`/`DELETE`: Group owner or admin only.
5. **`conversations` & `messages`**:
   - `SELECT`: Only users listed in `conversation_participants` for that `conversation_id`.
   - `INSERT`: Conversation participants can send messages (`sender_id = auth.uid()`).
6. **`group_study_sessions` & `group_study_session_participants`**:
   - `SELECT`: Visible to members of the parent study group.
   - `INSERT`/`UPDATE`: Group members can RSVP; session creator or group admins can update.
7. **`forum_posts` & `forum_answers`**:
   - `SELECT`: Public read for all authenticated users.
   - `INSERT`: Authenticated users (`author_id = auth.uid()`).
   - `UPDATE`: Post/answer author or system RPCs for `accepted_answer_id` / `upvotes_count`.
8. **`peer_tutor_profiles` & `match_requests`**:
   - `SELECT`: Public read for active peer tutors.
   - `INSERT`/`UPDATE`: Users manage their own tutor profile and match requests.

---

## 7. Database Mismatches & Naming Conflicts

1. **`in_app_notifications.message` vs `in_app_notifications.body`**:
   - Frontend `useInAppNotifications.js` selects `message`, but migration `20250524000000_chat_and_push_notifications.sql` defines `body text`.
   - **Resolution:** Add column alias `message` or rename `body` to `message` in database schema.
2. **`community_profiles` View Absence**:
   - 21 files call `.from("community_profiles")`. The database only has table `profiles`.
   - **Resolution:** Create `public.community_profiles` as a public VIEW on `public.profiles`.
3. **`activity_events.actor_id` Missing Column Error**:
   - `activity_events` table definition in `20250526000000_activity_feed_and_community.sql` contains `actor_id`.
   - **Resolution:** Apply migration `20250526000000_activity_feed_and_community.sql` to live database instance.

---

## 8. Explicit Ambiguities & Inferred Data Types

1. **`forum_votes.vote_type`**: Inferred as `integer` (`1` for upvote, `-1` for downvote) based on increment/decrement logic in `ForumPostDetail.jsx`.
2. **`group_study_sessions.scheduled_start`**: Inferred as `timestamptz` based on ISO date parsing in `GroupStudySessions.jsx` and `useCombinedSessions.js`.
3. **`community_reports.target_id`**: Migration `20250527000000_community_reports.sql` defines `target_id` as `text` (to support string UUIDs and alphanumeric resource IDs).
4. **`sync_my_achievements` RPC**: Called with no parameters in `AchievementsPage.jsx:40` to recalculate achievement badges on demand.
