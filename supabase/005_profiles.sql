create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  full_name text,
  learner_type text,
  education_level text,
  primary_goal text,
  subjects text[] not null default '{}',
  weekly_hours integer,
  study_days text[] not null default '{}',
  preferred_time text,
  learning_style text,
  accessibility_needs text[] not null default '{}',
  collaboration_interest text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users manage their profile" on public.profiles;
create policy "Users manage their profile" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_profiles_updated_at();