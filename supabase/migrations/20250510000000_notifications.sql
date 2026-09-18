-- Migration: Web Push Notifications
-- Date: 2025-05-10
-- Description: Schema, tables, functions, and cron job for Web Push Notifications

-- 1.1 Extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 1.2 Table push_subscriptions
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
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

-- 1.3 Table notification_preferences
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_enabled boolean not null default true,
  session_reminders boolean not null default true,
  streak_alerts boolean not null default true,
  inactivity_nudges boolean not null default true,
  updated_at timestamptz default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "Users manage their notification preferences" on public.notification_preferences;
create policy "Users manage their notification preferences"
  on public.notification_preferences
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 1.4 Table notification_log
create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('session_reminder','streak_at_risk','streak_final','inactivity')),
  dedupe_key text not null,
  status text not null default 'claimed' check (status in ('claimed','sent','failed','no_subscription')),
  payload jsonb,
  created_at timestamptz default now(),
  unique (user_id, dedupe_key)
);

create index if not exists notification_log_user_kind_created_idx
  on public.notification_log (user_id, kind, created_at desc);

alter table public.notification_log enable row level security;
-- Service role only, no client policies added.

-- 1.5 Column: last_seen_at on public.profiles
alter table public.profiles add column if not exists last_seen_at timestamptz;

