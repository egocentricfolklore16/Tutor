-- Proposed Migration for Review: Milestone Reward Claims and Granular XP Transaction History
-- Author: Egofolk Roadmap V2
-- Description: Creates public.milestone_claims and public.xp_history to support milestone claim tracking and precise per-day XP activity logs.

-- 1. Milestone Claims Table
CREATE TABLE IF NOT EXISTS public.milestone_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    milestone_level INT NOT NULL,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reward_type TEXT NOT NULL,
    UNIQUE(user_id, milestone_level)
);

-- Enable RLS
ALTER TABLE public.milestone_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own milestone claims"
    ON public.milestone_claims FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own milestone claims"
    ON public.milestone_claims FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 2. Granular XP History Table
CREATE TABLE IF NOT EXISTS public.xp_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    xp_amount INT NOT NULL CHECK (xp_amount > 0),
    source TEXT NOT NULL, -- e.g. 'study_session', 'quiz', 'flashcards', 'quest'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.xp_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own XP history"
    ON public.xp_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own XP history"
    ON public.xp_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_milestone_claims_user_id ON public.milestone_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_history_user_created ON public.xp_history(user_id, created_at DESC);
