-- Add timeline column to public.study_history
alter table public.study_history add column if not exists timeline jsonb not null default '[]'::jsonb;
