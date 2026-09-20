-- Migration 029: Add ended_at and last_active_at columns, and guard completed status in Study table

ALTER TABLE public."Study"
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- Add check constraint ensuring session_status cannot be 'completed' unless ended_at is set
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'study_session_completed_ended_at_check'
  ) THEN
    ALTER TABLE public."Study"
      ADD CONSTRAINT study_session_completed_ended_at_check
      CHECK (session_status <> 'completed' OR ended_at IS NOT NULL);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
