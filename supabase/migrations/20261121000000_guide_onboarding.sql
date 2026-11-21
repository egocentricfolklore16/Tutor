-- Lumo Guide per-user onboarding state.
-- Review and apply this migration manually. It is not applied by the app.

alter table public.profiles
  add column if not exists onboarding jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
