-- Create table for completed/archived study session history
create table if not exists public.study_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  topic text not null,
  duration_minutes integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz not null default now(),
  status text not null default 'completed',
  xp_earned integer not null default 50
);

alter table public.study_history enable row level security;

drop policy if exists "Users manage their study history" on public.study_history;
create policy "Users manage their study history"
  on public.study_history
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists study_history_user_completed_idx
  on public.study_history (user_id, completed_at desc);

notify pgrst, 'reload schema';
