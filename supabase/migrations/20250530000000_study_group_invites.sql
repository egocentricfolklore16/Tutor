-- Migration: 20250530000000_study_group_invites.sql
-- Create study group invites table with RLS policies

create table if not exists public.study_group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending', -- 'pending', 'accepted', 'declined'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_group_invite unique (group_id, invitee_id)
);

-- Index for querying user invites efficiently
create index if not exists idx_study_group_invites_invitee
  on public.study_group_invites (invitee_id, status);

create index if not exists idx_study_group_invites_group
  on public.study_group_invites (group_id, status);

alter table public.study_group_invites enable row level security;

-- RLS Policy: Users can view invites they sent or received
drop policy if exists "Users view their study group invites" on public.study_group_invites;
create policy "Users view their study group invites"
  on public.study_group_invites
  for select
  to authenticated
  using (auth.uid() = inviter_id or auth.uid() = invitee_id);

-- RLS Policy: Group members can send study group invites
drop policy if exists "Group members can send study group invites" on public.study_group_invites;
create policy "Group members can send study group invites"
  on public.study_group_invites
  for insert
  to authenticated
  with check (
    auth.uid() = inviter_id
    and exists (
      select 1 from public.study_group_members
      where group_id = study_group_invites.group_id
        and user_id = auth.uid()
    )
  );

-- RLS Policy: Invitee or Inviter can update invites
drop policy if exists "Users manage their study group invites" on public.study_group_invites;
create policy "Users manage their study group invites"
  on public.study_group_invites
  for update
  to authenticated
  using (auth.uid() = inviter_id or auth.uid() = invitee_id)
  with check (auth.uid() = inviter_id or auth.uid() = invitee_id);

-- RLS Policy: Invitee or Inviter can delete invites
drop policy if exists "Users delete their study group invites" on public.study_group_invites;
create policy "Users delete their study group invites"
  on public.study_group_invites
  for delete
  to authenticated
  using (auth.uid() = inviter_id or auth.uid() = invitee_id);

/*
Rollback Note:
To revert this migration:
drop table if exists public.study_group_invites cascade;
*/
