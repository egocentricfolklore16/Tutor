-- Migration: Restructure Study Groups System (Schema, RLS, RPCs & Triggers)
-- Date: 2025-05-25

-- 1. Ensure Table Schemas
alter table public.study_groups
  add column if not exists privacy text not null default 'public' check (privacy in ('public', 'private', 'hidden')),
  add column if not exists owner_id uuid references auth.users(id) on delete cascade,
  add column if not exists member_count integer not null default 1,
  add column if not exists created_by uuid references auth.users(id) on delete cascade;

-- Set default owner_id to created_by where owner_id is null
update public.study_groups set owner_id = created_by where owner_id is null and created_by is not null;

create table if not exists public.study_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz default now(),
  unique (group_id, user_id)
);

create table if not exists public.study_group_join_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz default null,
  created_at timestamptz default now()
);

create unique index if not exists study_group_pending_requests_idx
  on public.study_group_join_requests (group_id, user_id)
  where status = 'pending';

create table if not exists public.study_group_bans (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  banned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  unique (group_id, user_id)
);

-- Backfill: Ensure all group creators/owners are in study_group_members
insert into public.study_group_members (group_id, user_id, role)
select sg.id, coalesce(sg.owner_id, sg.created_by), 'owner'
from public.study_groups sg
where coalesce(sg.owner_id, sg.created_by) is not null
on conflict (group_id, user_id) do update set role = 'owner';

-- Backfill: Update member_count on study_groups
update public.study_groups sg
set member_count = (
  select count(*) from public.study_group_members sgm where sgm.group_id = sg.id
);

-- 2. SECURITY DEFINER Helper Function
create or replace function public.is_group_member(p_group_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.study_group_members
    where group_id = p_group_id and user_id = p_user_id
  );
$$;

create or replace function public.is_group_admin(p_group_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.study_group_members
    where group_id = p_group_id and user_id = p_user_id and role in ('owner', 'admin')
  );
$$;

-- 3. Row Level Security Policies

alter table public.study_groups enable row level security;
alter table public.study_group_members enable row level security;
alter table public.study_group_join_requests enable row level security;
alter table public.study_group_bans enable row level security;

-- study_groups policies
drop policy if exists "Members view group details" on public.study_groups;
create policy "Members view group details"
  on public.study_groups for select
  to authenticated
  using (
    privacy = 'public'
    or is_group_member(id)
    or auth.uid() = owner_id
  );

drop policy if exists "Group owners/admins update group" on public.study_groups;
create policy "Group owners/admins update group"
  on public.study_groups for update
  to authenticated
  using (is_group_admin(id))
  with check (is_group_admin(id));

drop policy if exists "Users create groups" on public.study_groups;
create policy "Users create groups"
  on public.study_groups for insert
  to authenticated
  with check (auth.uid() = owner_id or auth.uid() = created_by);

drop policy if exists "Owners delete groups" on public.study_groups;
create policy "Owners delete groups"
  on public.study_groups for delete
  to authenticated
  using (auth.uid() = owner_id or auth.uid() = created_by);

-- study_group_members policies
drop policy if exists "Group members view member list" on public.study_group_members;
create policy "Group members view member list"
  on public.study_group_members for select
  to authenticated
  using (is_group_member(group_id));

drop policy if exists "Admins manage group members" on public.study_group_members;
create policy "Admins manage group members"
  on public.study_group_members for all
  to authenticated
  using (is_group_admin(group_id))
  with check (is_group_admin(group_id));

-- study_group_join_requests policies
drop policy if exists "Users view own or admin group requests" on public.study_group_join_requests;
create policy "Users view own or admin group requests"
  on public.study_group_join_requests for select
  to authenticated
  using (
    auth.uid() = user_id
    or is_group_admin(group_id)
  );

drop policy if exists "Users create own join requests" on public.study_group_join_requests;
create policy "Users create own join requests"
  on public.study_group_join_requests for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users or admins update requests" on public.study_group_join_requests;
create policy "Users or admins update requests"
  on public.study_group_join_requests for update
  to authenticated
  using (
    auth.uid() = user_id
    or is_group_admin(group_id)
  )
  with check (
    auth.uid() = user_id
    or is_group_admin(group_id)
  );

