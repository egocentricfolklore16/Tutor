-- Migration: 20250526000000_activity_feed_and_community.sql
-- Activity Feed Schema & Friendship Integrity Constraints

-- 1. Create activity_events table
create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('session_completed', 'streak_milestone', 'level_up', 'group_joined', 'achievement_unlocked')),
  payload jsonb not null default '{}'::jsonb,
  visibility text not null default 'friends' check (visibility in ('public', 'friends', 'group')),
  group_id uuid references public.study_groups(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Indexes for efficient feed queries
create index if not exists idx_activity_events_actor_created on public.activity_events(actor_id, created_at desc);
create index if not exists idx_activity_events_created on public.activity_events(created_at desc);
create index if not exists idx_activity_events_group on public.activity_events(group_id, created_at desc) where group_id is not null;

-- Enable RLS
alter table public.activity_events enable row level security;

-- RLS Policies
drop policy if exists "Users can view accessible activity events" on public.activity_events;
create policy "Users can view accessible activity events"
  on public.activity_events
  for select
  to authenticated
  using (
    -- Own events
    actor_id = auth.uid()
    -- Public events
    or visibility = 'public'
    -- Friends' events
    or (
      visibility = 'friends'
      and actor_id in (
        select case when requester_id = auth.uid() then addressee_id else requester_id end
        from public.friendships
        where (requester_id = auth.uid() or addressee_id = auth.uid())
          and status = 'accepted'
      )
    )
    -- Group members' events
    or (
      visibility = 'group'
      and group_id is not null
      and group_id in (
        select group_id from public.study_group_members where user_id = auth.uid()
      )
    )
  );

drop policy if exists "Users can insert own activity events" on public.activity_events;
create policy "Users can insert own activity events"
  on public.activity_events
  for insert
  to authenticated
  with check (actor_id = auth.uid());

-- Prevent direct update/delete by standard client users (only cascade on user deletion)
drop policy if exists "Users cannot update activity events" on public.activity_events;
drop policy if exists "Users cannot delete activity events" on public.activity_events;

-- 2. Add CHECK constraint on friendships table to prevent self-friending
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'check_prevent_self_friend'
  ) then
    alter table public.friendships
      add constraint check_prevent_self_friend check (requester_id != addressee_id);
  end if;
end $$;

-- 3. Automatic Trigger Function to emit activity events on study session completions
create or replace function public.emit_study_session_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_duration int;
  v_xp int;
  v_subject text;
begin
  v_duration := coalesce(new.duration_minutes, 25);
  v_xp := coalesce(new.xp_earned, 50);
  v_subject := coalesce(new.subject, 'General Study');

  insert into public.activity_events (
    actor_id,
    type,
    payload,
    visibility
  )
  values (
    new.user_id,
    'session_completed',
    jsonb_build_object(
      'duration_minutes', v_duration,
      'xp_earned', v_xp,
      'subject', v_subject
    ),
    'friends'
  );

  return new;
exception
  when others then
    -- Catch exceptions so study_history insert never fails due to activity feed event
    return new;
end;
$$;

drop trigger if exists trigger_emit_study_session_activity on public.study_history;
create trigger trigger_emit_study_session_activity
  after insert on public.study_history
  for each row
  execute function public.emit_study_session_activity();

-- Rollback Instructions:
-- DROP TRIGGER IF EXISTS trigger_emit_study_session_activity ON public.study_history;
-- DROP FUNCTION IF EXISTS public.emit_study_session_activity();
-- ALTER TABLE public.friendships DROP CONSTRAINT IF EXISTS check_prevent_self_friend;
-- DROP TABLE IF EXISTS public.activity_events;
