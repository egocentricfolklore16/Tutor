-- Planner fields for existing study sessions.
alter table public."Study"
  add column if not exists recurring text not null default 'none',
  add column if not exists reminder_minutes integer not null default 15,
  add column if not exists deadline date,
  add column if not exists activity_type text not null default 'study';

-- User-owned time blocks created from the planner.
create table if not exists public.time_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  block_date date not null,
  start_time time not null,
  end_time time not null,
  purpose text not null,
  created_at timestamptz not null default now(),
  constraint time_blocks_valid_range check (end_time > start_time)
);

alter table public.time_blocks enable row level security;

drop policy if exists "Users manage their time blocks" on public.time_blocks;
create policy "Users manage their time blocks"
  on public.time_blocks
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists time_blocks_user_date_idx
  on public.time_blocks (user_id, block_date);

notify pgrst, 'reload schema';
