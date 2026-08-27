create table if not exists public.study_notes (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public."Study"(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_flashcards (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public."Study"(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  front text not null,
  back text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_resources (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public."Study"(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.study_notes enable row level security;
alter table public.study_flashcards enable row level security;
alter table public.study_resources enable row level security;

create policy "Users manage their study notes" on public.study_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their study flashcards" on public.study_flashcards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their study resources" on public.study_resources
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
