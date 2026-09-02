create table if not exists public.users_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_active_date date,
  freeze_tokens_available integer not null default 0 check (freeze_tokens_available >= 0),
  updated_at timestamptz not null default now()
);

alter table public.users_streaks enable row level security;
drop policy if exists "Users manage their streak" on public.users_streaks;
create policy "Users manage their streak" on public.users_streaks
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.update_user_streak(
  activity_user_id uuid,
  user_timezone text default 'UTC',
  cutoff_hour integer default 3
)
returns table (current_streak integer, longest_streak integer, last_active_date date, freeze_tokens_available integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  activity_date date;
  existing public.users_streaks%rowtype;
  next_current integer;
  next_longest integer;
  next_freezes integer;
  day_gap integer;
begin
  if activity_user_id <> auth.uid() then
    raise exception 'Cannot update another user streak';
  end if;
  if cutoff_hour < 0 or cutoff_hour > 23 then
    raise exception 'Invalid cutoff hour';
  end if;

  activity_date := ((now() at time zone user_timezone)::date -
    case when extract(hour from (now() at time zone user_timezone)) < cutoff_hour then 1 else 0 end);

  insert into public.users_streaks (user_id)
  values (activity_user_id)
  on conflict (user_id) do nothing;

  select * into existing from public.users_streaks where user_id = activity_user_id for update;

  if existing.last_active_date = activity_date then
    return query select existing.current_streak, existing.longest_streak, existing.last_active_date, existing.freeze_tokens_available;
    return;
  end if;

  day_gap := activity_date - existing.last_active_date;
  next_freezes := existing.freeze_tokens_available;
  if existing.last_active_date is null then
    next_current := 1;
  elsif day_gap = 1 then
    next_current := existing.current_streak + 1;
  elsif day_gap = 2 and existing.freeze_tokens_available > 0 then
    next_current := existing.current_streak + 1;
    next_freezes := existing.freeze_tokens_available - 1;
  else
    next_current := 1;
  end if;
  next_longest := greatest(existing.longest_streak, next_current);

  update public.users_streaks
  set current_streak = next_current,
      longest_streak = next_longest,
      last_active_date = activity_date,
      freeze_tokens_available = next_freezes,
      updated_at = now()
  where user_id = activity_user_id;

  return query select next_current, next_longest, activity_date, next_freezes;
end;
$$;

grant execute on function public.update_user_streak(uuid, text, integer) to authenticated;
notify pgrst, 'reload schema';
