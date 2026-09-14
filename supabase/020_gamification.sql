-- Add xp_points and gems to public.profiles table
alter table public.profiles add column if not exists xp_points integer not null default 0;
alter table public.profiles add column if not exists gems integer not null default 0;

-- RPC function to atomically award XP and Gems to a user
create or replace function public.award_user_rewards(
  activity_user_id uuid,
  xp_amount integer default 0,
  gems_amount integer default 0
)
returns table (xp_points integer, gems integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_xp integer;
  updated_gems integer;
begin
  if auth.uid() is null or auth.uid() != activity_user_id then
    raise exception 'Cannot update another user rewards';
  end if;

  update public.profiles
  set xp_points = greatest(0, public.profiles.xp_points + xp_amount),
      gems = greatest(0, public.profiles.gems + gems_amount)
  where user_id = activity_user_id
  returning public.profiles.xp_points, public.profiles.gems
  into updated_xp, updated_gems;

  return query select updated_xp, updated_gems;
end;
$$;

grant execute on function public.award_user_rewards(uuid, integer, integer) to authenticated;
