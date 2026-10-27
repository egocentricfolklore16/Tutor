-- Migration: 20250530000000_study_group_invites.sql
-- Description: Adds study_group_invites table with RLS policies to manage peer group invitations.

create table if not exists public.study_group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  inviter_id uuid not null references public.profiles(user_id) on delete cascade,
  invitee_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint unique_pending_group_invite unique (group_id, invitee_id)
);

-- Enable Row Level Security
alter table public.study_group_invites enable row level security;

-- RLS Policies
-- 1. Users can select invites where they are the inviter or invitee, or if they are members of the group
create policy "Users can view group invites relevant to them"
  on public.study_group_invites for select
  using (
    auth.uid() = inviter_id
    or auth.uid() = invitee_id
    or exists (
      select 1 from public.study_group_members sgm
      where sgm.group_id = study_group_invites.group_id
      and sgm.user_id = auth.uid()
    )
  );

-- 2. Group members can insert invitations
create policy "Group members can send invites"
  on public.study_group_invites for insert
  with check (
    auth.uid() = inviter_id
    and exists (
      select 1 from public.study_group_members sgm
      where sgm.group_id = study_group_invites.group_id
      and sgm.user_id = auth.uid()
    )
  );

-- 3. Invitees can update their invite status (accept or decline)
create policy "Invitees can respond to group invites"
  on public.study_group_invites for update
  using (auth.uid() = invitee_id)
  with check (auth.uid() = invitee_id);

-- Note: Migration has NOT been applied to production.
-- Rollback Instructions:
-- DROP TABLE IF EXISTS public.study_group_invites;
