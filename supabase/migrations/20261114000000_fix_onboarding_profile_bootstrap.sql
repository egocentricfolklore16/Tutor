alter table public.profiles
  add column if not exists onboarding_step integer not null default 0;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_username text;
  next_full_name text;
begin
  next_username := coalesce(
    nullif(trim(new.raw_user_meta_data->>'userName'), ''),
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'Learner'
  );

  next_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'userName'), ''),
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'Learner'
  );

  insert into public.profiles (user_id, username, full_name)
  values (new.id, next_username, next_full_name)
  on conflict (user_id) do nothing;

  insert into public.subscriptions (user_id, plan_id, status, current_period_start)
  values (new.id, 'free', 'active', now())
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

insert into public.profiles (user_id, username, full_name)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'userName'), ''),
    nullif(trim(u.raw_user_meta_data->>'username'), ''),
    nullif(split_part(u.email, '@', 1), ''),
    'Learner'
  ),
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'userName'), ''),
    nullif(trim(u.raw_user_meta_data->>'username'), ''),
    nullif(split_part(u.email, '@', 1), ''),
    'Learner'
  )
from auth.users u
left join public.profiles p on p.user_id = u.id
where p.user_id is null;

notify pgrst, 'reload schema';
