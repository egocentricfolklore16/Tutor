-- Migration: 20250529000000_community_integrity_and_views.sql
-- Description: Ensures public community_profiles view integrity and enforces symmetric uniqueness on friendship pairs.

-- 1. Create public community_profiles view for safe public user details
create or replace view public.community_profiles as
select
  p.user_id,
  p.username,
  p.full_name,
  p.user_img,
  coalesce(p.level, 1) as level
from public.profiles p;

-- Grant select permissions on community_profiles to authenticated users
grant select on public.community_profiles to authenticated;

-- 2. Add symmetric unique index on friendships to prevent duplicate reverse pairs (A, B) and (B, A)
create unique index if not exists unique_friendship_pair
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

-- Note: Migration has NOT been applied to production.
-- Rollback Instructions:
-- DROP INDEX IF EXISTS public.unique_friendship_pair;
-- DROP VIEW IF EXISTS public.community_profiles;