-- study_group_bans policies
drop policy if exists "Admins manage bans" on public.study_group_bans;
create policy "Admins manage bans"
  on public.study_group_bans for all
  to authenticated
  using (is_group_admin(group_id))
  with check (is_group_admin(group_id));

-- 4. RPC Functions

-- 4.1 RPC: get_explore_groups
create or replace function public.get_explore_groups(
  p_search text default '',
  p_subject text default 'all',
  p_privacy_filter text default 'all',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  name text,
  description text,
  subject text,
  privacy text,
  member_count integer,
  created_at timestamptz,
  owner_id uuid,
  owner_name text,
  owner_username text,
  owner_avatar text,
  my_status text,
  my_request_id uuid,
  cooldown_days_left integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  return query
  select
    sg.id,
    sg.name,
    sg.description,
    sg.subject,
    sg.privacy,
    sg.member_count,
    sg.created_at,
    sg.owner_id,
    cp.full_name as owner_name,
    cp.username as owner_username,
    cp.user_img as owner_avatar,
    case
      when sgm.user_id is not null then 'member'
      when req.id is not null and req.status = 'pending' then 'pending'
      when decl.id is not null and decl.decided_at > now() - interval '7 days' then 'declined_cooldown'
      else 'none'
    end as my_status,
    req.id as my_request_id,
    case
      when decl.id is not null and decl.decided_at > now() - interval '7 days' then
        ceil(extract(epoch from ((decl.decided_at + interval '7 days') - now())) / 86400.0)::integer
      else 0
    end as cooldown_days_left
  from public.study_groups sg
  left join public.community_profiles cp on cp.user_id = sg.owner_id
  left join public.study_group_members sgm on sgm.group_id = sg.id and sgm.user_id = v_user_id
  left join public.study_group_join_requests req on req.group_id = sg.id and req.user_id = v_user_id and req.status = 'pending'
  left join (
    select distinct on (group_id) id, group_id, decided_at
    from public.study_group_join_requests
    where user_id = v_user_id and status = 'declined'
    order by group_id, decided_at desc
  ) decl on decl.group_id = sg.id
  left join public.study_group_bans ban on ban.group_id = sg.id and ban.user_id = v_user_id
  where ban.id is null
    and sg.privacy <> 'hidden'
    and (p_search = '' or sg.name ilike '%' || p_search || '%' or sg.description ilike '%' || p_search || '%')
    and (p_subject = 'all' or sg.subject ilike p_subject)
    and (p_privacy_filter = 'all' or sg.privacy = p_privacy_filter)
  order by sg.created_at desc
  limit p_limit
  offset p_offset;
end;
$$;

grant execute on function public.get_explore_groups(text, text, text, integer, integer) to authenticated;

-- 4.2 RPC: request_to_join_group
create or replace function public.request_to_join_group(
  p_group_id uuid,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_group record;
  v_is_banned boolean;
  v_is_member boolean;
  v_pending_count integer;
  v_last_declined timestamptz;
  v_cooldown_days integer;
  v_request_id uuid;
  v_conv_id uuid;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'unauthenticated');
  end if;

  -- Load group details
  select * into v_group from public.study_groups where id = p_group_id;
  if v_group.id is null then
    return jsonb_build_object('success', false, 'error', 'group_not_found');
  end if;

  -- Check if banned
  select exists (select 1 from public.study_group_bans where group_id = p_group_id and user_id = v_user_id) into v_is_banned;
  if v_is_banned then
    return jsonb_build_object('success', false, 'error', 'banned');
  end if;

  -- Check if already member
  select exists (select 1 from public.study_group_members where group_id = p_group_id and user_id = v_user_id) into v_is_member;
  if v_is_member then
    return jsonb_build_object('success', true, 'status', 'member');
  end if;

  -- Check 7-day cool-down after declined request
  select max(decided_at) into v_last_declined
  from public.study_group_join_requests
  where group_id = p_group_id and user_id = v_user_id and status = 'declined';

  if v_last_declined is not null and v_last_declined > now() - interval '7 days' then
    v_cooldown_days := ceil(extract(epoch from ((v_last_declined + interval '7 days') - now())) / 86400.0)::integer;
    return jsonb_build_object('success', false, 'error', 'cooldown_active', 'days_left', v_cooldown_days);
  end if;

  -- If PUBLIC group -> Join immediately
  if v_group.privacy = 'public' then
    insert into public.study_group_members (group_id, user_id, role)
    values (p_group_id, v_user_id, 'member')
    on conflict (group_id, user_id) do nothing;

    -- Add to group conversation if conversation exists
    select id into v_conv_id from public.conversations where study_group_id = p_group_id limit 1;
    if v_conv_id is not null then
      insert into public.conversation_participants (conversation_id, user_id, last_read_at)
      values (v_conv_id, v_user_id, now())
      on conflict (conversation_id, user_id) do nothing;
    end if;

    -- Update member count
    update public.study_groups set member_count = member_count + 1 where id = p_group_id;

    return jsonb_build_object('success', true, 'status', 'joined');
  end if;

  -- For PRIVATE group -> Check pending limit (max 10 across all groups)
  select count(*) into v_pending_count
  from public.study_group_join_requests
  where user_id = v_user_id and status = 'pending';

  if v_pending_count >= 10 then
    return jsonb_build_object('success', false, 'error', 'max_pending_reached');
  end if;

  -- Insert pending join request
  insert into public.study_group_join_requests (group_id, user_id, message, status)
  values (p_group_id, v_user_id, substring(trim(coalesce(p_message, '')) from 1 for 200), 'pending')
  on conflict (group_id, user_id) where status = 'pending'
  do update set message = substring(trim(coalesce(p_message, '')) from 1 for 200), created_at = now()
  returning id into v_request_id;

  return jsonb_build_object('success', true, 'status', 'pending', 'request_id', v_request_id);
end;
$$;

grant execute on function public.request_to_join_group(uuid, text) to authenticated;

-- 4.3 RPC: cancel_join_request
create or replace function public.cancel_join_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  update public.study_group_join_requests
  set status = 'cancelled'
  where id = p_request_id and user_id = v_user_id and status = 'pending';

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.cancel_join_request(uuid) to authenticated;

-- 4.4 RPC: decide_join_request
create or replace function public.decide_join_request(
  p_request_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_req record;
  v_conv_id uuid;
begin
  if p_decision not in ('accepted', 'declined') then
    return jsonb_build_object('success', false, 'error', 'invalid_decision');
  end if;

  select * into v_req from public.study_group_join_requests where id = p_request_id;
  if v_req.id is null then
    return jsonb_build_object('success', false, 'error', 'request_not_found');
  end if;

  if not is_group_admin(v_req.group_id, v_user_id) then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  if v_req.status <> 'pending' then
    return jsonb_build_object('success', true, 'status', v_req.status);
  end if;

  if p_decision = 'accepted' then
    -- Add to study_group_members
    insert into public.study_group_members (group_id, user_id, role)
    values (v_req.group_id, v_req.user_id, 'member')
    on conflict (group_id, user_id) do nothing;

    -- Add to conversation_participants
    select id into v_conv_id from public.conversations where study_group_id = v_req.group_id limit 1;
    if v_conv_id is not null then
      insert into public.conversation_participants (conversation_id, user_id, last_read_at)
      values (v_conv_id, v_req.user_id, now())
      on conflict (conversation_id, user_id) do nothing;
    end if;

    -- Update member count
    update public.study_groups
    set member_count = (select count(*) from public.study_group_members where group_id = v_req.group_id)
    where id = v_req.group_id;

    update public.study_group_join_requests
    set status = 'accepted', decided_by = v_user_id, decided_at = now()
    where id = p_request_id;
  else
    update public.study_group_join_requests
    set status = 'declined', decided_by = v_user_id, decided_at = now()
    where id = p_request_id;
  end if;

  return jsonb_build_object('success', true, 'decision', p_decision);
end;
$$;

grant execute on function public.decide_join_request(uuid, text) to authenticated;

-- 4.5 RPC: get_group_overview
create or replace function public.get_group_overview(p_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_group record;
  v_is_member boolean;
  v_my_role text;
  v_members jsonb;
  v_rankings jsonb;
  v_sessions jsonb;
  v_conv_id uuid;
  v_pending_reqs jsonb := '[]'::jsonb;
begin
  select * into v_group from public.study_groups where id = p_group_id;
  if v_group.id is null then
    return jsonb_build_object('success', false, 'error', 'group_not_found');
  end if;

  select role into v_my_role
  from public.study_group_members
  where group_id = p_group_id and user_id = v_user_id;

  v_is_member := (v_my_role is not null);

  -- Fetch conversation_id
  select id into v_conv_id from public.conversations where study_group_id = p_group_id limit 1;

  -- Non-members get Teaser payload only
  if not v_is_member then
    return jsonb_build_object(
      'success', true,
      'is_member', false,
      'group', jsonb_build_object(
        'id', v_group.id,
        'name', v_group.name,
        'description', v_group.description,
        'subject', v_group.subject,
        'privacy', v_group.privacy,
        'member_count', v_group.member_count,
        'owner_id', v_group.owner_id
      )
    );
  end if;

  -- Members get full detailed payload
  select jsonb_agg(
    jsonb_build_object(
      'id', sgm.id,
      'user_id', sgm.user_id,
      'role', sgm.role,
      'joined_at', sgm.joined_at,
      'profile', jsonb_build_object(
        'user_id', cp.user_id,
        'username', cp.username,
        'full_name', cp.full_name,
        'user_img', cp.user_img,
        'xp_points', cp.xp_points,
        'level', cp.level
      )
    )
  ) into v_members
  from public.study_group_members sgm
  left join public.community_profiles cp on cp.user_id = sgm.user_id
  where sgm.group_id = p_group_id;

  -- Fetch rankings
  select jsonb_agg(
    jsonb_build_object(
      'user_id', cp.user_id,
      'full_name', cp.full_name,
      'username', cp.username,
      'user_img', cp.user_img,
      'xp_points', coalesce(cp.xp_points, 0)
    )
  ) into v_rankings
  from public.study_group_members sgm
  join public.community_profiles cp on cp.user_id = sgm.user_id
  where sgm.group_id = p_group_id
  order by coalesce(cp.xp_points, 0) desc
  limit 10;

  -- Fetch sessions
  select jsonb_agg(
    jsonb_build_object(
      'id', gss.id,
      'group_id', gss.group_id,
      'title', gss.title,
      'subject', gss.subject,
      'scheduled_start', gss.scheduled_start,
      'duration_minutes', gss.duration_minutes,
      'status', gss.status
    )
  ) into v_sessions
  from public.group_study_sessions gss
  where gss.group_id = p_group_id
  order by gss.scheduled_start asc;

  -- If owner/admin, fetch pending requests
  if v_my_role in ('owner', 'admin') then
    select jsonb_agg(
      jsonb_build_object(
        'id', req.id,
        'user_id', req.user_id,
        'message', req.message,
        'created_at', req.created_at,
        'profile', jsonb_build_object(
          'user_id', cp.user_id,
          'username', cp.username,
          'full_name', cp.full_name,
          'user_img', cp.user_img,
          'xp_points', cp.xp_points,
          'level', cp.level
        )
      )
    ) into v_pending_reqs
    from public.study_group_join_requests req
    join public.community_profiles cp on cp.user_id = req.user_id
    where req.group_id = p_group_id and req.status = 'pending'
    order by req.created_at desc;
  end if;

  return jsonb_build_object(
    'success', true,
    'is_member', true,
    'my_role', v_my_role,
    'conversation_id', v_conv_id,
    'group', jsonb_build_object(
      'id', v_group.id,
      'name', v_group.name,
      'description', v_group.description,
      'subject', v_group.subject,
      'privacy', v_group.privacy,
      'member_count', v_group.member_count,
      'owner_id', v_group.owner_id
    ),
    'members', coalesce(v_members, '[]'::jsonb),
    'rankings', coalesce(v_rankings, '[]'::jsonb),
    'sessions', coalesce(v_sessions, '[]'::jsonb),
    'pending_requests', coalesce(v_pending_reqs, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_group_overview(uuid) to authenticated;

-- 4.6 Group Management RPCs
create or replace function public.leave_group(p_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_conv_id uuid;
begin
  select role into v_role from public.study_group_members where group_id = p_group_id and user_id = v_user_id;

  if v_role = 'owner' then
    return jsonb_build_object('success', false, 'error', 'owner_cannot_leave');
  end if;

  delete from public.study_group_members where group_id = p_group_id and user_id = v_user_id;

  select id into v_conv_id from public.conversations where study_group_id = p_group_id limit 1;
  if v_conv_id is not null then
    delete from public.conversation_participants where conversation_id = v_conv_id and user_id = v_user_id;
  end if;

  update public.study_groups
  set member_count = (select count(*) from public.study_group_members where group_id = p_group_id)
  where id = p_group_id;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.leave_group(uuid) to authenticated;

create or replace function public.remove_group_member(
  p_group_id uuid,
  p_target_user_id uuid,
  p_ban boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_my_role text;
  v_target_role text;
  v_conv_id uuid;
begin
  if not is_group_admin(p_group_id, v_user_id) then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  select role into v_my_role from public.study_group_members where group_id = p_group_id and user_id = v_user_id;
  select role into v_target_role from public.study_group_members where group_id = p_group_id and user_id = p_target_user_id;

  if v_target_role = 'owner' then
    return jsonb_build_object('success', false, 'error', 'cannot_remove_owner');
  end if;

  if v_my_role <> 'owner' and v_target_role = 'admin' then
    return jsonb_build_object('success', false, 'error', 'admin_cannot_remove_admin');
  end if;

  delete from public.study_group_members where group_id = p_group_id and user_id = p_target_user_id;

  select id into v_conv_id from public.conversations where study_group_id = p_group_id limit 1;
  if v_conv_id is not null then
    delete from public.conversation_participants where conversation_id = v_conv_id and user_id = p_target_user_id;
  end if;

  if p_ban then
    insert into public.study_group_bans (group_id, user_id, banned_by)
    values (p_group_id, p_target_user_id, v_user_id)
    on conflict do nothing;
  end if;

  update public.study_groups
  set member_count = (select count(*) from public.study_group_members where group_id = p_group_id)
  where id = p_group_id;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.remove_group_member(uuid, uuid, boolean) to authenticated;

create or replace function public.set_group_member_role(
  p_group_id uuid,
  p_target_user_id uuid,
  p_new_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_my_role text;
begin
  select role into v_my_role from public.study_group_members where group_id = p_group_id and user_id = v_user_id;

  if v_my_role <> 'owner' then
    return jsonb_build_object('success', false, 'error', 'owner_only');
  end if;

  if p_new_role not in ('admin', 'member') then
    return jsonb_build_object('success', false, 'error', 'invalid_role');
  end if;

  update public.study_group_members
  set role = p_new_role
  where group_id = p_group_id and user_id = p_target_user_id and role <> 'owner';

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.set_group_member_role(uuid, uuid, text) to authenticated;

create or replace function public.transfer_group_ownership(
  p_group_id uuid,
  p_new_owner_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_my_role text;
begin
  select role into v_my_role from public.study_group_members where group_id = p_group_id and user_id = v_user_id;

  if v_my_role <> 'owner' then
    return jsonb_build_object('success', false, 'error', 'owner_only');
  end if;

  if not is_group_member(p_group_id, p_new_owner_id) then
    return jsonb_build_object('success', false, 'error', 'target_not_member');
  end if;

  update public.study_group_members set role = 'admin' where group_id = p_group_id and user_id = v_user_id;
  update public.study_group_members set role = 'owner' where group_id = p_group_id and user_id = p_new_owner_id;
  update public.study_groups set owner_id = p_new_owner_id where id = p_group_id;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.transfer_group_ownership(uuid, uuid) to authenticated;

create or replace function public.update_group_privacy(
  p_group_id uuid,
  p_new_privacy text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if not is_group_admin(p_group_id, v_user_id) then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  if p_new_privacy not in ('public', 'private', 'hidden') then
    return jsonb_build_object('success', false, 'error', 'invalid_privacy');
  end if;

  update public.study_groups set privacy = p_new_privacy, updated_at = now() where id = p_group_id;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.update_group_privacy(uuid, text) to authenticated;

notify pgrst, 'reload schema';
