-- Migration 025: Add session_status and time_left columns to Study table
-- Allows pausing study sessions and non-destructive session completion.

ALTER TABLE public."Study"
  ADD COLUMN IF NOT EXISTS session_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS time_left INTEGER DEFAULT NULL;

-- Backfill any existing records to 'active' if session_status is NULL
UPDATE public."Study"
SET session_status = 'active'
WHERE session_status IS NULL;
