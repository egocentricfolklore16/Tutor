-- Migration 031: Study session pause/resume columns and status constraint

ALTER TABLE public."Study"
  ADD COLUMN IF NOT EXISTS elapsed_seconds INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NULL;

-- Backfill NULL session_status to 'active'
UPDATE public."Study"
SET session_status = 'active'
WHERE session_status IS NULL;

-- Add check constraint to enforce status lifecycle
ALTER TABLE public."Study"
  DROP CONSTRAINT IF EXISTS study_session_status_check;

ALTER TABLE public."Study"
  ADD CONSTRAINT study_session_status_check
  CHECK (session_status IN ('active', 'paused', 'completed'));

NOTIFY pgrst, 'reload schema';
