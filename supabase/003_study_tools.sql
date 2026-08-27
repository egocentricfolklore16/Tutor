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
  session_id uuid not null references public."Study"(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  front text not null,
  back text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public."Study"(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.resources drop constraint if exists resources_user_id_key;
drop index if exists public.resources_user_id_key;

alter table public.study_notes enable row level security;
alter table public.study_flashcards enable row level security;
alter table public.resources enable row level security;

drop policy if exists "Users manage their study notes" on public.study_notes;
drop policy if exists "Users manage their study flashcards" on public.study_flashcards;
drop policy if exists "Users manage their study resources" on public.resources;
drop policy if exists "Users upload their resources" on storage.objects;
drop policy if exists "Users read their resources" on storage.objects;
drop policy if exists "Users delete their resources" on storage.objects;

create policy "Users manage their study notes" on public.study_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their study flashcards" on public.study_flashcards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their study resources" on public.resources
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users upload their resources" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'resources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users read their resources" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'resources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete their resources" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'resources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
