create table if not exists public.study_session_logs (
  id uuid primary key default gen_random_uuid(),
  session_id bigint not null references public."Study"(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null default '',
  concept text not null default '',
  question text not null,
  created_at timestamptz not null default now()
);

alter table public.study_session_logs enable row level security;

drop policy if exists "Users manage their session logs" on public.study_session_logs;
create policy "Users manage their session logs" on public.study_session_logs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';