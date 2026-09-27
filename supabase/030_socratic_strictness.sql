-- Adds per-user Socratic strictness preference for the AI tutor.

create type public.socratic_strictness as enum (
  'always_guide',      -- never gives the answer, only leading questions/hints
  'hints_then_answer', -- gives 1-2 hints, then the direct answer if user is stuck
  'direct_help'        -- answers directly, explains after
);

-- Adjust table name if your user settings already live elsewhere (e.g. profiles).
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  socratic_strictness public.socratic_strictness not null default 'hints_then_answer',
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

create policy "Users manage their own preferences"
  on public.user_preferences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Upsert helper so the frontend can call one RPC instead of hand-rolling upsert logic.
create or replace function public.set_socratic_strictness(p_strictness public.socratic_strictness)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_preferences (user_id, socratic_strictness, updated_at)
  values (auth.uid(), p_strictness, now())
  on conflict (user_id)
  do update set socratic_strictness = excluded.socratic_strictness, updated_at = now();
end;
$$;

-- Server-side log of real AI-call failures (retries, fallback, total outage).
-- The user never sees these — this is how YOU see what's actually breaking.
create table if not exists public.ai_error_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  stage text not null,
  message text,
  created_at timestamptz not null default now()
);

alter table public.ai_error_log enable row level security;

-- Only service role (the Edge Function) writes here; no one else can read/write via RLS.
create policy "No client access to error log"
  on public.ai_error_log
  for all
  using (false)
  with check (false);
