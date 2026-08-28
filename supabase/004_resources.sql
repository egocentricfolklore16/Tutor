-- Resource storage and metadata setup for the existing resources table.
-- Run this migration in the Supabase SQL Editor.

alter table public.resources enable row level security;

alter table public.resources drop constraint if exists resources_user_id_key;
drop index if exists public.resources_user_id_key;

drop policy if exists "Users manage their resources" on public.resources;
drop policy if exists "Users upload their resources" on storage.objects;
drop policy if exists "Users read their resources" on storage.objects;
drop policy if exists "Users delete their resources" on storage.objects;

create policy "Users manage their resources" on public.resources
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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
