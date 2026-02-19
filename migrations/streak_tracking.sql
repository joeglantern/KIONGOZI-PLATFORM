-- Add streak tracking columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_activity_date DATE;

-- Comment for documentation
COMMENT ON COLUMN profiles.current_streak IS 'Current daily learning streak';
COMMENT ON COLUMN profiles.max_streak IS 'All-time best daily learning streak';
COMMENT ON COLUMN profiles.last_activity_date IS 'Date of last module completion to track consecutive days';
