-- Migration 032: Upgrade Streak System Data Model and RPCs

-- 1. Create streak_days table
CREATE TABLE IF NOT EXISTS public.streak_days (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('completed', 'frozen')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT streak_days_user_date_unique UNIQUE (user_id, local_date)
);

-- RLS on streak_days
ALTER TABLE public.streak_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own streak_days" ON public.streak_days;
CREATE POLICY "Users read own streak_days" ON public.streak_days
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own streak_days" ON public.streak_days;
CREATE POLICY "Users insert own streak_days" ON public.streak_days
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own streak_days" ON public.streak_days;
CREATE POLICY "Users update own streak_days" ON public.streak_days
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Ensure user_streaks table has required columns and aliases
-- Existing table is public.users_streaks; we create a compatibility view/table schema if needed or add columns to users_streaks.
ALTER TABLE public.users_streaks
  ADD COLUMN IF NOT EXISTS freeze_tokens INTEGER NOT NULL DEFAULT 0 CHECK (freeze_tokens >= 0),
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS last_completed_date DATE;

-- Synchronize existing freeze_tokens_available with freeze_tokens if needed
UPDATE public.users_streaks
SET freeze_tokens = freeze_tokens_available
WHERE freeze_tokens = 0 AND freeze_tokens_available > 0;

