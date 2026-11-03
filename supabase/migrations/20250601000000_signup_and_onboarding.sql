-- Migration: Signup confirmation and onboarding persistence schema changes

-- 1. Ensure profiles table has onboarding_step column
alter table public.profiles add column if not exists onboarding_step integer default 0;

-- 2. Create onboarding_answers table for per-step answer persistence across devices
create table if not exists public.onboarding_answers (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_key text not null,
  answer jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, question_key)
);

-- 3. Enable RLS on onboarding_answers
alter table public.onboarding_answers enable row level security;

-- 4. RLS policies for onboarding_answers
drop policy if exists "Users can manage their own onboarding answers" on public.onboarding_answers;
create policy "Users can manage their own onboarding answers"
  on public.onboarding_answers
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trigger to update updated_at timestamp on onboarding_answers
create or replace function public.set_onboarding_answers_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists onboarding_answers_updated_at on public.onboarding_answers;
create trigger onboarding_answers_updated_at
before update on public.onboarding_answers
for each row execute function public.set_onboarding_answers_updated_at();

notify pgrst, 'reload schema';
