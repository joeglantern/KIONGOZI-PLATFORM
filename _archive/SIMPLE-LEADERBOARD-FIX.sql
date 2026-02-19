-- SIMPLE LEADERBOARD FIX
-- Works with basic profiles table (id, email, full_name, total_xp, level)
-- Run this entire script in Supabase SQL Editor

-- ============================================
-- STEP 1: Fix RLS Policies on Profiles Table
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable read access for anonymous users" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;
DROP POLICY IF EXISTS "profiles_select_anon" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;

-- Create read policies
CREATE POLICY "profiles_select_all"
ON profiles
FOR SELECT
USING (true);

-- Allow users to update their own profile
CREATE POLICY "profiles_update_own"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================
-- STEP 2: Drop Existing Functions
-- ============================================

DROP FUNCTION IF EXISTS get_leaderboard_with_context(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_top_learners(INTEGER);
DROP FUNCTION IF EXISTS get_user_rank(UUID);
DROP FUNCTION IF EXISTS refresh_leaderboard();

-- ============================================
-- STEP 3: Create Simple Leaderboard Function
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
      p.id,
      RANK() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC, p.id) as rank
    FROM profiles p
  ) r
  WHERE r.id = p_user_id;

  IF user_rank IS NULL THEN
    user_rank := 9999;
  END IF;

  -- Return leaderboard with calculated stats
  RETURN QUERY
  WITH user_stats AS (
    SELECT
      p.id,
      COUNT(DISTINCT ce.id) FILTER (WHERE ce.completed_at IS NOT NULL) as courses_completed_count,
      COUNT(DISTINCT up.id) FILTER (WHERE up.completed = true) as modules_completed_count,
      COUNT(DISTINCT ub.id) as total_badges_count
    FROM profiles p
    LEFT JOIN course_enrollments ce ON ce.user_id = p.id
    LEFT JOIN user_progress up ON up.user_id = p.id
    LEFT JOIN user_badges ub ON ub.user_id = p.id
    GROUP BY p.id
  ),
  ranked_users AS (
    SELECT
      p.id as user_id,
      p.email,
      p.full_name,
      COALESCE(p.total_xp, 0)::INTEGER as total_xp,
      -- Correct level calculation
      GREATEST(1, FLOOR(SQRT(GREATEST(COALESCE(p.total_xp, 0), 0) / 50.0))::INTEGER) as level,
      COALESCE(us.courses_completed_count, 0)::INTEGER as courses_completed,
      COALESCE(us.modules_completed_count, 0)::INTEGER as modules_completed,
      0::INTEGER as max_streak,
      COALESCE(us.total_badges_count, 0)::INTEGER as total_badges,
      RANK() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC, p.id) as rank,
      (p.id = p_user_id) as is_current_user
    FROM profiles p
    LEFT JOIN user_stats us ON us.id = p.id
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
-- STEP 4: Create Simple Top Learners Function
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
  WITH user_stats AS (
    SELECT
      p.id,
      COUNT(DISTINCT ce.id) FILTER (WHERE ce.completed_at IS NOT NULL) as courses_completed_count,
      COUNT(DISTINCT up.id) FILTER (WHERE up.completed = true) as modules_completed_count,
      COUNT(DISTINCT ub.id) as total_badges_count
    FROM profiles p
    LEFT JOIN course_enrollments ce ON ce.user_id = p.id
    LEFT JOIN user_progress up ON up.user_id = p.id
    LEFT JOIN user_badges ub ON ub.user_id = p.id
    GROUP BY p.id
  )
  SELECT
    p.id as user_id,
    p.email,
    p.full_name,
    COALESCE(p.total_xp, 0)::INTEGER as total_xp,
    -- Correct level calculation
    GREATEST(1, FLOOR(SQRT(GREATEST(COALESCE(p.total_xp, 0), 0) / 50.0))::INTEGER) as level,
    COALESCE(us.courses_completed_count, 0)::INTEGER as courses_completed,
    COALESCE(us.modules_completed_count, 0)::INTEGER as modules_completed,
    0::INTEGER as max_streak,
    COALESCE(us.total_badges_count, 0)::INTEGER as total_badges,
    RANK() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC, p.id) as rank
  FROM profiles p
  LEFT JOIN user_stats us ON us.id = p.id
  ORDER BY rank
  LIMIT limit_count;
END;
$$;

-- ============================================
-- STEP 5: Create Simple User Rank Function
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
  WITH user_stats AS (
    SELECT
      p.id,
      COUNT(DISTINCT ce.id) FILTER (WHERE ce.completed_at IS NOT NULL) as courses_completed_count,
      COUNT(DISTINCT up.id) FILTER (WHERE up.completed = true) as modules_completed_count,
      COUNT(DISTINCT ub.id) as total_badges_count
    FROM profiles p
    LEFT JOIN course_enrollments ce ON ce.user_id = p.id
    LEFT JOIN user_progress up ON up.user_id = p.id
    LEFT JOIN user_badges ub ON ub.user_id = p.id
    WHERE p.id = p_user_id
    GROUP BY p.id
  ),
  ranked_users AS (
    SELECT
      p.id as user_id,
      p.email,
      p.full_name,
      COALESCE(p.total_xp, 0)::INTEGER as total_xp,
      -- Correct level calculation
      GREATEST(1, FLOOR(SQRT(GREATEST(COALESCE(p.total_xp, 0), 0) / 50.0))::INTEGER) as level,
      COALESCE(us.courses_completed_count, 0)::INTEGER as courses_completed,
      COALESCE(us.modules_completed_count, 0)::INTEGER as modules_completed,
      0::INTEGER as max_streak,
      COALESCE(us.total_badges_count, 0)::INTEGER as total_badges,
      RANK() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC, p.id) as rank
    FROM profiles p
    LEFT JOIN user_stats us ON us.id = p.id
  )
  SELECT * FROM ranked_users
  WHERE ranked_users.user_id = p_user_id;
END;
$$;

-- ============================================
-- STEP 6: Create Placeholder Refresh Function
-- ============================================
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN;
END;
$$;

-- ============================================
-- STEP 7: Grant Permissions
-- ============================================

GRANT EXECUTE ON FUNCTION get_leaderboard_with_context(UUID, INTEGER, INTEGER) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_top_learners(INTEGER) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_user_rank(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION refresh_leaderboard() TO authenticated, anon, service_role;

-- ============================================
-- STEP 8: Test
-- ============================================

-- Show all profiles with calculated level
SELECT
  email,
  total_xp,
  GREATEST(1, FLOOR(SQRT(GREATEST(COALESCE(total_xp, 0), 0) / 50.0))::INTEGER) as calculated_level
FROM profiles
WHERE total_xp > 0
ORDER BY total_xp DESC
LIMIT 10;

-- Test the function
SELECT * FROM get_top_learners(10);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Simple leaderboard setup complete!';
  RAISE NOTICE '✅ Functions calculate stats dynamically from other tables';
  RAISE NOTICE '✅ Level formula corrected (Level 3 for 792 XP)';
  RAISE NOTICE '';
  RAISE NOTICE 'Refresh your dashboard now (Ctrl+Shift+R)';
END $$;
