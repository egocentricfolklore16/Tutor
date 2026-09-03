-- Table to track when users break their streak or miss sessions
CREATE TABLE IF NOT EXISTS streak_slipping (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Reason for slipping: 'missed_day', 'streak_broken', 'missed_session'
  reason VARCHAR(50) NOT NULL DEFAULT 'missed_day',
  
  -- The date when the slip occurred
  slip_date DATE NOT NULL,
  
  -- Information about what was missed
  missed_subject VARCHAR(255),
  missed_topic VARCHAR(255),
  
  -- Recovery info: when/if they got back on track
  recovered_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(user_id, slip_date, reason)
);

-- Index for efficient queries
CREATE INDEX idx_streak_slipping_user_id ON streak_slipping(user_id);
CREATE INDEX idx_streak_slipping_user_date ON streak_slipping(user_id, slip_date DESC);

-- Table to track daily session targets and completions
CREATE TABLE IF NOT EXISTS daily_session_tracking (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Number of sessions completed on this date
  sessions_completed INTEGER DEFAULT 0,
  
  -- Whether the user met their daily goal
  met_daily_goal BOOLEAN DEFAULT FALSE,
  
  -- Total study hours on this date
  total_study_hours DECIMAL(5, 2) DEFAULT 0,
  
  UNIQUE(user_id, activity_date)
);

-- Index for efficient queries
CREATE INDEX idx_daily_tracking_user_id ON daily_session_tracking(user_id);
CREATE INDEX idx_daily_tracking_user_date ON daily_session_tracking(user_id, activity_date DESC);

-- Add functions to trigger updates on daily_session_tracking
CREATE OR REPLACE FUNCTION update_daily_session_tracking()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO daily_session_tracking (user_id, activity_date, sessions_completed, total_study_hours)
  VALUES (
    NEW.user_id,
    CURRENT_DATE AT TIME ZONE (
      COALESCE(
        (SELECT timezone FROM profiles WHERE user_id = NEW.user_id),
        'UTC'
      )
    ),
    1,
    COALESCE(NEW.duration, 0) / 60.0
  )
  ON CONFLICT (user_id, activity_date)
  DO UPDATE SET
    sessions_completed = daily_session_tracking.sessions_completed + 1,
    total_study_hours = daily_session_tracking.total_study_hours + COALESCE(NEW.duration, 0) / 60.0,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for study_pomodoros insertions
CREATE TRIGGER trigger_update_daily_tracking
AFTER INSERT ON study_pomodoros
FOR EACH ROW
EXECUTE FUNCTION update_daily_session_tracking();
