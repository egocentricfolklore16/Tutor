-- Enable RLS and add policies for daily_session_tracking
alter table public.daily_session_tracking enable row level security;

drop policy if exists "Users can view their daily session tracking" on public.daily_session_tracking;
create policy "Users can view their daily session tracking"
  on public.daily_session_tracking
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own daily session tracking" on public.daily_session_tracking;
create policy "Users can insert their own daily session tracking"
  on public.daily_session_tracking
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own daily session tracking" on public.daily_session_tracking;
create policy "Users can update their own daily session tracking"
  on public.daily_session_tracking
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
