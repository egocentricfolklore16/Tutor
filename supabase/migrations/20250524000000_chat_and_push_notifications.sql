-- Migration: Chat & Push Notifications Schema & Triggers
-- Date: 2025-05-24
-- Description: Extends notification_preferences, ensures push_subscriptions, creates conversation_mutes,
-- in_app_notifications, and sets up postgres triggers for messages, friend_requests, and friend_accepts.

-- 1. Table: push_subscriptions
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  platform text default 'web',
  user_agent text,
  created_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  failure_count int not null default 0
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users manage their push subscriptions" on public.push_subscriptions;
create policy "Users manage their push subscriptions"
  on public.push_subscriptions
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. Table: notification_preferences
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_enabled boolean not null default true,
  push_messages boolean not null default true,
  push_friend_requests boolean not null default true,
  push_friend_accepts boolean not null default true,
  show_message_preview boolean not null default true,
  quiet_hours_start text default null,
  quiet_hours_end text default null,
  session_reminders boolean not null default true,
  streak_alerts boolean not null default true,
  inactivity_nudges boolean not null default true,
  updated_at timestamptz default now()
);

-- Ensure all new columns exist on notification_preferences if table pre-existed
alter table public.notification_preferences
  add column if not exists push_messages boolean not null default true,
  add column if not exists push_friend_requests boolean not null default true,
  add column if not exists push_friend_accepts boolean not null default true,
  add column if not exists show_message_preview boolean not null default true,
  add column if not exists quiet_hours_start text default null,
  add column if not exists quiet_hours_end text default null;

alter table public.notification_preferences enable row level security;

drop policy if exists "Users manage their notification preferences" on public.notification_preferences;
create policy "Users manage their notification preferences"
  on public.notification_preferences
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Table: conversation_mutes
create table if not exists public.conversation_mutes (
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  muted_until timestamptz default null,
  created_at timestamptz default now(),
  primary key (user_id, conversation_id)
);

create index if not exists conversation_mutes_user_idx on public.conversation_mutes (user_id);

alter table public.conversation_mutes enable row level security;

drop policy if exists "Users manage their conversation mutes" on public.conversation_mutes;
create policy "Users manage their conversation mutes"
  on public.conversation_mutes
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Table: in_app_notifications
create table if not exists public.in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('message', 'friend_request', 'friend_accepted', 'system', 'session_reminder', 'streak_alert')),
  actor_id uuid references auth.users(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete cascade,
  title text,
  body text,
  data jsonb default '{}'::jsonb,
  read_at timestamptz default null,
  delivery_status text not null default 'pending' check (delivery_status in ('pending', 'sent', 'failed', 'skipped')),
  pushed_at timestamptz default null,
  created_at timestamptz default now()
);

-- Add missing columns if in_app_notifications pre-existed
alter table public.in_app_notifications
  add column if not exists delivery_status text not null default 'pending',
  add column if not exists pushed_at timestamptz default null,
  add column if not exists conversation_id uuid references public.conversations(id) on delete cascade,
  add column if not exists actor_id uuid references auth.users(id) on delete set null,
  add column if not exists data jsonb default '{}'::jsonb;

create index if not exists in_app_notifications_user_unread_idx
  on public.in_app_notifications (user_id, created_at desc)
  where read_at is null;

create index if not exists in_app_notifications_pending_idx
  on public.in_app_notifications (created_at desc)
  where delivery_status = 'pending';

alter table public.in_app_notifications enable row level security;

drop policy if exists "Users view their in_app_notifications" on public.in_app_notifications;
create policy "Users view their in_app_notifications"
  on public.in_app_notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users update their in_app_notifications" on public.in_app_notifications;
create policy "Users update their in_app_notifications"
  on public.in_app_notifications
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete their in_app_notifications" on public.in_app_notifications;
create policy "Users delete their in_app_notifications"
  on public.in_app_notifications
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- 5. Triggers for Automatic Notification Generation

-- 5.1 Trigger Function: handle_new_message_notification
create or replace function public.handle_new_message_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r_recipient record;
  v_sender_name text;
  v_conv_type text;
  v_group_name text;
  v_title text;
  v_body text;
begin
  -- Fetch conversation type and group name if applicable
  select c.type, sg.name
  into v_conv_type, v_group_name
  from public.conversations c
  left join public.study_groups sg on sg.id = c.study_group_id
  where c.id = NEW.conversation_id;

  -- Get sender profile name
  select coalesce(full_name, username, 'Someone')
  into v_sender_name
  from public.community_profiles
  where user_id = NEW.sender_id;

  if v_sender_name is null then
    v_sender_name := 'Someone';
  end if;

  if v_conv_type = 'group' then
    v_title := coalesce(v_group_name, 'Group Chat');
    v_body := v_sender_name || ': ' || coalesce(NEW.content, 'Sent a resource');
  else
    v_title := v_sender_name;
    v_body := coalesce(NEW.content, 'Sent you a message');
  end if;

  -- Notify all other participants in the conversation
  for r_recipient in
    select user_id
    from public.conversation_participants
    where conversation_id = NEW.conversation_id
      and user_id <> NEW.sender_id
  loop
    insert into public.in_app_notifications (
      user_id,
      type,
      actor_id,
      conversation_id,
      title,
      body,
      data,
      delivery_status
    )
    values (
      r_recipient.user_id,
      'message',
      NEW.sender_id,
      NEW.conversation_id,
      v_title,
      v_body,
      jsonb_build_object(
        'message_id', NEW.id,
        'conversation_id', NEW.conversation_id,
        'sender_id', NEW.sender_id,
        'content', NEW.content,
        'resource_id', NEW.resource_id
      ),
      'pending'
    );
  end loop;

  return NEW;
end;
$$;

drop trigger if exists tr_on_message_insert on public.messages;
create trigger tr_on_message_insert
  after insert on public.messages
  for each row
  execute function public.handle_new_message_notification();

-- 5.2 Trigger Function: handle_friendship_notification
create or replace function public.handle_friendship_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_name text;
begin
  if TG_OP = 'INSERT' and NEW.status = 'pending' then
    select coalesce(full_name, username, 'Someone')
    into v_actor_name
    from public.community_profiles
    where user_id = NEW.requester_id;

    insert into public.in_app_notifications (
      user_id,
      type,
      actor_id,
      title,
      body,
      data,
      delivery_status
    )
    values (
      NEW.addressee_id,
      'friend_request',
      NEW.requester_id,
      'New Friend Request',
      coalesce(v_actor_name, 'Someone') || ' wants to be your friend',
      jsonb_build_object('friendship_id', NEW.id, 'requester_id', NEW.requester_id),
      'pending'
    );
  elsif TG_OP = 'UPDATE' and OLD.status = 'pending' and NEW.status = 'accepted' then
    select coalesce(full_name, username, 'Someone')
    into v_actor_name
    from public.community_profiles
    where user_id = NEW.addressee_id;

    insert into public.in_app_notifications (
      user_id,
      type,
      actor_id,
      title,
      body,
      data,
      delivery_status
    )
    values (
      NEW.requester_id,
      'friend_accepted',
      NEW.addressee_id,
      'Friend Request Accepted',
      coalesce(v_actor_name, 'Someone') || ' accepted your friend request',
      jsonb_build_object('friendship_id', NEW.id, 'addressee_id', NEW.addressee_id),
      'pending'
    );
  end if;

  return NEW;
end;
$$;

drop trigger if exists tr_on_friendship_change on public.friendships;
create trigger tr_on_friendship_change
  after insert or update on public.friendships
  for each row
  execute function public.handle_friendship_notification();

notify pgrst, 'reload schema';
