-- Migration 033 (or next sequential migration): Word Document Resource Upload Support (.doc and .docx)
-- Updates storage bucket allowed MIME types and verifies RLS access policies for the 'resources' bucket.

-- 1. Ensure the 'resources' storage bucket exists with 10MB limit and allowed MIME types.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resources',
  'resources',
  false,
  10485760, -- 10 MB in bytes
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain',
    'text/markdown',
    'text/csv'
  ]
)
on conflict (id) do update set
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain',
    'text/markdown',
    'text/csv'
  ];

-- 2. Ensure Row Level Security (RLS) policies on storage.objects for 'resources' bucket.
-- Users can only upload, read, and delete their own files scoped by auth.uid().

drop policy if exists "Users upload their resources" on storage.objects;
create policy "Users upload their resources" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'resources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users read their resources" on storage.objects;
create policy "Users read their resources" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'resources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete their resources" on storage.objects;
create policy "Users delete their resources" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'resources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Ensure session_resources RLS policy for user-owned records.
alter table public.session_resources enable row level security;

drop policy if exists "Users manage their session resources" on public.session_resources;
create policy "Users manage their session resources" on public.session_resources
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
