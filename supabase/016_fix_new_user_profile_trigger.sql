-- Ensure Auth user creation cannot fail when signup metadata has no username.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_username text;
begin
  next_username := coalesce(
    nullif(trim(new.raw_user_meta_data->>'userName'), ''),
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'Learner'
  );

  insert into public.profiles (user_id, username)
  values (new.id, next_username)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

notify pgrst, 'reload schema';
