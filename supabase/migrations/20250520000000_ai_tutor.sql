-- Migration: AI Tutor schema additions (study_plans, study_plan_milestones, ai_tutor_requests)

-- 1. study_plans
CREATE TABLE IF NOT EXISTS public.study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id bigint REFERENCES public."Study"(id) ON DELETE SET NULL,
  topic text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own study plans"
  ON public.study_plans
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 2. study_plan_milestones
CREATE TABLE IF NOT EXISTS public.study_plan_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position int NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  estimated_minutes int NOT NULL CHECK (estimated_minutes >= 5),
  target_date date,
  done boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_study_plan_milestones_plan_pos
  ON public.study_plan_milestones (plan_id, position);

ALTER TABLE public.study_plan_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own study plan milestones"
  ON public.study_plan_milestones
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 3. ai_tutor_requests (rate limiting)
CREATE TABLE IF NOT EXISTS public.ai_tutor_requests (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_tutor_requests_user_created
  ON public.ai_tutor_requests (user_id, created_at DESC);

ALTER TABLE public.ai_tutor_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own AI tutor requests"
  ON public.ai_tutor_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own AI tutor requests"
  ON public.ai_tutor_requests
  FOR SELECT
  USING (auth.uid() = user_id);
