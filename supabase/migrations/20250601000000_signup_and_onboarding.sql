-- Migration: Signup confirmation and onboarding persistence schema changes

-- 1. Ensure profiles table has onboarding_step column
alter table public.profiles add column if not exists onboarding_step integer default 0;

notify pgrst, 'reload schema';
