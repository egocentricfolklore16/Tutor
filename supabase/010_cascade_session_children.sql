-- Allow a study session to be deleted together with its dependent records.
-- The app currently uses notes and flashcards; the newer study_* tables already use cascade.

alter table if exists public.notes
  drop constraint if exists notes_session_id_fkey;

alter table if exists public.notes
  add constraint notes_session_id_fkey
  foreign key (session_id) references public."Study"(id) on delete cascade;

alter table if exists public.flashcards
  drop constraint if exists flashcards_session_id_fkey;

alter table if exists public.flashcards
  add constraint flashcards_session_id_fkey
  foreign key (session_id) references public."Study"(id) on delete cascade;

notify pgrst, 'reload schema';
