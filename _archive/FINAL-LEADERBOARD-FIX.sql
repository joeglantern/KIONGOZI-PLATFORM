-- FINAL COMPREHENSIVE LEADERBOARD FIX
-- This script fixes ALL common issues with leaderboards
-- Run this entire script in Supabase SQL Editor

-- ============================================
-- PART 1: Fix RLS Policies on Profiles Table
-- ============================================

-- Enable RLS if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable read access for anonymous users" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create comprehensive read policy (allows all authenticated users to see all profiles)
CREATE POLICY "profiles_select_authenticated"
ON profiles
FOR SELECT
TO authenticated
USING (true);

-- Allow anon to read profiles (for public leaderboards)
CREATE POLICY "profiles_select_anon"
ON profiles
FOR SELECT
TO anon
USING (true);

-- Allow users to update their own profile
CREATE POLICY "profiles_update_own"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to insert their own profile
CREATE POLICY "profiles_insert_own"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PART 2: Drop and Recreate Leaderboard Functions
-- ============================================

DROP FUNCTION IF EXISTS get_leaderboard_with_context(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_top_learners(INTEGER);
DROP FUNCTION IF EXISTS get_user_rank(UUID);
DROP FUNCTION IF EXISTS refresh_leaderboard();

-- ============================================
-- PART 3: Create get_leaderboard_with_context
-- ============================================
CREATE OR REPLACE FUNCTION get_leaderboard_with_context(
  p_user_id UUID,
  top_count INTEGER DEFAULT 10,
  context_count INTEGER DEFAULT 3
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  total_xp INTEGER,
  level INTEGER,
  courses_completed INTEGER,
  modules_completed INTEGER,
  max_streak INTEGER,
  total_badges INTEGER,
  rank BIGINT,
  is_current_user BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_rank BIGINT;
BEGIN
  -- Get current user's rank
  SELECT r.rank INTO user_rank
  FROM (
    SELECT
      p.user_id,
      RANK() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC, p.user_id) as rank
    FROM profiles p
  ) r
  WHERE r.user_id = p_user_id;

  -- If user not found, set rank to max
  IF user_rank IS NULL THEN
    user_rank := 9999;
  END IF;

  -- Return top users + context around current user
  RETURN QUERY
  WITH ranked_users AS (
    SELECT
      p.user_id,
      p.email,
      p.full_name,
      COALESCE(p.total_xp, 0)::INTEGER as total_xp,
      GREATEST(1, FLOOR(SQRT(GREATEST(COALESCE(p.total_xp, 0), 0) / 50.0))::INTEGER) as level,
      COALESCE(p.courses_completed, 0)::INTEGER as courses_completed,
      COALESCE(p.modules_completed, 0)::INTEGER as modules_completed,
      COALESCE(p.max_streak, 0)::INTEGER as max_streak,
      COALESCE(p.total_badges, 0)::INTEGER as total_badges,
      RANK() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC, p.user_id) as rank,
      (p.user_id = p_user_id) as is_current_user
    FROM profiles p
  )
  SELECT * FROM ranked_users
  WHERE
    rank <= top_count
    OR (
      rank > top_count
      AND rank BETWEEN (user_rank - context_count) AND (user_rank + context_count)
    )
  ORDER BY rank
  LIMIT 50;
END;
$$;

-- ============================================
-- PART 4: Create get_top_learners
-- ============================================
CREATE OR REPLACE FUNCTION get_top_learners(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  total_xp INTEGER,
  level INTEGER,
  courses_completed INTEGER,
  modules_completed INTEGER,
  max_streak INTEGER,
  total_badges INTEGER,
  rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.user_id,
    p.email,
    p.full_name,
    COALESCE(p.total_xp, 0)::INTEGER as total_xp,
    GREATEST(1, FLOOR(SQRT(GREATEST(COALESCE(p.total_xp, 0), 0) / 50.0))::INTEGER) as level,
    COALESCE(p.courses_completed, 0)::INTEGER as courses_completed,
    COALESCE(p.modules_completed, 0)::INTEGER as modules_completed,
    COALESCE(p.max_streak, 0)::INTEGER as max_streak,
    COALESCE(p.total_badges, 0)::INTEGER as total_badges,
    RANK() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC, p.user_id) as rank
  FROM profiles p
  ORDER BY rank
  LIMIT limit_count;
END;
$$;

-- ============================================
-- PART 5: Create get_user_rank
-- ============================================
CREATE OR REPLACE FUNCTION get_user_rank(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  total_xp INTEGER,
  level INTEGER,
  courses_completed INTEGER,
  modules_completed INTEGER,
  max_streak INTEGER,
  total_badges INTEGER,
  rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH ranked_users AS (
    SELECT
      p.user_id,
      p.email,
      p.full_name,
      COALESCE(p.total_xp, 0)::INTEGER as total_xp,
      GREATEST(1, FLOOR(SQRT(GREATEST(COALESCE(p.total_xp, 0), 0) / 50.0))::INTEGER) as level,
      COALESCE(p.courses_completed, 0)::INTEGER as courses_completed,
      COALESCE(p.modules_completed, 0)::INTEGER as modules_completed,
      COALESCE(p.max_streak, 0)::INTEGER as max_streak,
      COALESCE(p.total_badges, 0)::INTEGER as total_badges,
      RANK() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC, p.user_id) as rank
    FROM profiles p
  )
  SELECT * FROM ranked_users
  WHERE ranked_users.user_id = p_user_id;
END;
$$;

-- ============================================
-- PART 6: Create refresh_leaderboard (placeholder)
-- ============================================
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Placeholder for future materialized view refresh
  RETURN;
END;
$$;

-- ============================================
-- PART 7: Grant ALL necessary permissions
-- ============================================

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_leaderboard_with_context(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_learners(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_rank(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_leaderboard() TO authenticated;

-- Grant execute to anonymous users (for public access)
GRANT EXECUTE ON FUNCTION get_leaderboard_with_context(UUID, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_top_learners(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_user_rank(UUID) TO anon;
GRANT EXECUTE ON FUNCTION refresh_leaderboard() TO anon;

-- Grant execute to service role (for server-side calls)
GRANT EXECUTE ON FUNCTION get_leaderboard_with_context(UUID, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_top_learners(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_rank(UUID) TO service_role;

-- ============================================
-- PART 8: Verification Queries
-- ============================================

-- Show all profiles with XP
SELECT
  email,
  total_xp,
  GREATEST(1, FLOOR(SQRT(GREATEST(COALESCE(total_xp, 0), 0) / 50.0))::INTEGER) as calculated_level
FROM profiles
WHERE total_xp > 0
ORDER BY total_xp DESC
LIMIT 10;

-- Test the leaderboard function
SELECT * FROM get_top_learners(10);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Leaderboard setup complete!';
  RAISE NOTICE '✅ RLS policies updated';
  RAISE NOTICE '✅ Functions created with SECURITY DEFINER';
  RAISE NOTICE '✅ Permissions granted';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Refresh your LMS dashboard (Ctrl+Shift+R)';
  RAISE NOTICE '2. Leaderboard should now load correctly';
  RAISE NOTICE '3. Level should show "Lvl 3" for 792 XP';
END $$;
