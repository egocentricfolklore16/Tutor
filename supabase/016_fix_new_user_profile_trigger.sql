-- Ensure Auth user creation cannot fail when signup metadata has no full_name.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_full_name text;
begin
  next_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'userName'), ''),
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'Learner'
  );

  insert into public.profiles (user_id, full_name)
  values (new.id, next_full_name)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

notify pgrst, 'reload schema';
