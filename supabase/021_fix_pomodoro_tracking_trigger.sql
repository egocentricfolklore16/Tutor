-- Add missing timezone column to public.profiles
alter table public.profiles add column if not exists timezone text not null default 'UTC';

-- Fix the trigger function on study_pomodoros insertion
create or replace function public.update_daily_session_tracking()
returns trigger as $$
declare
  user_tz text;
begin
  select coalesce(timezone, 'UTC') into user_tz
  from public.profiles
  where user_id = new.user_id;

  if user_tz is null then
    user_tz := 'UTC';
  end if;

  insert into public.daily_session_tracking (user_id, activity_date, sessions_completed, total_study_hours)
  values (
    new.user_id,
    (now() at time zone user_tz)::date,
    1,
    0.5
  )
  on conflict (user_id, activity_date)
  do update set
    sessions_completed = daily_session_tracking.sessions_completed + 1,
    total_study_hours = daily_session_tracking.total_study_hours + 0.5,
    updated_at = now();

  return new;
end;
$$ language plpgsql;