-- 3. Function: record_study_activity()
-- Called via RPC when study session is completed or activity recorded.
-- Atomically handles 3am cutoff timezone date calculations, row locking, streak increments, and freeze preservation.
CREATE OR REPLACE FUNCTION public.record_study_activity(
  p_user_timezone TEXT DEFAULT 'UTC',
  p_cutoff_hour INTEGER DEFAULT 3
)
RETURNS TABLE (
  current_streak INTEGER,
  longest_streak INTEGER,
  last_completed_date DATE,
  freeze_tokens INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_today_date DATE;
  v_streak public.users_streaks%ROWTYPE;
  v_next_current INTEGER;
  v_next_longest INTEGER;
  v_next_freezes INTEGER;
  v_day_gap INTEGER;
  v_eff_tz TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_eff_tz := COALESCE(p_user_timezone, 'UTC');

  -- Compute user local date with 3am cutoff
  v_today_date := ((NOW() AT TIME ZONE v_eff_tz)::date -
    CASE WHEN EXTRACT(HOUR FROM (NOW() AT TIME ZONE v_eff_tz)) < p_cutoff_hour THEN 1 ELSE 0 END);

  -- Ensure user_streaks row exists
  INSERT INTO public.users_streaks (user_id, timezone, freeze_tokens, freeze_tokens_available)
  VALUES (v_user_id, v_eff_tz, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock user_streaks row
  SELECT * INTO v_streak
  FROM public.users_streaks
  WHERE user_id = v_user_id
  FOR UPDATE;

  -- If today is already completed, do nothing and return existing values
  IF v_streak.last_completed_date = v_today_date OR v_streak.last_active_date = v_today_date THEN
    RETURN QUERY
    SELECT v_streak.current_streak, v_streak.longest_streak, COALESCE(v_streak.last_completed_date, v_streak.last_active_date), v_streak.freeze_tokens;
    RETURN;
  END IF;

  -- Record completed day entry in streak_days
  INSERT INTO public.streak_days (user_id, local_date, status)
  VALUES (v_user_id, v_today_date, 'completed')
  ON CONFLICT (user_id, local_date) DO UPDATE SET status = 'completed';

  -- Calculate day gap from last completed/active date
  IF COALESCE(v_streak.last_completed_date, v_streak.last_active_date) IS NULL THEN
    v_next_current := 1;
  ELSE
    v_day_gap := v_today_date - COALESCE(v_streak.last_completed_date, v_streak.last_active_date);
    v_next_freezes := COALESCE(v_streak.freeze_tokens, v_streak.freeze_tokens_available, 0);

    IF v_day_gap = 1 THEN
      v_next_current := v_streak.current_streak + 1;
    ELSIF v_day_gap = 2 AND v_next_freezes > 0 THEN
      v_next_current := v_streak.current_streak + 1;
      v_next_freezes := v_next_freezes - 1;
      -- Record frozen day for yesterday
      INSERT INTO public.streak_days (user_id, local_date, status)
      VALUES (v_user_id, v_today_date - 1, 'frozen')
      ON CONFLICT (user_id, local_date) DO NOTHING;
    ELSE
      v_next_current := 1;
    END IF;
  END IF;

  v_next_longest := GREATEST(v_streak.longest_streak, v_next_current);
  v_next_freezes := COALESCE(v_next_freezes, v_streak.freeze_tokens, 0);

  UPDATE public.users_streaks
  SET current_streak = v_next_current,
      longest_streak = v_next_longest,
      last_completed_date = v_today_date,
      last_active_date = v_today_date,
      freeze_tokens = v_next_freezes,
      freeze_tokens_available = v_next_freezes,
      timezone = v_eff_tz,
      updated_at = NOW()
  WHERE user_id = v_user_id;

  RETURN QUERY
  SELECT v_next_current, v_next_longest, v_today_date, v_next_freezes;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_study_activity(TEXT, INTEGER) TO authenticated;

-- 4. Function: check_stale_streak()
-- Called on login / app mount.
-- Checks if one full day was missed: if freeze token available, consumes it & inserts 'frozen' row.
-- If no freeze token and >1 day missed, resets current_streak to 0.
CREATE OR REPLACE FUNCTION public.check_stale_streak(
  p_user_timezone TEXT DEFAULT 'UTC',
  p_cutoff_hour INTEGER DEFAULT 3
)
RETURNS TABLE (
  current_streak INTEGER,
  longest_streak INTEGER,
  last_completed_date DATE,
  freeze_tokens INTEGER,
  was_frozen BOOLEAN,
  was_reset BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_today_date DATE;
  v_streak public.users_streaks%ROWTYPE;
  v_eff_tz TEXT;
  v_last_date DATE;
  v_days_missed INTEGER;
  v_was_frozen BOOLEAN := FALSE;
  v_was_reset BOOLEAN := FALSE;
  v_cur_streak INTEGER;
  v_freezes INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_eff_tz := COALESCE(p_user_timezone, 'UTC');
  v_today_date := ((NOW() AT TIME ZONE v_eff_tz)::date -
    CASE WHEN EXTRACT(HOUR FROM (NOW() AT TIME ZONE v_eff_tz)) < p_cutoff_hour THEN 1 ELSE 0 END);

  INSERT INTO public.users_streaks (user_id, timezone, freeze_tokens, freeze_tokens_available)
  VALUES (v_user_id, v_eff_tz, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_streak
  FROM public.users_streaks
  WHERE user_id = v_user_id
  FOR UPDATE;

  v_last_date := COALESCE(v_streak.last_completed_date, v_streak.last_active_date);
  v_cur_streak := v_streak.current_streak;
  v_freezes := COALESCE(v_streak.freeze_tokens, v_streak.freeze_tokens_available, 0);

  IF v_last_date IS NOT NULL THEN
    v_days_missed := v_today_date - v_last_date;

    IF v_days_missed = 2 AND v_cur_streak > 0 THEN
      -- Missed yesterday. Check if freeze token exists.
      IF v_freezes > 0 THEN
        v_freezes := v_freezes - 1;
        v_was_frozen := TRUE;
        -- Insert frozen row for yesterday
        INSERT INTO public.streak_days (user_id, local_date, status)
        VALUES (v_user_id, v_today_date - 1, 'frozen')
        ON CONFLICT (user_id, local_date) DO NOTHING;

        UPDATE public.users_streaks
        SET freeze_tokens = v_freezes,
            freeze_tokens_available = v_freezes,
            updated_at = NOW()
        WHERE user_id = v_user_id;
      ELSE
        -- No freeze tokens, reset streak to 0
        v_cur_streak := 0;
        v_was_reset := TRUE;

        UPDATE public.users_streaks
        SET current_streak = 0,
            updated_at = NOW()
        WHERE user_id = v_user_id;
      END IF;
    ELSIF v_days_missed > 2 AND v_cur_streak > 0 THEN
      -- Missed more than 1 full day without completing or freezing today
      v_cur_streak := 0;
      v_was_reset := TRUE;

      UPDATE public.users_streaks
      SET current_streak = 0,
          updated_at = NOW()
      WHERE user_id = v_user_id;
    END IF;
  END IF;

  RETURN QUERY
  SELECT v_cur_streak, v_streak.longest_streak, v_last_date, v_freezes, v_was_frozen, v_was_reset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_stale_streak(TEXT, INTEGER) TO authenticated;

-- 5. Update complete_study_session to invoke record_study_activity
CREATE OR REPLACE FUNCTION public.complete_study_session(
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

  -- Record study activity and update streak
  select * into v_streak
  from public.record_study_activity(p_user_timezone, p_cutoff_hour);

  select * into v_rewards
  from public.award_user_rewards(v_user_id, p_xp, p_gems);

  delete from public."Study"
  where id = p_session_id and user_id = v_user_id;

  return query
  select v_history_id, v_streak.current_streak, v_streak.longest_streak,
         v_rewards.xp_points, v_rewards.gems;
end;
$$;

GRANT EXECUTE ON FUNCTION public.complete_study_session(bigint, integer, integer, jsonb, text, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
