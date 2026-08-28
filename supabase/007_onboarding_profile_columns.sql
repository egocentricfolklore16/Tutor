-- Add the fields collected by the onboarding flow to existing profiles tables.
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists learner_type text;
alter table public.profiles add column if not exists education_level text;
alter table public.profiles add column if not exists primary_goal text;
alter table public.profiles add column if not exists subjects text[] not null default '{}';
alter table public.profiles add column if not exists weekly_hours integer;
alter table public.profiles add column if not exists study_days text[] not null default '{}';
alter table public.profiles add column if not exists preferred_time text;
alter table public.profiles add column if not exists learning_style text;
alter table public.profiles add column if not exists accessibility_needs text[] not null default '{}';
alter table public.profiles add column if not exists collaboration_interest text;
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.profiles enable row level security;

 drop policy if exists "Users manage their profile" on public.profiles;
create policy "Users manage their profile" on public.profiles
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
