-- Migration for AI Tutor Layer (Groq-backed)
-- Creates tables for study sessions, library resources, knowledge gaps, notes, study plan, and token usage tracking.

-- 1. Study Sessions
create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  curriculum_standard text not null default 'None/General',
  duration_minutes integer not null default 30,
  scheduled_for timestamptz,
  status text not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Library Resources
create table if not exists public.library_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type text not null default 'article',
  short_description text not null default '',
  curriculum_standard text not null default 'None/General',
  topic text not null default '',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Knowledge Gaps
create table if not exists public.knowledge_gaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  concept text not null,
  curriculum_standard text not null default 'None/General',
  severity text not null default 'moderate',
  evidence text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. AI Notes
create table if not exists public.ai_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  content text not null,
  session_id uuid,
  created_at timestamptz not null default now()
);

-- 5. Study Plan
create table if not exists public.study_plan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. AI Token Usage
create table if not exists public.ai_token_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  model text not null default '',
  created_at timestamptz not null default now()
);

-- Enable RLS on all tables
alter table public.study_sessions enable row level security;
alter table public.library_resources enable row level security;
alter table public.knowledge_gaps enable row level security;
alter table public.ai_notes enable row level security;
alter table public.study_plan enable row level security;
alter table public.ai_token_usage enable row level security;

-- Drop existing policies if any
drop policy if exists "Users manage their study sessions" on public.study_sessions;
drop policy if exists "Users manage their library resources" on public.library_resources;
drop policy if exists "Users manage their knowledge gaps" on public.knowledge_gaps;
drop policy if exists "Users manage their ai notes" on public.ai_notes;
drop policy if exists "Users manage their study plan" on public.study_plan;
drop policy if exists "Users manage their ai token usage" on public.ai_token_usage;

-- Create RLS policies
create policy "Users manage their study sessions" on public.study_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their library resources" on public.library_resources
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their knowledge gaps" on public.knowledge_gaps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their ai notes" on public.ai_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their study plan" on public.study_plan
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their ai token usage" on public.ai_token_usage
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
