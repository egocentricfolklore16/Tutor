alter table public.profiles add column if not exists user_img text;

insert into storage.buckets (id, name, public)
values ('user-images', 'user-images', false)
on conflict (id) do nothing;

drop policy if exists "Users upload their profile image" on storage.objects;
create policy "Users upload their profile image" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'user-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users view their profile image" on storage.objects;
create policy "Users view their profile image" on storage.objects
  for select to authenticated
  using (bucket_id = 'user-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete their profile image" on storage.objects;
create policy "Users delete their profile image" on storage.objects
  for delete to authenticated
  using (bucket_id = 'user-images' and (storage.foldername(name))[1] = auth.uid()::text);

notify pgrst, 'reload schema';