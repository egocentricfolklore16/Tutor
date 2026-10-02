-- Migration to enable RLS and add policies for streak_slipping table
ALTER TABLE IF EXISTS public.streak_slipping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own streak slipping logs" ON public.streak_slipping;
CREATE POLICY "Users can view their own streak slipping logs"
  ON public.streak_slipping
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own streak slipping logs" ON public.streak_slipping;
CREATE POLICY "Users can insert their own streak slipping logs"
  ON public.streak_slipping
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own streak slipping logs" ON public.streak_slipping;
CREATE POLICY "Users can update their own streak slipping logs"
  ON public.streak_slipping
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
