# Study Groups System Architecture

## Overview
The Study Groups system enables learners to discover, join, and collaborate in public or private study groups with scheduled study sessions, group chat, and XP leaderboards.

---

## Data Model & Schema

### Tables (`supabase/migrations/20250525000000_study_groups_restructure.sql`)
- `study_groups`: Contains group details: `id`, `name`, `description`, `subject`, `privacy` (`'public'` | `'private'` | `'hidden'`), `owner_id`, `member_count`, `created_at`, `updated_at`.
- `study_group_members`: Tracks membership and roles: `group_id`, `user_id`, `role` (`'owner'` | `'admin'` | `'member'`), `joined_at`.
- `study_group_join_requests`: Manages join requests for private groups: `id`, `group_id`, `user_id`, `message`, `status` (`'pending'` | `'accepted'` | `'declined'` | `'cancelled'`), `decided_by`, `decided_at`, `created_at`.
- `study_group_bans`: Tracks banned users: `group_id`, `user_id`, `banned_by`, `created_at`.

---

## Row Level Security (RLS) & Helper Functions

### Security Helper Function
- `is_group_member(p_group_id, p_user_id)`: `SECURITY DEFINER` function that checks if `p_user_id` belongs to `p_group_id`. Avoids recursive RLS policies on `study_group_members`.

### Teaser Isolation for Non-Members
- Non-members can search and discover private groups via the `get_explore_groups` RPC, which returns only safe teaser fields (`id`, `name`, `description`, `subject`, `privacy`, `member_count`, owner profile).
- Direct `SELECT` access to private group sessions, members, and chat messages is restricted to group members via `is_group_member(group_id)`.

---

## RPC Functions API

| RPC Function | Access | Description |
| :--- | :--- | :--- |
| `get_explore_groups(search, subject, privacy, limit, offset)` | Authenticated | Searches groups with teaser fields and user's membership status (`'member'`, `'pending'`, `'declined_cooldown'`, `'none'`). |
| `request_to_join_group(group_id, message)` | Authenticated | Auto-joins public groups; submits pending request for private groups with 10 pending requests limit and 7-day cool-down after decline. |
| `cancel_join_request(request_id)` | Requester | Cancels a pending join request. |
| `decide_join_request(request_id, decision)` | Group Admin/Owner | Accepts or declines a request. Accepting inserts member and group chat participant in one transaction. |
| `get_group_overview(group_id)` | Authenticated | Single fast call returning group info, my_role, member list, XP rankings, upcoming sessions, and pending requests count. |
| `leave_group(group_id)` | Group Member | Removes user from group and chat. (Owner cannot leave without transferring ownership). |
| `remove_group_member(group_id, target_user_id, ban)` | Group Admin/Owner | Removes a member or bans them. |
| `transfer_group_ownership(group_id, new_owner_id)` | Group Owner | Transfers group ownership to another member. |
| `update_group_privacy(group_id, new_privacy)` | Group Admin/Owner | Toggles group privacy between `'public'`, `'private'`, and `'hidden'`. |

---

## Notification Events

- `group_join_request`: Sent to group owner/admins when a private join request is submitted.
- `group_request_accepted`: Sent to requester when their request is accepted.
- `group_request_declined`: Sent to requester when their request is declined.
