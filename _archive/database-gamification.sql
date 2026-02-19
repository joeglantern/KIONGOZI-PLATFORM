-- Gamification System Database Schema
-- Run this in your Supabase SQL Editor

-- =============================================
-- 1. CREATE BADGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL, -- emoji like '🎯', '🏆', '🔥'
  color TEXT DEFAULT '#f97316', -- hex color for badge background
  category TEXT NOT NULL, -- 'completion', 'streak', 'course', 'speed'
  requirement_type TEXT NOT NULL, -- 'modules_completed', 'streak_days', 'courses_completed'
  requirement_value INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- 2. CREATE USER BADGES TABLE (earned badges)
-- =============================================
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- =============================================
-- 3. ADD XP AND LEVEL FIELDS TO PROFILES
-- =============================================
-- First check if columns exist, then add if they don't
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='profiles' AND column_name='total_xp') THEN
    ALTER TABLE profiles ADD COLUMN total_xp INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='profiles' AND column_name='level') THEN
    ALTER TABLE profiles ADD COLUMN level INTEGER DEFAULT 1;
  END IF;
END $$;

-- =============================================
-- 4. ADD XP EARNED TO USER PROGRESS
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='user_progress' AND column_name='xp_earned') THEN
    ALTER TABLE user_progress ADD COLUMN xp_earned INTEGER DEFAULT 0;
  END IF;
END $$;

-- =============================================
-- 5. INSERT DEFAULT BADGES
-- =============================================

-- Clear existing badges (optional - comment out if you want to keep existing)
-- DELETE FROM badges;

INSERT INTO badges (name, description, icon, color, category, requirement_type, requirement_value) VALUES
-- Completion Badges
('First Steps', 'Complete your first module', '🎯', '#3b82f6', 'completion', 'modules_completed', 1),
('Learning Streak', 'Complete 5 modules', '📚', '#3b82f6', 'completion', 'modules_completed', 5),
('Knowledge Builder', 'Complete 10 modules', '🏗️', '#8b5cf6', 'completion', 'modules_completed', 10),
('Rising Star', 'Complete 25 modules', '⭐', '#8b5cf6', 'completion', 'modules_completed', 25),
('Learning Machine', 'Complete 50 modules', '🚀', '#ec4899', 'completion', 'modules_completed', 50),
('Master Scholar', 'Complete 100 modules', '🎓', '#f59e0b', 'completion', 'modules_completed', 100),

-- Course Completion Badges
('Course Starter', 'Complete your first course', '🏁', '#10b981', 'course', 'courses_completed', 1),
('Course Collector', 'Complete 3 courses', '📖', '#10b981', 'course', 'courses_completed', 3),
('Course Master', 'Complete 5 courses', '👑', '#10b981', 'course', 'courses_completed', 5),
('Learning Champion', 'Complete 10 courses', '🏆', '#f59e0b', 'course', 'courses_completed', 10),

-- Streak Badges
('Consistency', 'Maintain a 3-day learning streak', '🔥', '#f97316', 'streak', 'streak_days', 3),
('Dedication', 'Maintain a 7-day learning streak', '🔥', '#f97316', 'streak', 'streak_days', 7),
('Commitment', 'Maintain a 14-day learning streak', '💪', '#f97316', 'streak', 'streak_days', 14),
('Unstoppable', 'Maintain a 30-day learning streak', '⚡', '#ef4444', 'streak', 'streak_days', 30),
('Legendary', 'Maintain a 100-day learning streak', '👑', '#f59e0b', 'streak', 'streak_days', 100);

-- =============================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);

-- =============================================
-- 7. ENABLE RLS (Row Level Security)
-- =============================================
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Badges are public (everyone can see all badges)
CREATE POLICY "Badges are viewable by everyone" ON badges
  FOR SELECT USING (true);

-- Users can view all user_badges
CREATE POLICY "User badges are viewable by everyone" ON user_badges
  FOR SELECT USING (true);

-- Users can only insert their own badges (via backend/triggers)
CREATE POLICY "Users can insert their own badges" ON user_badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 8. VERIFICATION QUERIES
-- =============================================

-- Check if badges were created
SELECT COUNT(*) as badge_count FROM badges;

-- Check if tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('badges', 'user_badges');

-- Check if profile columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('total_xp', 'level');

-- View all badges
SELECT
  category,
  name,
  icon,
  requirement_value,
  description
FROM badges
ORDER BY category, requirement_value;
