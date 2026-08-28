alter table public.profiles add column if not exists settings_subject text;
alter table public.profiles add column if not exists current_topic text;
alter table public.profiles add column if not exists curriculum_standard text not null default 'None/General';
alter table public.profiles add column if not exists knowledge_gaps text[] not null default '{}';
alter table public.profiles add column if not exists socratic_strictness text not null default 'Always Guide First';
alter table public.profiles add column if not exists language text not null default 'English';
alter table public.profiles add column if not exists reduced_motion boolean not null default false;

notify pgrst, 'reload schema';
