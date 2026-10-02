-- 1. Study materials must survive session deletion (detach instead of cascade).
-- session_id becomes nullable and the FK changes from CASCADE to SET NULL on all four
-- materials tables, matching the table comments' stated design.

alter table public.session_notes
  alter column session_id drop not null;
alter table public.session_notes
  drop constraint if exists session_notes_session_id_fkey,
  add constraint session_notes_session_id_fkey
    foreign key (session_id) references public."Study"(id) on delete set null;

alter table public.session_flashcards
  alter column session_id drop not null;
alter table public.session_flashcards
  drop constraint if exists session_flashcards_session_id_fkey,
  add constraint session_flashcards_session_id_fkey
    foreign key (session_id) references public."Study"(id) on delete set null;

alter table public.session_resources
  alter column session_id drop not null;
alter table public.session_resources
  drop constraint if exists session_resources_session_id_fkey,
  add constraint session_resources_session_id_fkey
    foreign key (session_id) references public."Study"(id) on delete set null;

alter table public.session_quizzes
  alter column session_id drop not null;
alter table public.session_quizzes
  drop constraint if exists session_quizzes_session_id_fkey,
  add constraint session_quizzes_session_id_fkey
    foreign key (session_id) references public."Study"(id) on delete set null;

-- 2. Atomic session completion. One call, one transaction: write history, bump the
-- streak, award XP/gems, log the pomodoro, then delete the session. Locks the Study
-- row so a duplicate/late call can't double-award or double-log.

create or replace function public.complete_study_session(
  p_session_id bigint,
  p_xp integer default 50,
  p_gems integer default 5,
  p_timeline jsonb default '[]'::jsonb,
  p_user_timezone text default 'UTC',
  p_cutoff_hour integer default 3
)
returns table(
  history_id uuid,
  current_streak integer,
  longest_streak integer,
  xp_points integer,
  gems integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public."Study"%rowtype;
  v_history_id uuid := gen_random_uuid();
  v_duration_minutes integer;
  v_streak record;
  v_rewards record;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_session
  from public."Study"
  where id = p_session_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Session not found, not yours, or already completed';
  end if;

  v_duration_minutes := round(coalesce(v_session."Duration", 0) * 60);

  insert into public.study_history (
    id, user_id, subject, topic, duration_minutes,
    started_at, completed_at, status, xp_earned, timeline
  )
  values (
    v_history_id, v_user_id,
    coalesce(v_session."Subject", 'Untitled subject'),
    coalesce(v_session."Topic", 'No topic provided'),
    v_duration_minutes,
    now() - (v_duration_minutes || ' minutes')::interval,
    now(), 'completed', p_xp, p_timeline
  );

  insert into public.study_pomodoros (session_id, user_id)
  values (p_session_id, v_user_id);

  select * into v_streak
  from public.update_user_streak(v_user_id, p_user_timezone, p_cutoff_hour);

  select * into v_rewards
  from public.award_user_rewards(v_user_id, p_xp, p_gems);

  delete from public."Study"
  where id = p_session_id and user_id = v_user_id;

  return query
  select v_history_id, v_streak.current_streak, v_streak.longest_streak,
         v_rewards.xp_points, v_rewards.gems;
end;
$$;

grant execute on function public.complete_study_session(bigint, integer, integer, jsonb, text, integer) to authenticated;

notify pgrst, 'reload schema';