-- 1.6 SQL function claim_due_notifications
create or replace function public.claim_due_notifications(p_now timestamptz default now())
returns table (
  id uuid,
  user_id uuid,
  kind text,
  dedupe_key text,
  payload jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Threshold constants
  C_QUIET_START CONSTANT integer := 23;            -- 23:00 local
  C_QUIET_END CONSTANT integer := 7;               -- 07:00 local
  C_STREAK_RISK_START CONSTANT numeric := 17.0;    -- 20:00 local
  C_STREAK_RISK_END CONSTANT numeric := 19.5;      -- 22:30 local
  C_STREAK_FINAL_START CONSTANT numeric := 19.5;   -- 22:30 local
  C_STREAK_FINAL_END CONSTANT numeric := 23.0;     -- 02:00 local
  C_INACTIVITY_START CONSTANT numeric := 14.0;     -- 17:00 local
  C_INACTIVITY_END CONSTANT numeric := 20.0;       -- 23:00 local
  C_INACTIVITY_MAX_NUDGES CONSTANT integer := 3;
  C_GRACE_INTERVAL CONSTANT interval := interval '2 minutes';

  r_user record;
  tz text;
  local_ts timestamp;
  local_hour integer;
  streak_day date;
  hours_into_streak_day numeric;
  is_quiet boolean;

  p_push_enabled boolean;
  p_session_reminders boolean;
  p_streak_alerts boolean;
  p_inactivity_nudges boolean;

  r_session record;
  base_date date;
  session_start_time time;
  occurrence_local_date date;
  start_ts_local timestamp;
  start_utc timestamptz;
  rem_mins integer;
  mins_until integer;

  v_streak_record record;
  v_title text;
  v_body text;
  v_url text;
  v_tag text;
  v_dedupe text;

  v_inactivity_count integer;
  v_streak_eligible boolean;
begin
  -- Loop through all active users in profiles
  for r_user in
    select p.user_id, p.timezone, p.last_seen_at, p.onboarding_completed
    from public.profiles p
  loop
    tz := coalesce(r_user.timezone, 'UTC');

    -- Calculate user local timestamp, handle invalid timezone strings gracefully
    begin
      local_ts := p_now at time zone tz;
    exception when others then
      tz := 'UTC';
      local_ts := p_now at time zone tz;
    end;

    local_hour := extract(hour from local_ts);
    streak_day := (local_ts - interval '3 hours')::date;
    hours_into_streak_day := extract(epoch from (local_ts - (streak_day + interval '3 hours'))) / 3600.0;

    -- Quiet hours check: between 23:00 and 07:00 local time
    is_quiet := (local_hour >= C_QUIET_START or local_hour < C_QUIET_END);

    -- Load user notification preferences (missing row = defaults all true)
    select
      coalesce(np.push_enabled, true),
      coalesce(np.session_reminders, true),
      coalesce(np.streak_alerts, true),
      coalesce(np.inactivity_nudges, true)
    into
      p_push_enabled,
      p_session_reminders,
      p_streak_alerts,
      p_inactivity_nudges
    from (select r_user.user_id as uid) u
    left join public.notification_preferences np on np.user_id = u.uid;

    if not p_push_enabled then
      continue;
    end if;

    ---------------------------------------------------------------------------
    -- KIND 1: SESSION REMINDERS
    ---------------------------------------------------------------------------
    if p_session_reminders then
      for r_session in
        select s.id, s."Subject", s."Topic", s."Date", s."Start", s."Duration",
               s.recurring, s.recurring_day, s.reminder_minutes, s.muted, s.completed, s.session_status
        from public."Study" s
        where s.user_id = r_user.user_id
          and coalesce(s.muted, false) = false
          and coalesce(s.completed, false) = false
          and coalesce(s.session_status, 'active') = 'active'
      loop
        base_date := r_session."Date";
        session_start_time := coalesce(r_session."Start", '09:00'::time);
        occurrence_local_date := null;

        -- Recurrence evaluation
        if r_session.recurring is null or r_session.recurring = 'none' then
          occurrence_local_date := base_date;
        elsif r_session.recurring = 'daily' then
          if local_ts::date >= base_date then
            occurrence_local_date := local_ts::date;
          end if;
        elsif r_session.recurring = 'weekly' then
          if local_ts::date >= base_date and (
            (r_session.recurring_day is not null and extract(dow from local_ts::date) = r_session.recurring_day) or
            (r_session.recurring_day is null and extract(dow from local_ts::date) = extract(dow from base_date))
          ) then
            occurrence_local_date := local_ts::date;
          end if;
        elsif r_session.recurring = 'monthly' then
          if local_ts::date >= base_date and extract(day from local_ts::date) = extract(day from base_date) then
            occurrence_local_date := local_ts::date;
          end if;
        end if;

        if occurrence_local_date is not null then
          start_ts_local := (occurrence_local_date + session_start_time);
          start_utc := start_ts_local at time zone tz;
          rem_mins := coalesce(r_session.reminder_minutes, 15);

          -- Due condition with 2-minute grace window
          if p_now >= start_utc - make_interval(mins => rem_mins) and p_now < start_utc + C_GRACE_INTERVAL then
            v_dedupe := 'session:' || r_session.id || ':' || occurrence_local_date;
            mins_until := greatest(0, ceil(extract(epoch from (start_utc - p_now)) / 60.0));

            if mins_until = 0 then
              v_body := coalesce(r_session."Subject", 'Study') || ' - ' || coalesce(r_session."Topic", 'Session') || ' starts now';
            else
              v_body := coalesce(r_session."Subject", 'Study') || ' - ' || coalesce(r_session."Topic", 'Session') || ' starts in ' || mins_until || ' minutes';
            end if;

            v_url := '/Study/' || r_session.id;
            v_tag := 'session-' || r_session.id || '-' || occurrence_local_date;

            insert into public.notification_log (user_id, kind, dedupe_key, status, payload)
            values (
              r_user.user_id,
              'session_reminder',
              v_dedupe,
              'claimed',
              jsonb_build_object(
                'title', 'Study session starting soon',
                'body', v_body,
                'url', v_url,
                'tag', v_tag
              )
            )
            on conflict (user_id, dedupe_key) do nothing;
          end if;
        end if;
      end loop;
    end if;

    ---------------------------------------------------------------------------
    -- KIND 2: STREAK AT RISK & STREAK FINAL
    ---------------------------------------------------------------------------
    v_streak_eligible := false;
    if p_streak_alerts and not is_quiet then
      select us.current_streak, us.last_active_date, us.freeze_tokens_available
      into v_streak_record
      from public.users_streaks us
      where us.user_id = r_user.user_id;

      if v_streak_record.current_streak > 0 and (v_streak_record.last_active_date is null or v_streak_record.last_active_date < streak_day) then
        v_streak_eligible := true;

        -- Streak at risk: hours_into_streak_day >= 17 (20:00 local) and < 19.5 (22:30 local)
        if hours_into_streak_day >= C_STREAK_RISK_START and hours_into_streak_day < C_STREAK_RISK_END then
          v_dedupe := 'streak:streak_at_risk:' || streak_day;
          v_title := 'Your ' || v_streak_record.current_streak || '-day streak is at risk';
          v_body := 'Do a quick session before 3am to keep it going.';
          if coalesce(v_streak_record.freeze_tokens_available, 0) > 0 then
            v_body := v_body || ' You have a streak freeze available.';
          end if;

          insert into public.notification_log (user_id, kind, dedupe_key, status, payload)
          values (
            r_user.user_id,
            'streak_at_risk',
            v_dedupe,
            'claimed',
            jsonb_build_object(
              'title', v_title,
              'body', v_body,
              'url', '/Dashboard',
              'tag', 'streak-' || streak_day
            )
          )
          on conflict (user_id, dedupe_key) do nothing;

        -- Streak final: hours_into_streak_day >= 19.5 (22:30 local) and < 23 (02:00 local)
        elsif hours_into_streak_day >= C_STREAK_FINAL_START and hours_into_streak_day < C_STREAK_FINAL_END then
          v_dedupe := 'streak:streak_final:' || streak_day;
          v_title := 'Last chance to save your ' || v_streak_record.current_streak || '-day streak';
          v_body := 'Even one Pomodoro counts.';
          if coalesce(v_streak_record.freeze_tokens_available, 0) > 0 then
            v_body := v_body || ' You have a streak freeze available.';
          end if;

          insert into public.notification_log (user_id, kind, dedupe_key, status, payload)
          values (
            r_user.user_id,
            'streak_final',
            v_dedupe,
            'claimed',
            jsonb_build_object(
              'title', v_title,
              'body', v_body,
              'url', '/Dashboard',
              'tag', 'streak-' || streak_day
            )
          )
          on conflict (user_id, dedupe_key) do nothing;
        end if;
      end if;
    end if;

    ---------------------------------------------------------------------------
    -- KIND 3: INACTIVITY NUDGES
    ---------------------------------------------------------------------------
    if p_inactivity_nudges and not is_quiet then
      if coalesce(r_user.onboarding_completed, false) = true
         and hours_into_streak_day >= C_INACTIVITY_START
         and hours_into_streak_day < C_INACTIVITY_END
         and (r_user.last_seen_at is null or r_user.last_seen_at < ((streak_day + interval '3 hours') at time zone tz))
         and not v_streak_eligible then

        -- Check suppression 2 (anti-nag: max 3 unanswered nudges after last_seen_at)
        select count(*) into v_inactivity_count
        from public.notification_log nl
        where nl.user_id = r_user.user_id
          and nl.kind = 'inactivity'
          and (r_user.last_seen_at is null or nl.created_at > r_user.last_seen_at);

        if v_inactivity_count < C_INACTIVITY_MAX_NUDGES then
          v_dedupe := 'inactivity:' || streak_day;
          v_title := 'Your study time is waiting';
          v_body := 'You haven''t opened Hyper Tutor today. A 15-minute session keeps you on track.';

          insert into public.notification_log (user_id, kind, dedupe_key, status, payload)
          values (
            r_user.user_id,
            'inactivity',
            v_dedupe,
            'claimed',
            jsonb_build_object(
              'title', v_title,
              'body', v_body,
              'url', '/Dashboard',
              'tag', 'inactivity-' || streak_day
            )
          )
          on conflict (user_id, dedupe_key) do nothing;
        end if;
      end if;
    end if;

  end loop;

  -- Return newly inserted log rows in this call
  return query
  select nl.id, nl.user_id, nl.kind, nl.dedupe_key, nl.payload
  from public.notification_log nl
  where nl.status = 'claimed'
    and nl.created_at >= (p_now - interval '10 seconds');
end;
$$;

revoke all on function public.claim_due_notifications(timestamptz) from public, anon, authenticated;
grant execute on function public.claim_due_notifications(timestamptz) to service_role;

-- 1.7 SQL function touch_last_seen
create or replace function public.touch_last_seen()
returns void
language sql
security invoker
set search_path = public
as $$
  update public.profiles
  set last_seen_at = now()
  where user_id = auth.uid();
$$;

grant execute on function public.touch_last_seen() to authenticated;

-- 1.8 Scheduler
do $$
begin
  if exists (select 1 from cron.job where jobname = 'send-notifications-every-minute') then
    perform cron.unschedule('send-notifications-every-minute');
  end if;
end;
$$;

select cron.schedule(
  'send-notifications-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://dktyutcxgijasiahvhni.supabase.co/functions/v1/send-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1), '')
    ),
    body := '{}'::jsonb
  );
  $$
);

notify pgrst, 'reload schema';
