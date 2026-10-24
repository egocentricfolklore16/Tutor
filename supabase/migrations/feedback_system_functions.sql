-- Feedback System Database Triggers & RPC Functions
-- Run this SQL in your Supabase SQL Editor

-- 1. Function to automatically synchronize vote_count on the feedback table
CREATE OR REPLACE FUNCTION public.sync_feedback_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.feedback
    SET vote_count = COALESCE(vote_count, 0) + 1,
        updated_at = NOW()
    WHERE id = NEW.feedback_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.feedback
    SET vote_count = GREATEST(COALESCE(vote_count, 1) - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.feedback_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on feedback_votes table
DROP TRIGGER IF EXISTS tr_sync_feedback_vote_count ON public.feedback_votes;
CREATE TRIGGER tr_sync_feedback_vote_count
AFTER INSERT OR DELETE ON public.feedback_votes
FOR EACH ROW
EXECUTE FUNCTION public.sync_feedback_vote_count();

-- 2. RPC function to safely toggle a user's vote on a public feedback item
CREATE OR REPLACE FUNCTION public.toggle_feedback_vote(p_feedback_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_existing_id UUID;
  v_new_count INT;
  v_voted BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to vote';
  END IF;

  SELECT id INTO v_existing_id
  FROM public.feedback_votes
  WHERE feedback_id = p_feedback_id AND user_id = v_user_id;

  IF v_existing_id IS NOT NULL THEN
    DELETE FROM public.feedback_votes WHERE id = v_existing_id;
    v_voted := FALSE;
  ELSE
    INSERT INTO public.feedback_votes (feedback_id, user_id, created_at)
    VALUES (p_feedback_id, v_user_id, NOW());
    v_voted := TRUE;
  END IF;

  SELECT COALESCE(vote_count, 0) INTO v_new_count
  FROM public.feedback
  WHERE id = p_feedback_id;

  RETURN jsonb_build_object('voted', v_voted, 'vote_count', v_new_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT COALESCE(role, 'student') INTO v_role
  FROM public.profiles
  WHERE user_id = v_user_id;

  RETURN v_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC function to grant daily feedback reward (10 XP, capped at once per day)
CREATE OR REPLACE FUNCTION public.grant_feedback_bonus(p_feedback_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_already_rewarded BOOLEAN;
  v_reward_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('granted', FALSE, 'reason', 'unauthenticated');
  END IF;

  -- Check if user already received a feedback reward today
  SELECT EXISTS (
    SELECT 1 FROM public.feedback_rewards
    WHERE user_id = v_user_id
      AND granted_at >= CURRENT_DATE
  ) INTO v_already_rewarded;

  IF v_already_rewarded THEN
    RETURN jsonb_build_object('granted', FALSE, 'reason', 'daily_cap_reached');
  END IF;

  -- Insert feedback reward
  INSERT INTO public.feedback_rewards (user_id, feedback_id, reward_type, reward_value, granted_at)
  VALUES (v_user_id, p_feedback_id, 'feedback_bonus', 10, NOW())
  RETURNING id INTO v_reward_id;

  -- Increment user's XP in profiles table
  UPDATE public.profiles
  SET xp_points = COALESCE(xp_points, 0) + 10,
      updated_at = NOW()
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'granted', TRUE,
    'reward_type', 'feedback_bonus',
    'reward_value', 10,
    'reward_id', v_reward_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
