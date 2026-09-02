-- Fields and records used by the Study Planner weekly statistics.
alter table public."Study"
  add column if not exists completed boolean not null default false;

create table if not exists public.study_pomodoros (
  id uuid primary key default gen_random_uuid(),
  session_id bigint references public."Study"(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now()
);

alter table public.study_pomodoros enable row level security;

drop policy if exists "Users manage their pomodoros" on public.study_pomodoros;
create policy "Users manage their pomodoros"
  on public.study_pomodoros
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists study_pomodoros_user_completed_idx
  on public.study_pomodoros (user_id, completed_at desc);

notify pgrst, 'reload schema';
