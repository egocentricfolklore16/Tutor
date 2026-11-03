-- Migration: 20250528000000_activity_cheers.sql
-- Persistent Social Cheers & Reactions for Activity Feed Events

create table if not exists public.activity_cheers (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activity_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint unique_activity_user_cheer unique (activity_id, user_id)
);

-- Indexes for fast activity cheer aggregations and lookup
create index if not exists idx_activity_cheers_activity_id on public.activity_cheers(activity_id);
create index if not exists idx_activity_cheers_user_id on public.activity_cheers(user_id);

-- Enable Row Level Security
alter table public.activity_cheers enable row level security;

-- RLS Policies
drop policy if exists "Users can view activity cheers" on public.activity_cheers;
create policy "Users can view activity cheers"
  on public.activity_cheers
  for select
  to authenticated
  using (true);

drop policy if exists "Users can insert own activity cheers" on public.activity_cheers;
create policy "Users can insert own activity cheers"
  on public.activity_cheers
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own activity cheers" on public.activity_cheers;
create policy "Users can delete own activity cheers"
  on public.activity_cheers
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Rollback Instructions:
-- DROP TABLE IF EXISTS public.activity_cheers;
