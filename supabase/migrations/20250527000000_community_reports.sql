-- Migration: 20250527000000_community_reports.sql
-- Community Safety & Safety Reports Table

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('user', 'group', 'activity', 'forum_post', 'forum_comment')),
  target_id text not null,
  reason text not null,
  details text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed', 'actioned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for moderator review
create index if not exists idx_community_reports_status_created on public.community_reports(status, created_at desc);
create index if not exists idx_community_reports_reporter on public.community_reports(reporter_id);

-- Enable RLS
alter table public.community_reports enable row level security;

-- RLS Policies
drop policy if exists "Users can submit reports" on public.community_reports;
create policy "Users can submit reports"
  on public.community_reports
  for insert
  to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists "Users can view own submitted reports" on public.community_reports;
create policy "Users can view own submitted reports"
  on public.community_reports
  for select
  to authenticated
  using (reporter_id = auth.uid());

-- Rollback Instructions:
-- DROP TABLE IF EXISTS public.community_reports;
