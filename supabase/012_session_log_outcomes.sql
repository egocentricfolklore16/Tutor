alter table public.study_session_logs
  add column if not exists submitted_answer text,
  add column if not exists correct_answer text,
  add column if not exists is_correct boolean,
  add column if not exists outcome text,
  add column if not exists answered_at timestamptz;

create index if not exists study_session_logs_user_outcomes_idx
  on public.study_session_logs (user_id, is_correct, created_at desc);

create index if not exists study_session_logs_session_idx
  on public.study_session_logs (session_id);

notify pgrst, 'reload schema';